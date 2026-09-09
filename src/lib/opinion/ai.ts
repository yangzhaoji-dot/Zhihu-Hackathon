import "server-only";

import type {
  CollisionAnalysis,
  GapAnalysis,
  NavigationHint,
  Opinion,
  OpinionGraph,
  OpinionSource,
  SearchResult,
} from "./types";
import { aiJson, type AiMessage } from "./ai-client";
import { getOpinionGraph } from "./store";

const SYSTEM: AiMessage = {
  role: "system",
  content:
    "你是 OpinionSpace 的推演引擎，负责在中文语境下分析知乎式讨论中的观点。" +
    "只输出规范 JSON，不要输出多余文字或解释。所有分析基于给定的观点与其真人回答摘录，" +
    "禁止编造具体人物或数据，缺失信息应如实指出。",
};

function opinionBrief(o: Opinion, sources: OpinionSource[]): string {
  const src = sources
    .filter((s) => o.sourceIds.includes(s.id))
    .map((s) => `「${s.excerpt}」(赞${s.upvotes})`)
    .join("；");
  return `观点：${o.title}（支持度${o.support}${o.kind === "ai" ? "，AI推演" : ""}）。要点：${o.summary}。支撑回答：${src || "无真人回答，属AI推演"}`;
}

// ── Collision analysis ──────────────────────────────────────────────────────
export async function analyzeCollision(
  aId: string,
  bId: string,
  graphOverride?: OpinionGraph,
): Promise<CollisionAnalysis> {
  const graph = graphOverride ?? getOpinionGraph("q_luoci");
  const a = graph?.opinions.find((o) => o.id === aId);
  const b = graph?.opinions.find((o) => o.id === bId);
  if (!graph || !a || !b) return fallbackCollision(a, b);

  const result = await aiJson<Omit<CollisionAnalysis, "source">>([
    SYSTEM,
    {
      role: "user",
      content:
        `请分析两个观点碰撞后的关系，严格输出如下 JSON 结构：\n` +
        `{"consensus":"两者的共识","coreDisagreement":"真正的核心分歧","conditions":{"a":"A成立的条件","b":"B成立的条件"},` +
        `"evidence":{"a":"A的证据类型与充分度","b":"B的证据类型与充分度","verdict":"哪方证据更充分及原因"},` +
        `"missing":["缺失信息1","缺失信息2","缺失信息3"],` +
        `"candidate":{"title":"融合两者后的AI候选新观点(一句话,不超过22字)","summary":"候选观点的一句话说明"}}\n\n` +
        `观点A ${opinionBrief(a, graph.sources)}\n观点B ${opinionBrief(b, graph.sources)}`,
    },
  ]);

  if (!result) return fallbackCollision(a, b);
  return { ...result, source: "ai" };
}

function fallbackCollision(a?: Opinion, b?: Opinion): CollisionAnalysis {
  return {
    consensus: "两条观点都在回应同一议题，但现有材料不足以自动确认更具体的共识。",
    coreDisagreement: `当前可见分歧是「${a?.title ?? "观点 A"}」与「${b?.title ?? "观点 B"}」强调了不同判断。`,
    conditions: {
      a: a?.summary || "需要回到来源确认其成立条件。",
      b: b?.summary || "需要回到来源确认其成立条件。",
    },
    evidence: {
      a: "请查看观点 A 的知乎来源摘录。",
      b: "请查看观点 B 的知乎来源摘录。",
      verdict: "AI 暂不可用，尚不能可靠比较两边证据充分度。",
    },
    missing: ["双方主张的完整上下文", "证据的来源与适用范围", "各自主张成立的边界条件"],
    candidate: {
      title: "先核对条件，再形成综合判断",
      summary: "把两条来源中的条件和证据补齐后再尝试融合。",
    },
    source: "fallback",
  };
}

// ── Blind-spot / gap mining ────────────────────────────────────────────────
export async function mineGaps(graphOverride?: OpinionGraph): Promise<GapAnalysis> {
  const graph = graphOverride ?? getOpinionGraph("q_luoci");
  if (!graph) return { gaps: [], source: "fallback" };
  const list = graph.opinions.map((o) => `- ${o.title}`).join("\n");
  const result = await aiJson<{ gaps: string[] }>([
    SYSTEM,
    {
      role: "user",
      content:
        `以下是问题「${graph.questionTitle}」当前已有的观点。请指出讨论中尚未被充分覆盖的视角、证据或场景，` +
        `输出 JSON：{"gaps":["盲区1","盲区2","盲区3","盲区4"]}，每条不超过24字。\n\n${list}`,
    },
  ]);
  if (!result?.gaps?.length) {
    return {
      gaps: ["缺少观点成立条件的交叉验证", "缺少来源之外的反例", "缺少证据时间与适用范围", "当前只覆盖已检索到的材料"],
      source: "fallback",
    };
  }
  return { gaps: result.gaps, source: "ai" };
}

// ── Semantic opinion search ────────────────────────────────────────────────
export async function semanticSearch(query: string, graphOverride?: OpinionGraph): Promise<SearchResult> {
  const graph = graphOverride ?? getOpinionGraph("q_luoci");
  if (!graph) return { opinionId: null, reason: "", rankedIds: [], source: "fallback" };
  const list = graph.opinions
    .map((o) => `${o.id}: ${o.title} —— ${o.summary}`)
    .join("\n");
  const result = await aiJson<{ opinionId: string; reason: string; rankedIds: string[] }>([
    SYSTEM,
    {
      role: "user",
      content:
        `用户想在观点空间里定位一个想法：「${query}」。请从下列观点中选出语义最接近的一个，` +
        `并给出相关性排序。输出 JSON：{"opinionId":"最相关的id","reason":"为什么最相关(一句话)","rankedIds":["按相关性排序的id数组"]}\n\n${list}`,
    },
  ]);
  const ids = new Set(graph.opinions.map((o) => o.id));
  if (result && result.opinionId && ids.has(result.opinionId)) {
    return {
      opinionId: result.opinionId,
      reason: result.reason ?? "",
      rankedIds: (result.rankedIds ?? []).filter((id) => ids.has(id)),
      source: "ai",
    };
  }
  return fallbackSearch(query, graph.opinions);
}

function fallbackSearch(query: string, opinions: Opinion[]): SearchResult {
  // Lightweight keyword overlap as a graceful fallback.
  const q = query.toLowerCase();
  let best: Opinion | null = null;
  let bestScore = -1;
  const scored = opinions.map((o) => {
    const hay = `${o.title}${o.summary}${o.camp ?? ""}`.toLowerCase();
    let score = 0;
    for (const ch of new Set(q.replace(/\s/g, ""))) if (hay.includes(ch)) score += 1;
    if (score > bestScore) {
      bestScore = score;
      best = o;
    }
    return { id: o.id, score };
  });
  const rankedIds = scored.sort((a, b) => b.score - a.score).map((s) => s.id);
  return {
    opinionId: best ? (best as Opinion).id : opinions[0]?.id ?? null,
    reason: "已按关键词相近度为你定位最接近的观点。",
    rankedIds,
    source: "fallback",
  };
}

// ── Agent navigation recommendation ────────────────────────────────────────
export async function recommendPath(graphOverride?: OpinionGraph): Promise<NavigationHint> {
  const graph = graphOverride ?? getOpinionGraph("q_luoci");
  if (!graph) return { path: [], rationale: "", source: "fallback" };
  const list = graph.opinions
    .map((o) => `${o.id}: ${o.title}（支持度${o.support}）`)
    .join("\n");
  const result = await aiJson<{ path: string[]; rationale: string }>([
    SYSTEM,
    {
      role: "user",
      content:
        `作为观点空间的向导，请为想快速看清「${graph.questionTitle}」争议结构的用户，推荐一条 3-4 个观点的探索路径。` +
        `输出 JSON：{"path":["按顺序的观点id"],"rationale":"这条路径为什么最省力(一句话)"}\n\n${list}`,
    },
  ]);
  const ids = new Set(graph.opinions.map((o) => o.id));
  if (result?.path?.length && result.path.every((id) => ids.has(id))) {
    return { path: result.path, rationale: result.rationale ?? "", source: "ai" };
  }
  return {
    path: graph.opinions.slice(0, 4).map((opinion) => opinion.id),
    rationale: "AI 暂不可用，已按当前图中的观点顺序生成基础阅读路径。",
    source: "fallback",
  };
}
