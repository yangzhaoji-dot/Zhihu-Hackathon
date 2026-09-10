// Domain model for OpinionSpace — the structured opinion universe built from
// Zhihu-style questions, answers, and comments.

/** Relation types between opinions (and between questions). */
export type RelationType =
  | "support" // 支持
  | "refute" // 反驳
  | "add" // 补充
  | "cond" // 条件限定
  | "oppose"; // 对立分歧

/** Whether an opinion is extracted from a real human answer or inferred by the agent. */
export type OpinionKind = "human" | "ai";

/** A viewer's personal stance toward an opinion. */
export type Stance = "agree" | "disagree" | "neutral";

/** The author of a real Zhihu answer that backs an opinion. */
export interface Author {
  id: string;
  name: string; // e.g. "@林小满"
  title: string; // e.g. "产品经理 · 5 年"
  credibility: number; // 0-100, editorial confidence in the source
}

/** A real Zhihu answer (or comment) that supports an opinion — the traceable source. */
export interface OpinionSource {
  id: string;
  authorId: string;
  excerpt: string; // original-text excerpt, verbatim feel
  upvotes: number;
  url: string; // deep link back to the original Zhihu answer
  evidence?: string[]; // supporting facts / data cited in the answer
}

/** A single distinct opinion node in a question's opinion space. */
export interface Opinion {
  id: string;
  questionId: string;
  title: string; // the crisp opinion statement shown on the node
  summary: string; // one-line elaboration
  kind: OpinionKind;
  origin?: "demo" | "zhihu-grounded" | "ai-derived";
  nodeType?: "opinion" | "topic" | "station" | "user";
  derivedSource?: "ai" | "fallback";
  support: number; // 0-100 support magnitude; drives node size + collision physics
  x: number; // normalized 0-1 layout position
  y: number;
  sourceIds: string[]; // human opinions map to real answers; ai opinions cite derivation
  camp?: string; // rough stance camp label, e.g. "止损派" / "稳健派"
  derivedFrom?: string[]; // for ai opinions: parent opinion ids
  claim?: string;
  reason?: string;
  conditions?: string[];
  evidence?: string[];
}

/** A directed relation between two opinions. */
export interface Relation {
  from: string;
  to: string;
  type: RelationType;
  rationale?: string;
}

/** A question node in the global question network (layer 1). */
export interface Question {
  id: string;
  title: string;
  x: number;
  y: number;
  core?: boolean; // the current focus question
  kind?: "related" | "sub" | "prerequisite" | "extension" | "temporal";
  era?: string; // for temporal variants, e.g. "2019" / "2024"
  answerCount?: number;
}

/** A relation edge in the question network. */
export interface QuestionRelation {
  from: string;
  to: string;
  type: RelationType;
  label: string; // human-readable relation, e.g. "子问题"
}

/** The full opinion-space graph for one question (layer 2). */
export interface OpinionGraph {
  questionId: string;
  questionTitle: string;
  questionUrl?: string;
  sourceScope?: "zhihu-question-answers" | "demo";
  buildSource?: "zhihu-zhida" | "eazo" | "fallback";
  buildModel?: string;
  opinions: Opinion[];
  relations: Relation[];
  authors: Author[];
  sources: OpinionSource[];
}

/** The question network for layer 1. */
export interface QuestionNetwork {
  coreQuestionId: string;
  questions: Question[];
  relations: QuestionRelation[];
}

/** Structured result of an AI opinion collision analysis. */
export interface CollisionAnalysis {
  consensus: string; // 共识 / 共同点
  coreDisagreement: string; // 核心分歧
  conditions: { a: string; b: string }; // 各自成立条件
  evidence: { a: string; b: string; verdict: string }; // 证据充分度对比
  missing: string[]; // 缺失信息 / 未覆盖维度
  candidate: {
    // the fused AI candidate opinion (materialized only when the user fuses)
    title: string;
    summary: string;
  };
  source: "ai" | "fallback"; // whether produced by App AI or the offline fallback
}

/** Result of a semantic opinion search. */
export interface SearchResult {
  opinionId: string | null;
  reason: string;
  rankedIds: string[];
  source: "ai" | "fallback";
}

/** Agent navigation recommendation across the opinion space. */
export interface NavigationHint {
  path: string[]; // ordered opinion ids to explore
  rationale: string;
  source: "ai" | "fallback";
}

/** Blind-spot / gap analysis for the current discussion. */
export interface GapAnalysis {
  gaps: string[];
  source: "ai" | "fallback";
}

// ── Opinion social matching ─────────────────────────────────────────────────

/** A fellow explorer with a stance profile, matchable against the viewer. */
export interface Explorer {
  id: string;
  name: string; // display handle, e.g. "@夜航西飞"
  tagline: string; // one-line self description
  leaning: string | null; // dominant camp label
  agree: string[]; // opinion ids they agree with
  disagree: string[]; // opinion ids they disagree with
}

/** How a match relates to the viewer. */
export type MatchKind = "resonate" | "spar"; // 同频共振 / 观点交锋

/** A single scored match between the viewer and an explorer. */
export interface OpinionMatch {
  explorer: Explorer;
  kind: MatchKind;
  score: number; // 0-100 affinity (resonate) or friction (spar) strength
  overlap: string[]; // opinion ids you both agree on
  clash: string[]; // opinion ids where you disagree with each other
  blurb: string; // AI-written one-line reason to connect
}

/** Result of matching the viewer against the explorer pool. */
export interface MatchResult {
  resonate: OpinionMatch[]; // kindred spirits
  spar: OpinionMatch[]; // worthy opponents
  markedCount: number; // how many stances the viewer has marked
  source: "ai" | "fallback";
}

// ── Zhihu opinion tinting (paste link / text → structured highlight) ─────────

/** A stance an extracted opinion takes toward the question. */
export type TintStance = "for" | "against" | "conditional" | "neutral";

/** One structured opinion extracted and "tinted" from pasted Zhihu content. */
export interface TintedOpinion {
  id: string;
  text: string; // the opinion statement, in the author's voice
  stance: TintStance; // 支持 / 反对 / 有条件 / 中立
  type: string; // opinion type, e.g. "经验之谈" / "数据论证" / "情绪宣泄"
  relation: RelationType | null; // relation to the main thrust, when applicable
  strength: number; // 0-100 how forcefully it is argued
  evidence: string[]; // cited facts / data / cases, if any
}

/** Full structured analysis of a pasted Zhihu answer / thread. */
export interface TintAnalysis {
  question: string; // the inferred question under discussion
  stanceSummary: string; // one-line read of the overall stance distribution
  opinions: TintedOpinion[];
  camps: { label: string; stance: TintStance; count: number }[]; // stance clusters
  blindSpots: string[]; // perspectives the text never addresses
  source: "ai" | "fallback";
}
