import "server-only";

import type {
  CollisionAnalysis,
  GapAnalysis,
  NavigationHint,
  Opinion,
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
): Promise<CollisionAnalysis> {
  const graph = getOpinionGraph("q_luoci");
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
    consensus: `都承认「${a?.camp ?? "一方"}」与「${b?.camp ?? "另一方"}」的核心关切真实存在：离职决策同时牵动身心状态与现金流。`,
    coreDisagreement: `分歧在于优先级——${a?.title ?? "A"} 优先止损，${b?.title ?? "B"} 优先保留议价权与安全垫。`,
    conditions: {
      a: "当身心健康风险高、且已难以恢复判断力时成立。",
      b: "当现金储备不足、或就业市场处于收缩期时成立。",
    },
    evidence: {
      a: "多为亲历式体验证据（睡眠、情绪改善）。",
      b: "多为结构化数据（offer 折价、招聘周期）。",
      verdict: "两类证据针对不同问题，谁更充分取决于当事人的健康与财务实况。",
    },
    missing: ["所在行业的周期与扩招情况", "个人现金储备与家庭支持", "是否已有医学诊断或体检结论", "是否手握 near-offer"],
    candidate: {
      title: "先设退出阈值，再决定是否裸辞",
      summary: "把健康风险、现金储备与就业周期合成一个可行动的退出阈值。",
    },
    source: "fallback",
  };
}

// ── Blind-spot / gap mining ────────────────────────────────────────────────
export async function mineGaps(): Promise<GapAnalysis> {
  const graph = getOpinionGraph("q_luoci");
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
      gaps: [
        "缺少不同行业/城市的生活成本差异",
        "缺少家庭支持与经济依赖的讨论",
        "缺少心理健康的专业评估路径",
        "缺少裸辞后 6-12 个月的长期追踪",
      ],
      source: "fallback",
    };
  }
  return { gaps: result.gaps, source: "ai" };
}

// ── Semantic opinion search ────────────────────────────────────────────────
export async function semanticSearch(query: string): Promise<SearchResult> {
  const graph = getOpinionGraph("q_luoci");
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
export async function recommendPath(): Promise<NavigationHint> {
  const graph = getOpinionGraph("q_luoci");
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
    path: ["o_cashflow", "o_stoploss", "o_threshold"],
    rationale: "先看‘现金流风险’，再看‘身心止损’，最后落到‘退出成本可控’，最快看清争议结构。",
    source: "fallback",
  };
}
