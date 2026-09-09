import "server-only";

import type { TintAnalysis, TintedOpinion, TintStance } from "./types";
import { aiJson, type AiMessage } from "./ai-client";

// Structured "tinting" of pasted Zhihu content: given an answer or thread (and
// optionally the source link for context), extract the distinct opinions and
// annotate each with stance, type, relation, argument strength and evidence,
// then surface the stance clusters and the perspectives the text never covers.
//
// A real Zhihu link cannot be fetched server-side without an authenticated
// session, so the analyzer works on the pasted text as the source of truth; any
// URL is passed only as weak context. This keeps the feature fully functional
// and honest about what it can see.

const VALID_STANCE: TintStance[] = ["for", "against", "conditional", "neutral"];
const VALID_RELATION = ["support", "refute", "add", "cond", "oppose"] as const;

const SYSTEM: AiMessage = {
  role: "system",
  content:
    "你是 OpinionSpace 的观点解构引擎。给你一段知乎回答或讨论，你要在中文语境下" +
    "把它拆解成若干条彼此独立的观点，并逐条标注：立场(for支持/against反对/conditional有条件/neutral中立)、" +
    "观点类型(如 经验之谈/数据论证/逻辑推理/情绪宣泄/案例佐证/反问质疑 等)、" +
    "与讨论主线的关系(support支持/refute反驳/add补充/cond条件限定/oppose对立，无法判定填 null)、" +
    "论证强度(0-100)、以及文中引用的证据。" +
    "严禁编造原文没有的内容。只输出规范 JSON，不要多余文字或解释。",
};

interface RawTint {
  question?: unknown;
  stanceSummary?: unknown;
  opinions?: unknown;
  camps?: unknown;
  blindSpots?: unknown;
}

function coerceStance(v: unknown): TintStance {
  return VALID_STANCE.includes(v as TintStance) ? (v as TintStance) : "neutral";
}

function coerceRelation(v: unknown): TintedOpinion["relation"] {
  return (VALID_RELATION as readonly string[]).includes(v as string)
    ? (v as TintedOpinion["relation"])
    : null;
}

function coerceStrength(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 50;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function coerceStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string").slice(0, 6);
}

export async function tintZhihu(input: {
  text: string;
  url?: string;
}): Promise<TintAnalysis> {
  const text = input.text.trim().slice(0, 6000); // guard model input size
  const urlNote = input.url ? `\n(来源链接，仅作弱上下文，不代表可访问其内容：${input.url})` : "";

  const raw = await aiJson<RawTint>([
    SYSTEM,
    {
      role: "user",
      content:
        `请解构下面这段知乎内容，严格输出如下 JSON：\n` +
        `{"question":"推断的讨论主题(一句话)",` +
        `"stanceSummary":"整体立场分布的一句话判读",` +
        `"opinions":[{"text":"观点陈述(用作者口吻,不超过40字)","stance":"for|against|conditional|neutral",` +
        `"type":"观点类型","relation":"support|refute|add|cond|oppose 或 null","strength":0到100,"evidence":["证据1"]}],` +
        `"camps":[{"label":"立场簇标签","stance":"for|against|conditional|neutral","count":该簇观点数}],` +
        `"blindSpots":["原文没有触及的视角1","视角2"]}\n` +
        `最多拆解 8 条观点，按论证强度从高到低排列。\n\n内容：\n${text}${urlNote}`,
    },
  ]);

  if (!raw || !Array.isArray(raw.opinions)) return fallbackTint(text);

  const opinions: TintedOpinion[] = (raw.opinions as unknown[])
    .slice(0, 8)
    .map((o, i) => {
      const obj = (o ?? {}) as Record<string, unknown>;
      return {
        id: `t${i}`,
        text: typeof obj.text === "string" ? obj.text : "",
        stance: coerceStance(obj.stance),
        type: typeof obj.type === "string" ? obj.type : "观点",
        relation: coerceRelation(obj.relation),
        strength: coerceStrength(obj.strength),
        evidence: coerceStringArray(obj.evidence),
      };
    })
    .filter((o) => o.text.length > 0);

  if (opinions.length === 0) return fallbackTint(text);

  const camps = Array.isArray(raw.camps)
    ? (raw.camps as unknown[])
        .map((c) => {
          const obj = (c ?? {}) as Record<string, unknown>;
          return {
            label: typeof obj.label === "string" ? obj.label : "",
            stance: coerceStance(obj.stance),
            count:
              typeof obj.count === "number" ? obj.count : Number(obj.count) || 0,
          };
        })
        .filter((c) => c.label.length > 0)
    : deriveCamps(opinions);

  return {
    question: typeof raw.question === "string" ? raw.question : "未标注主题",
    stanceSummary:
      typeof raw.stanceSummary === "string"
        ? raw.stanceSummary
        : "已按立场解构以下观点。",
    opinions,
    camps,
    blindSpots: coerceStringArray(raw.blindSpots),
    source: "ai",
  };
}

// Group opinions into stance clusters when the model omits `camps`.
function deriveCamps(opinions: TintedOpinion[]): TintAnalysis["camps"] {
  const byStance = new Map<TintStance, number>();
  for (const o of opinions) byStance.set(o.stance, (byStance.get(o.stance) ?? 0) + 1);
  const label: Record<TintStance, string> = {
    for: "支持方",
    against: "反对方",
    conditional: "有条件方",
    neutral: "中立方",
  };
  return [...byStance.entries()].map(([stance, count]) => ({
    label: label[stance],
    stance,
    count,
  }));
}

// Offline fallback: split into sentences and mark everything neutral so the UI
// still renders a structured (if shallow) breakdown when App AI is unavailable.
function fallbackTint(text: string): TintAnalysis {
  const sentences = text
    .split(/[。！？\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 8)
    .slice(0, 6);
  const opinions: TintedOpinion[] = sentences.map((s, i) => ({
    id: `t${i}`,
    text: s.slice(0, 40),
    stance: "neutral",
    type: "未判定",
    relation: null,
    strength: 50,
    evidence: [],
  }));
  return {
    question: "未标注主题",
    stanceSummary: "AI 暂不可用，已按句子做基础切分，立场未判定。",
    opinions,
    camps: opinions.length
      ? [{ label: "中立方", stance: "neutral", count: opinions.length }]
      : [],
    blindSpots: [],
    source: "fallback",
  };
}
