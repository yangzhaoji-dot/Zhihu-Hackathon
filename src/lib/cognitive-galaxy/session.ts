import type { OpinionGraph } from "../opinion/types";
import { DEMO_GRAPH, DEMO_ID } from "./demo";

const PREFIX = "cognitive-galaxy:v1:";
const memory = new Map<string, OpinionGraph>();
const MAX_ENTRIES = 5;

function cloneGraph(graph: OpinionGraph): OpinionGraph {
  return JSON.parse(JSON.stringify(graph)) as OpinionGraph;
}

/** Validates cached/API content before rendering; unknown data is never a fake demo. */
export function isOpinionGraph(value: unknown): value is OpinionGraph {
  if (!value || typeof value !== "object") return false;
  const g = value as Partial<OpinionGraph>;
  return typeof g.questionId === "string" && typeof g.questionTitle === "string" &&
    Array.isArray(g.opinions) && Array.isArray(g.sources) && Array.isArray(g.authors) && Array.isArray(g.relations) &&
    g.opinions.every((o) => o && typeof o.id === "string" && typeof o.title === "string" && typeof o.summary === "string" && Array.isArray(o.sourceIds)) &&
    g.sources.every((s) => s && typeof s.id === "string" && typeof s.url === "string");
}

export function saveGalaxy(graph: OpinionGraph): void {
  if (!isOpinionGraph(graph)) throw new Error("invalid_graph");
  const snapshot = cloneGraph(graph);
  memory.set(graph.questionId, snapshot);
  if (memory.size > MAX_ENTRIES) memory.delete(memory.keys().next().value!);
  if (typeof window === "undefined") return;
  try {
    const ids: string[] = JSON.parse(sessionStorage.getItem(`${PREFIX}index`) ?? "[]");
    const next = [...ids.filter((id) => id !== graph.questionId), graph.questionId];
    while (next.length > MAX_ENTRIES) sessionStorage.removeItem(`${PREFIX}${next.shift()}`);
    sessionStorage.setItem(`${PREFIX}${graph.questionId}`, JSON.stringify(snapshot));
    sessionStorage.setItem(`${PREFIX}index`, JSON.stringify(next));
  } catch { /* Blocked/quota-limited storage does not prevent current-session use. */ }
}

export function readGalaxy(id: string): OpinionGraph | null {
  const cached = memory.get(id);
  if (cached) return cloneGraph(cached);
  if (typeof window !== "undefined") {
    try {
      const value: unknown = JSON.parse(sessionStorage.getItem(`${PREFIX}${id}`) ?? "null");
      if (isOpinionGraph(value) && value.questionId === id) {
        memory.set(id, value);
        return cloneGraph(value);
      }
    } catch { /* fall through */ }
  }
  // The authored demo is the pristine fallback. Once the user evolves it,
  // the saved session snapshot above wins over this fixture.
  return id === DEMO_ID ? cloneGraph(DEMO_GRAPH) : null;
}

export function resetGalaxy(id: string): OpinionGraph | null {
  memory.delete(id);
  if (typeof window !== "undefined") {
    try {
      sessionStorage.removeItem(`${PREFIX}${id}`);
      const ids: string[] = JSON.parse(sessionStorage.getItem(`${PREFIX}index`) ?? "[]");
      sessionStorage.setItem(`${PREFIX}index`, JSON.stringify(ids.filter((item) => item !== id)));
    } catch { /* storage is optional */ }
  }
  return id === DEMO_ID ? cloneGraph(DEMO_GRAPH) : null;
}

export function galaxyUrl(id: string, cluster?: string | null, opinion?: string | null): string {
  const params = new URLSearchParams();
  if (cluster) params.set("cluster", cluster);
  if (opinion && cluster) params.set("opinion", opinion);
  return `/galaxy/${encodeURIComponent(id)}${params.size ? `?${params}` : ""}`;
}
