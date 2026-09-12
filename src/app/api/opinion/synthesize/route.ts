import { type NextRequest, NextResponse } from "next/server";
import { getOpinion, getOpinionGraph } from "@/lib/opinion/store";
import { synthesizePlanetViewpoint } from "@/lib/opinion/planet-synthesis";
import type { OpinionGraph } from "@/lib/opinion/types";
import { selectionBelongsToSource, type SelectedExcerptInput } from "@/lib/planet-synthesis/model";

function relatedOpinionIds(opinionId: string, graph: OpinionGraph): Set<string> {
  const ids = new Set<string>([opinionId]);
  for (const relation of graph.relations) {
    if (relation.from === opinionId) ids.add(relation.to);
    if (relation.to === opinionId) ids.add(relation.from);
  }
  return ids;
}

function isOpinionGraph(value: unknown): value is OpinionGraph {
  if (!value || typeof value !== "object") return false;
  const graph = value as Partial<OpinionGraph>;
  return typeof graph.questionId === "string" && typeof graph.questionTitle === "string" &&
    Array.isArray(graph.opinions) && graph.opinions.length <= 100 &&
    Array.isArray(graph.sources) && graph.sources.length <= 200 &&
    Array.isArray(graph.authors) && graph.authors.length <= 200 &&
    Array.isArray(graph.relations) && graph.relations.length <= 300 &&
    graph.opinions.every((opinion) => opinion && typeof opinion.id === "string" && typeof opinion.title === "string" && Array.isArray(opinion.sourceIds)) &&
    graph.sources.every((source) => source && typeof source.id === "string" && typeof source.excerpt === "string");
}

export async function POST(request: NextRequest) {
  let body: { opinionId?: unknown; selections?: unknown; graph?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const opinionId = typeof body.opinionId === "string" ? body.opinionId : "";
  const override = isOpinionGraph(body.graph) ? body.graph : null;
  const storedOpinion = opinionId ? getOpinion(opinionId) : null;
  const graph = override ?? (storedOpinion ? getOpinionGraph(storedOpinion.questionId) : null);
  const opinion = graph?.opinions.find((item) => item.id === opinionId) ?? storedOpinion;
  if (!opinion) return NextResponse.json({ ok: false, error: "opinion_not_found" }, { status: 404 });
  if (!graph) return NextResponse.json({ ok: false, error: "graph_not_found" }, { status: 404 });

  const raw = Array.isArray(body.selections) ? body.selections : [];
  if (raw.length < 2 || raw.length > 8) {
    return NextResponse.json({ ok: false, error: "selection_count" }, { status: 400 });
  }

  const allowedOpinionIds = relatedOpinionIds(opinionId, graph);
  const allowedSourceIds = new Set(
    graph.opinions
      .filter((item) => allowedOpinionIds.has(item.id))
      .flatMap((item) => item.sourceIds),
  );
  const sourceById = new Map(graph.sources.map((source) => [source.id, source]));
  const selections: SelectedExcerptInput[] = [];
  const seen = new Set<string>();

  for (const item of raw) {
    if (!item || typeof item !== "object") {
      return NextResponse.json({ ok: false, error: "invalid_selection" }, { status: 400 });
    }
    const record = item as Record<string, unknown>;
    const sourceId = typeof record.sourceId === "string" ? record.sourceId : "";
    const text = typeof record.text === "string" ? record.text.trim() : "";
    const source = sourceById.get(sourceId);
    const key = `${sourceId}:${text}`;
    if (!source || !allowedSourceIds.has(sourceId) || !selectionBelongsToSource(text, source.excerpt) || seen.has(key)) {
      return NextResponse.json({ ok: false, error: "invalid_selection" }, { status: 400 });
    }
    seen.add(key);
    selections.push({ sourceId, text });
  }

  const sources = [...new Set(selections.map((item) => item.sourceId))]
    .map((id) => sourceById.get(id))
    .filter((source): source is NonNullable<typeof source> => Boolean(source));

  const result = await synthesizePlanetViewpoint({ original: opinion, selections, sources });
  if (!result) {
    return NextResponse.json({ ok: false, error: "ai_unavailable" }, { status: 503 });
  }

  return NextResponse.json({ ok: true, result });
}
