import type { Author, Opinion, OpinionGraph, OpinionSource, RelationType } from "@/lib/opinion/types";
import type { PlanetSynthesisResult, SelectedExcerptInput, SynthesisAction, ViewpointRelation } from "@/lib/planet-synthesis/model";
import { hash } from "./model";

const RELATION_MAP: Record<ViewpointRelation, RelationType> = {
  refinement: "add",
  extension: "add",
  revision: "cond",
  counterpoint: "oppose",
  new_dimension: "add",
};

function unique(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function byId<T extends { id: string }>(base: readonly T[], extra: readonly T[]): T[] {
  return [...new Map([...base, ...extra].map((item) => [item.id, item])).values()];
}

function nextId(prefix: string, seed: string): string {
  return `${prefix}_${Date.now().toString(36)}_${hash(seed).toString(36).slice(0, 6)}`;
}

export function attachGrounding(
  graph: OpinionGraph,
  sources: readonly OpinionSource[] = [],
  authors: readonly Author[] = [],
): OpinionGraph {
  return {
    ...graph,
    sources: byId(graph.sources, sources),
    authors: byId(graph.authors, authors),
  };
}

export function evolveGraphFromSynthesis(input: {
  graph: OpinionGraph;
  parentId: string;
  result: PlanetSynthesisResult;
  selections: SelectedExcerptInput[];
  action?: SynthesisAction;
  sources?: OpinionSource[];
  authors?: Author[];
  id?: string;
}): { graph: OpinionGraph; opinionId: string; action: SynthesisAction } {
  const grounded = attachGrounding(input.graph, input.sources, input.authors);
  const parent = grounded.opinions.find((opinion) => opinion.id === input.parentId);
  if (!parent) throw new Error("parent_not_found");

  const action = input.action ?? input.result.action;
  const selectedSourceIds = unique(input.selections.map((item) => item.sourceId));
  const selectedTexts = unique(input.selections.map((item) => item.text.trim()));
  const sourceIds = unique([...parent.sourceIds, ...selectedSourceIds]);

  if (action === "merge") {
    const updated: Opinion = {
      ...parent,
      claim: parent.claim || parent.title,
      title: input.result.viewpoint,
      summary: input.result.summary,
      support: input.result.scores.overall,
      sourceIds,
      reason: input.result.reason,
      conditions: unique([...(parent.conditions ?? []), ...input.result.additions]),
      evidence: unique([...(parent.evidence ?? []), ...selectedTexts]),
      derivedSource: "ai",
    };
    return {
      graph: {
        ...grounded,
        opinions: grounded.opinions.map((opinion) => opinion.id === parent.id ? updated : opinion),
      },
      opinionId: parent.id,
      action,
    };
  }

  const id = input.id ?? nextId("user", `${parent.id}:${input.result.viewpoint}:${selectedTexts.join("|")}`);
  const child: Opinion = {
    id,
    questionId: parent.questionId,
    title: input.result.viewpoint,
    summary: input.result.summary,
    kind: "human",
    nodeType: "opinion",
    derivedSource: "ai",
    support: input.result.scores.overall,
    x: Math.max(0, Math.min(1, parent.x + 0.045)),
    y: Math.max(0, Math.min(1, parent.y + 0.035)),
    sourceIds: selectedSourceIds,
    camp: "用户观点",
    derivedFrom: [parent.id],
    claim: input.result.viewpoint,
    reason: input.result.reason,
    conditions: input.result.additions,
    evidence: selectedTexts,
  };
  return {
    graph: {
      ...grounded,
      opinions: [...grounded.opinions.filter((opinion) => opinion.id !== id), child],
      relations: [
        ...grounded.relations.filter((relation) => !(relation.from === parent.id && relation.to === id)),
        { from: parent.id, to: id, type: RELATION_MAP[input.result.relation], rationale: input.result.reason },
      ],
    },
    opinionId: id,
    action,
  };
}

/**
 * Keep two existing planets independent while making their cognitive relation
 * explicit. A bridge is a graph mutation, not a new opinion. Reconnecting the
 * same unordered pair replaces the previous bridge so the map never accumulates
 * contradictory duplicate edges for the same two planets.
 */
export function connectGalaxyOpinions(input: {
  graph: OpinionGraph;
  from: string;
  to: string;
  type: RelationType;
  rationale?: string;
}): OpinionGraph {
  if (input.from === input.to) throw new Error("same_parent");
  const from = input.graph.opinions.find((opinion) => opinion.id === input.from);
  const to = input.graph.opinions.find((opinion) => opinion.id === input.to);
  if (!from || !to) throw new Error("parent_not_found");
  const relation = {
    from: from.id,
    to: to.id,
    type: input.type,
    rationale: input.rationale?.trim().slice(0, 280) || undefined,
  };
  return {
    ...input.graph,
    relations: [
      ...input.graph.relations.filter((item) => !(
        (item.from === from.id && item.to === to.id) ||
        (item.from === to.id && item.to === from.id)
      )),
      relation,
    ],
  };
}

export function fuseGalaxyOpinions(input: {
  graph: OpinionGraph;
  parentA: string;
  parentB: string;
  title: string;
  summary: string;
  rationale?: string;
  id?: string;
}): { graph: OpinionGraph; opinionId: string } {
  if (input.parentA === input.parentB) throw new Error("same_parent");
  const a = input.graph.opinions.find((opinion) => opinion.id === input.parentA);
  const b = input.graph.opinions.find((opinion) => opinion.id === input.parentB);
  if (!a || !b) throw new Error("parent_not_found");
  const id = input.id ?? nextId("fusion", `${a.id}:${b.id}:${input.title}`);
  const child: Opinion = {
    id,
    questionId: input.graph.questionId,
    title: input.title.trim().slice(0, 180),
    summary: input.summary.trim().slice(0, 280),
    kind: "human",
    nodeType: "opinion",
    derivedSource: "ai",
    support: Math.round(((a.support || 0) + (b.support || 0)) / 2),
    x: Math.max(0, Math.min(1, (a.x + b.x) / 2)),
    y: Math.max(0, Math.min(1, (a.y + b.y) / 2)),
    sourceIds: unique([...a.sourceIds, ...b.sourceIds]),
    camp: "融合观点",
    derivedFrom: [a.id, b.id],
    claim: input.title.trim(),
    reason: input.rationale?.trim() || input.summary.trim(),
    evidence: unique([...(a.evidence ?? []), ...(b.evidence ?? [])]).slice(0, 12),
  };
  return {
    graph: {
      ...input.graph,
      opinions: [...input.graph.opinions.filter((opinion) => opinion.id !== id), child],
      relations: [
        ...input.graph.relations.filter((relation) => relation.to !== id),
        { from: a.id, to: id, type: "add", rationale: input.rationale },
        { from: b.id, to: id, type: "add", rationale: input.rationale },
      ],
    },
    opinionId: id,
  };
}
