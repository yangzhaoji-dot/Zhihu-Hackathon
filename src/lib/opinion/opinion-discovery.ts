import type { OpinionGraph } from "./types";

export type OpinionDiscoveryStatus = "visible" | "signal" | "discovered" | "station" | "untraceable";

export interface OpinionDiscoveryProfile {
  opinionId: string;
  status: OpinionDiscoveryStatus;
  /** Higher means structurally easier to overlook in the current graph. */
  buriedness: number;
  traceable: boolean;
  rationale: string;
  metrics: {
    supportVisibility: number;
    sourceVisibility: number;
    relationVisibility: number;
    campVisibility: number;
  };
}

const STORAGE_PREFIX = "opinion-space:discovered:v1:";

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function normalize(value: number, max: number) {
  return max > 0 ? clamp01(value / max) : 0;
}

function sourceHeat(graph: OpinionGraph, sourceIds: readonly string[]) {
  const wanted = new Set(sourceIds);
  return graph.sources
    .filter((source) => wanted.has(source.id))
    .reduce((sum, source) => sum + Math.log1p(Math.max(0, source.upvotes)), 0);
}

function relationDegree(graph: OpinionGraph, opinionId: string) {
  return graph.relations.reduce(
    (count, relation) => count + (relation.from === opinionId || relation.to === opinionId ? 1 : 0),
    0,
  );
}

function campCount(graph: OpinionGraph, camp: string | undefined) {
  if (!camp) return 1;
  return graph.opinions.filter((opinion) => opinion.kind === "human" && opinion.camp === camp).length;
}

/**
 * "Buried" never means Zhihu intentionally suppressed an opinion.
 * It means: among the currently retrieved, traceable human opinions, this node
 * is structurally easy to overlook because it has lower exposure / connectivity
 * or represents a smaller camp. This is a navigation heuristic, not a factual
 * claim about platform ranking.
 */
export function analyzeOpinionDiscovery(
  graph: OpinionGraph,
  discoveredIds: ReadonlySet<string> = new Set(),
): Record<string, OpinionDiscoveryProfile> {
  const traceable = graph.opinions.filter(
    (opinion) => opinion.kind === "human" && opinion.sourceIds.length > 0,
  );
  const maxSupport = Math.max(1, ...traceable.map((opinion) => opinion.support));
  const sourceHeats = new Map(traceable.map((opinion) => [opinion.id, sourceHeat(graph, opinion.sourceIds)]));
  const degrees = new Map(traceable.map((opinion) => [opinion.id, relationDegree(graph, opinion.id)]));
  const maxSourceHeat = Math.max(1, ...sourceHeats.values());
  const maxDegree = Math.max(1, ...degrees.values());
  const maxCampCount = Math.max(1, ...traceable.map((opinion) => campCount(graph, opinion.camp)));

  const candidates = traceable.map((opinion) => {
    const supportVisibility = normalize(opinion.support, maxSupport);
    const sourceVisibility = normalize(sourceHeats.get(opinion.id) ?? 0, maxSourceHeat);
    const relationVisibility = normalize(degrees.get(opinion.id) ?? 0, maxDegree);
    const campVisibility = normalize(campCount(graph, opinion.camp), maxCampCount);
    const visibility =
      supportVisibility * 0.3 +
      sourceVisibility * 0.3 +
      relationVisibility * 0.24 +
      campVisibility * 0.16;
    return {
      opinion,
      buriedness: clamp01(1 - visibility),
      metrics: { supportVisibility, sourceVisibility, relationVisibility, campVisibility },
    };
  }).sort((left, right) => right.buriedness - left.buriedness);

  // Keep the galaxy readable. A few weak signals are enough to create the
  // discovery objective; we do not hide half the discussion behind a mechanic.
  const signalCount = candidates.length >= 4
    ? Math.min(2, Math.max(1, Math.floor(candidates.length * 0.22)))
    : 0;
  const signalIds = new Set(candidates.slice(0, signalCount).map((item) => item.opinion.id));
  const result: Record<string, OpinionDiscoveryProfile> = {};

  for (const opinion of graph.opinions) {
    if (opinion.nodeType === "station" || opinion.kind === "ai") {
      result[opinion.id] = {
        opinionId: opinion.id,
        status: "station",
        buriedness: 0,
        traceable: false,
        rationale: "AI 节点是推演或中转设施，不会被包装成‘知乎里被埋藏的真人观点’。",
        metrics: { supportVisibility: 0, sourceVisibility: 0, relationVisibility: 0, campVisibility: 0 },
      };
      continue;
    }
    const candidate = candidates.find((item) => item.opinion.id === opinion.id);
    if (!candidate) {
      result[opinion.id] = {
        opinionId: opinion.id,
        status: "untraceable",
        buriedness: 0,
        traceable: false,
        rationale: "当前节点没有可追溯来源，因此不能作为‘埋藏观点’奖励用户发现。",
        metrics: { supportVisibility: 0, sourceVisibility: 0, relationVisibility: 0, campVisibility: 0 },
      };
      continue;
    }
    const discovered = discoveredIds.has(opinion.id);
    const signal = signalIds.has(opinion.id) && !discovered;
    const reasons: string[] = [];
    if (candidate.metrics.sourceVisibility < 0.5) reasons.push("来源热度较低");
    if (candidate.metrics.relationVisibility < 0.5) reasons.push("与其他观点连接较少");
    if (candidate.metrics.campVisibility < 0.6) reasons.push("所在立场在当前材料中较少见");
    if (candidate.metrics.supportVisibility < 0.5) reasons.push("当前支持度较低");
    result[opinion.id] = {
      opinionId: opinion.id,
      status: discovered ? "discovered" : signal ? "signal" : "visible",
      buriedness: candidate.buriedness,
      traceable: true,
      rationale: reasons.length
        ? `在当前问题星系里较不显眼：${reasons.join("、")}。这只是当前检索材料的结构描述。`
        : "在当前检索材料中较容易被注意到。",
      metrics: candidate.metrics,
    };
  }
  return result;
}

export function loadDiscoveredOpinionIds(questionId: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${questionId}`);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : []);
  } catch {
    return new Set();
  }
}

export function markOpinionDiscovered(questionId: string, opinionId: string) {
  const ids = loadDiscoveredOpinionIds(questionId);
  ids.add(opinionId);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(`${STORAGE_PREFIX}${questionId}`, JSON.stringify([...ids]));
    } catch {
      // Discovery remains usable for the current interaction even if storage is unavailable.
    }
  }
  return ids;
}
