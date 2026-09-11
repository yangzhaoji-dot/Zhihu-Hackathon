import "server-only";

import type {
  CollisionAnalysis,
  DialogueLine,
  GapAnalysis,
  NavigationHint,
  Opinion,
  OpinionGraph,
  OpinionSource,
  SearchResult,
  WorldDialogueReply,
} from "./types";
import { aiJson, type AiMessage } from "./ai-client";
import { buildGenericDialogue, getDialogueScript } from "./dialogue";
import { validateDialogueLines } from "./dialogue/validate";
import { getOpinionGraph } from "./store";
import { getWorldConfig } from "./world-config";

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

// ── World dialogue（world-design-v0.2 §4.2，M3） ─────────────────────────────
// 契约红线：AI 只改写表达、不新增事实；actions 白名单校验，越界整段回退静态模板。

export interface WorldDialogueHistoryLine {
  speaker: string;
  text: string;
}

export interface ComposeWorldDialogueInput {
  npcId: string;
  /** "talk"（玩家主动对话）或 "guide-*"（看山触发器，§3.1 WorldTrigger.on）。 */
  trigger: string;
  locale: string;
  history: WorldDialogueHistoryLine[];
  /** 客户端上报的 WorldState 摘要源（§3.4 键值），可选。 */
  worldState?: Record<string, unknown>;
}

const DIALOGUE_SYSTEM: AiMessage = {
  role: "system",
  content:
    "你是 OpinionSpace 二维世界里的角色台词引擎。你以 NPC 或引导角色「看山」的口吻续写台词。" +
    "铁律：只允许复述、改写注入材料里已存在的事实（观点标题/要点/来源摘录/统计数字），" +
    "禁止新增任何人物、数据、案例或引用；禁止编造来源。只输出规范 JSON，不要输出多余文字。",
};

function graphStatsLine(graph: OpinionGraph): string {
  const camps = new Set(graph.opinions.map((o) => o.camp).filter(Boolean));
  return `议题「${graph.questionTitle}」当前纳入 ${graph.opinions.length} 个观点、` +
    `${camps.size} 个阵营（${[...camps].join("/")}）、${graph.sources.length} 条真人来源。`;
}

function worldStateSummary(worldState?: Record<string, unknown>): string {
  const keys = Object.keys(worldState ?? {});
  if (keys.length === 0) return "世界状态：初始（桥梁未点亮、迷雾未散、无观测站）。";
  const bridges = keys.filter((k) => k.startsWith("bridge:")).length;
  const fogs = keys.filter((k) => k.startsWith("fog")).length;
  const ruins = keys.filter((k) => k.startsWith("ruin:")).length;
  const observatory = keys.includes("observatory") ? "已建立观测站" : "未建立观测站";
  return `世界状态：已点亮桥梁 ${bridges} 座、迷雾标记 ${fogs} 处、停工建筑标记 ${ruins} 处、${observatory}。`;
}

function sanitizeHistory(history: WorldDialogueHistoryLine[]): string {
  return history
    .slice(-8)
    .map((h) => `${h.speaker === "player" ? "玩家" : "对方"}：${h.text.slice(0, 200)}`)
    .join("\n");
}

interface DialogueTarget {
  opinion: Opinion;
  role: string;
  sources: OpinionSource[];
  staticLines: DialogueLine[];
}

/** talk 触发：解析 NPC → 绑定观点 + 来源 + 静态模板。找不到返回 null（404）。 */
function resolveDialogueTarget(npcId: string): DialogueTarget | null {
  const graph = getOpinionGraph("q_luoci");
  if (!graph) return null;
  const config = getWorldConfig("q_luoci");
  const npc = config?.npcs.find((n) => n.id === npcId) ?? null;
  // 融合观点的运行时 NPC（npc_o_ai_*）：配置里没有，但观点在 store 里可解析。
  const opinionId = npc?.opinionId ?? (npcId.startsWith("npc_") ? npcId.slice(4) : "");
  const opinion = graph.opinions.find((o) => o.id === opinionId) ?? null;
  if (!opinion) return null;
  const sources = graph.sources.filter((s) => opinion.sourceIds.includes(s.id));
  const script = (npc && getDialogueScript(npc.dialogueId)) ?? null;
  return {
    opinion,
    role: npc?.role ?? "半透明新居民",
    sources,
    staticLines: (script ?? buildGenericDialogue(npcId, opinion.id)).lines,
  };
}

function opinionFullText(o: Opinion, sources: OpinionSource[]): string {
  const parts = [
    `标题：${o.title}`,
    `要点：${o.summary}`,
    o.claim ? `主张：${o.claim}` : null,
    o.reason ? `理由：${o.reason}` : null,
    o.conditions?.length ? `成立条件：${o.conditions.join("；")}` : null,
    `阵营：${o.camp ?? "无"}；支持度：${o.support}；类型：${o.kind === "ai" ? "AI 推演观点（半透明，无真人履历）" : "真人观点"}`,
    `支撑来源：${sources.map((s) => `${s.id}「${s.excerpt}」(赞${s.upvotes})`).join("；") || "无真人来源"}`,
  ];
  return parts.filter(Boolean).join("\n");
}

/** 看山静态兜底（服务端版，含真实统计数字，遵守 §5.6 四步结构）。 */
function buildGuideFallbackLines(
  trigger: string,
  graph: OpinionGraph,
  locale: string,
): DialogueLine[] {
  const camps = [...new Set(graph.opinions.map((o) => o.camp).filter(Boolean))];
  const zh = locale !== "en-US";
  const texts = zh
    ? [
        `我是看山，这座城的导航员。你触发了「${trigger}」时刻，我来说明这里的情况。`,
        `可以验证的事实是：当前材料里有 ${graph.opinions.length} 个观点、${camps.length} 个阵营（${camps.join("/")}）、${graph.sources.length} 条真人来源。`,
        "要分清的是：这些数字是事实；城区的样子只是对材料的解释；材料照不到的地方，仍是未知。",
        "你可以：找任意居民对话核对原文、收下观点卡，或者去别的城区看看不同的声音。",
      ]
    : [
        `I'm Kanshan, the navigator of this city. You triggered "${trigger}", so let me explain.`,
        `What can be verified: the current material holds ${graph.opinions.length} opinions, ${camps.length} camps (${camps.join("/")}), and ${graph.sources.length} human sources.`,
        "To be clear: those numbers are facts; the cityscape is only an interpretation of the material; what it cannot reach remains unknown.",
        "You can talk to any resident to check the original sources, collect opinion cards, or visit another district for different voices.",
      ];
  return texts.map((text) => ({ speaker: "guide" as const, text }));
}

/**
 * 生成世界内对话回复。返回值：
 * - null：npcId 无法解析（路由层 404 npc_not_found）；
 * - source:"ai"：模型输出通过白名单校验；
 * - source:"fallback"：模型不可用 / 非法 JSON / 越界引用 → 静态模板。
 */
export async function composeWorldDialogue(
  input: ComposeWorldDialogueInput,
): Promise<WorldDialogueReply | null> {
  const graph = getOpinionGraph("q_luoci");
  if (!graph) return null;
  const isGuide = input.trigger.startsWith("guide-");
  const zh = input.locale !== "en-US";

  if (!isGuide) {
    const target = resolveDialogueTarget(input.npcId);
    if (!target) return null;
    const { opinion, role, sources, staticLines } = target;

    const result = await aiJson<{ lines?: unknown }>([
      DIALOGUE_SYSTEM,
      {
        role: "user",
        content:
          `${graphStatsLine(graph)}\n${worldStateSummary(input.worldState)}\n\n` +
          `你扮演的角色：${role}（NPC id：${input.npcId}），绑定观点全文：\n${opinionFullText(opinion, sources)}\n\n` +
          `动作白名单：show-source 只能引用 [${sources.map((s) => s.id).join(", ") || "无"}]；` +
          `collect-opinion / open-stance 只能引用 ["${opinion.id}"]；open-compare 无参数。\n` +
          `对话历史：\n${sanitizeHistory(input.history) || "（无）"}\n\n` +
          `要求：以「${role}」的口吻续写 2-4 行台词，口语化、有角色性格，单行 ≤120 字；` +
          `只能复述上面注入的事实；至少包含一次 show-source 与一次 collect-opinion 动作。` +
          `输出严格 JSON：{"lines":[{"speaker":"npc","text":"…","actions":[{"type":"show-source","sourceId":"…"}]}]}` +
          (zh ? "。语言：中文。" : ". Language: English."),
      },
    ]);

    const aiLines = validateDialogueLines(result, {
      sourceIds: new Set(sources.map((s) => s.id)),
      opinionIds: new Set([opinion.id]),
    });
    if (aiLines) return { lines: aiLines, source: "ai" };
    return { lines: staticLines, source: "fallback" };
  }

  // ── 看山触发器路径（trigger="guide-*"） ──
  const fallbackLines = buildGuideFallbackLines(input.trigger, graph, input.locale);
  const allSourceIds = new Set(graph.sources.map((s) => s.id));
  const allOpinionIds = new Set(graph.opinions.map((o) => o.id));

  const result = await aiJson<{ lines?: unknown }>([
    DIALOGUE_SYSTEM,
    {
      role: "user",
      content:
        `${graphStatsLine(graph)}\n${worldStateSummary(input.worldState)}\n\n` +
        `你是引导角色「看山」。玩家触发了环境叙事时刻：${input.trigger}。\n` +
        `对话历史：\n${sanitizeHistory(input.history) || "（无）"}\n\n` +
        `要求：遵守四步结构——① 呼应玩家观察；② 给出当前材料中的可验证事实（必须带上面注入的数字）；` +
        `③ 区分事实 / 系统解释 / 未知；④ 给出可选行动（看原文 / 继续探索 / 前往他处）。` +
        `单次 ≤4 行，单行 ≤120 字，环境隐喻不得直接当事实。` +
        `动作白名单：show-source 只能引用已注入来源；open-compare 无参数；一般不需要动作。` +
        `输出严格 JSON：{"lines":[{"speaker":"guide","text":"…"}]}` +
        (zh ? "。语言：中文。" : ". Language: English."),
    },
  ]);

  const aiLines = validateDialogueLines(result, {
    sourceIds: allSourceIds,
    opinionIds: allOpinionIds,
    maxLines: 4,
  });
  if (aiLines) return { lines: aiLines, source: "ai" };
  return { lines: fallbackLines, source: "fallback" };
}
