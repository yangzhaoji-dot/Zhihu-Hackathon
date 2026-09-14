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
  /** Official summary endpoints do not always include vote metadata. */
  upvotesKnown?: boolean;
  /** False when the endpoint returned the answer but omitted author metadata. */
  authorKnown?: boolean;
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

/** Structured result of an AI opinion collision analysis. */
export interface CollisionAnalysis {
  consensus: string;
  coreDisagreement: string;
  conditions: { a: string; b: string };
  evidence: { a: string; b: string; verdict: string };
  missing: string[];
  candidate: { title: string; summary: string };
  source: "ai" | "fallback";
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
  path: string[];
  rationale: string;
  source: "ai" | "fallback";
}

/** Blind-spot / gap analysis for the current discussion. */
export interface GapAnalysis {
  gaps: string[];
  source: "ai" | "fallback";
}

// ── Opinion social matching ─────────────────────────────────────────────────

export interface Explorer {
  id: string;
  name: string;
  tagline: string;
  leaning: string | null;
  agree: string[];
  disagree: string[];
}

export type MatchKind = "resonate" | "spar";

export interface OpinionMatch {
  explorer: Explorer;
  kind: MatchKind;
  score: number;
  overlap: string[];
  clash: string[];
  blurb: string;
}

export interface MatchResult {
  resonate: OpinionMatch[];
  spar: OpinionMatch[];
  markedCount: number;
  source: "ai" | "fallback";
}

// ── Zhihu opinion tinting ───────────────────────────────────────────────────

export type TintStance = "for" | "against" | "conditional" | "neutral";

export interface TintedOpinion {
  id: string;
  text: string;
  stance: TintStance;
  type: string;
  relation: RelationType | null;
  strength: number;
  evidence: string[];
}

export interface TintAnalysis {
  question: string;
  stanceSummary: string;
  opinions: TintedOpinion[];
  camps: { label: string; stance: TintStance; count: number }[];
  blindSpots: string[];
  source: "ai" | "fallback";
}

// ── World configuration (legacy world runtime) ──────────────────────────────

export type WorldType = "crossroads" | "archive" | "theater" | "forest" | "machine";

export interface WorldConfig {
  questionId: string;
  worldType: WorldType;
  name: string;
  tileset: string;
  size: { w: number; h: number };
  spawn: { x: number; y: number };
  zones: Zone[];
  npcs: NpcConfig[];
  pois: Poi[];
  triggers: WorldTrigger[];
}

export interface Zone {
  id: string;
  rect: { x: number; y: number; w: number; h: number };
  camp?: string;
  terrain: "plaza" | "road" | "fog" | "ruin" | "monument" | "bridge" | "station";
  label: { "zh-CN": string; "en-US": string };
  stateKey?: string;
}

export interface NpcConfig {
  id: string;
  opinionId: string;
  zoneId: string;
  pos: { x: number; y: number };
  sprite: string;
  role: string;
  dialogueId: string;
  translucent?: boolean;
}

export interface Poi {
  id: string;
  kind: "bridge" | "gate" | "fog" | "monument" | "observatory" | "rocket" | "chest";
  pos: { x: number; y: number };
  requires?: { sourceIds?: string[]; comparedPair?: [string, string]; stanceCount?: number };
  stateKey?: string;
  label?: { "zh-CN": string; "en-US": string };
}

export interface WorldTrigger {
  id: string;
  on: "first-land" | "enter-zone" | "npc-done" | "compare-done" | "judgement-done" | "before-leave";
  zoneId?: string;
  guideLineKey: string;
  once?: boolean;
}

export interface DialogueScript {
  id: string;
  npcId: string;
  lines: DialogueLine[];
  aiPromptId?: string;
}

export interface DialogueLine {
  speaker: "npc" | "guide" | "player";
  text: string;
  actions?: DialogueAction[];
}

export type DialogueAction =
  | { type: "show-source"; sourceId: string }
  | { type: "collect-opinion"; opinionId: string }
  | { type: "open-compare" }
  | { type: "open-stance"; opinionId: string };

export interface ExplorationProgressDto {
  questionId: string;
  visitedNpcIds: string[];
  collectedOpinionIds: string[];
  foundSourceIds: string[];
  firedTriggerIds: string[];
  worldState: Record<string, unknown>;
  updatedAt?: string;
}

export interface WorldDialogueReply {
  lines: DialogueLine[];
  source: "ai" | "fallback";
}
