import type { OpinionGraph, QuestionNetwork } from "../opinion/types";
import { getDemoGraph } from "./demo";

const PREFIX = "cognitive-galaxy:v1:";
const NETWORK_PREFIX = "lost-universe:v1:";
const memory = new Map<string, OpinionGraph>();
const networkMemory = new Map<string, QuestionNetwork>();
const MAX_ENTRIES = 8;

function cloneGraph(graph: OpinionGraph): OpinionGraph {
  return JSON.parse(JSON.stringify(graph)) as OpinionGraph;
}

function cloneNetwork(network: QuestionNetwork): QuestionNetwork {
  return JSON.parse(JSON.stringify(network)) as QuestionNetwork;
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

export function saveQuestionNetwork(network: QuestionNetwork): void {
  const snapshot = cloneNetwork(network);
  networkMemory.set(network.coreQuestionId, snapshot);
  if (typeof window === "undefined") return;
  try { sessionStorage.setItem(`${NETWORK_PREFIX}${network.coreQuestionId}`, JSON.stringify(snapshot)); }
  catch { /* optional cache */ }
}

export function readQuestionNetwork(id: string): QuestionNetwork | null {
  const cached = networkMemory.get(id);
  if (cached) return cloneNetwork(cached);
  if (typeof window !== "undefined") {
    try {
      const value = JSON.parse(sessionStorage.getItem(`${NETWORK_PREFIX}${id}`) ?? "null") as QuestionNetwork | null;
      if (value && value.coreQuestionId === id && Array.isArray(value.questions) && Array.isArray(value.relations)) {
        networkMemory.set(id, value);
        return cloneNetwork(value);
      }
    } catch { /* optional cache */ }
  }
  return null;
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
  const demo = getDemoGraph(id);
  return demo ? cloneGraph(demo) : null;
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
  const demo = getDemoGraph(id);
  return demo ? cloneGraph(demo) : null;
}

export function galaxyUrl(id: string, cluster?: string | null, opinion?: string | null): string {
  const params = new URLSearchParams();
  if (cluster) params.set("cluster", cluster);
  if (opinion && cluster) params.set("opinion", opinion);
  return `/galaxy/${encodeURIComponent(id)}${params.size ? `?${params}` : ""}`;
}

export function universeUrl(id: string): string {
  return `/universe/${encodeURIComponent(id)}`;
}
