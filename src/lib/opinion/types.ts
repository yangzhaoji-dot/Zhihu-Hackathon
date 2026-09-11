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

// ── World configuration (world-design-v0.2 §3.1) ────────────────────────────

export type WorldType = "crossroads" | "archive" | "theater" | "forest" | "machine";

/** 一个议题 = 一个世界配置 */
export interface WorldConfig {
  questionId: string;
  worldType: WorldType;
  name: string;                       // 世界名，如「分岔之城 · 裸辞」
  tileset: string;                    // 素材包标识，灰盒期用 "graybox"
  size: { w: number; h: number };     // 网格单位（1 格 = 48px，见 §7.1）
  spawn: { x: number; y: number };    // 默认落点
  zones: Zone[];                      // 区域（观点群 = 城区）
  npcs: NpcConfig[];                  // NPC（单个观点的承载者）
  pois: Poi[];                        // 兴趣点：桥/门/迷雾/纪念碑/观测点/火箭坪
  triggers: WorldTrigger[];           // 环境叙事触发器（看山台词钩子）
}

export interface Zone {
  id: string;
  rect: { x: number; y: number; w: number; h: number };
  camp?: string;                      // 绑定观点阵营：止损派/稳健派/维权派…
  terrain: "plaza" | "road" | "fog" | "ruin" | "monument" | "bridge" | "station";
  label: { "zh-CN": string; "en-US": string };   // 名称由界面动态渲染，不写进图片
  stateKey?: string;                  // 动态状态键（见 §3.4），静态区域省略
}

export interface NpcConfig {
  id: string;
  opinionId: string;                  // 该 NPC 承载的观点（对应 Opinion.id）
  zoneId: string;
  pos: { x: number; y: number };
  sprite: string;                     // 立绘路径，如 /worlds/crossroads/npc-archivist-v1.png
  role: string;                       // 世界内身份：车站管理员/档案管理员…
  dialogueId: string;                 // 对话脚本 id（§3.2）
  translucent?: boolean;              // true = AI 推演观点，半透明未完成材质
}

export interface Poi {
  id: string;
  kind: "bridge" | "gate" | "fog" | "monument" | "observatory" | "rocket" | "chest";
  pos: { x: number; y: number };
  /** 成立条件 = 通行条件：需先发现某些来源 / 完成某些动作才开放 */
  requires?: { sourceIds?: string[]; comparedPair?: [string, string]; stanceCount?: number };
  stateKey?: string;
  label?: { "zh-CN": string; "en-US": string };
}

export interface WorldTrigger {
  id: string;
  on: "first-land" | "enter-zone" | "npc-done" | "compare-done" | "judgement-done" | "before-leave";
  zoneId?: string;                    // on=enter-zone 时必填
  guideLineKey: string;               // 看山台词：i18n 键或 AI 提示模板 id（§5.6）
  once?: boolean;                     // true = 触发一次后写入 progress.firedTriggerIds
}

// ── Dialogue scripts (world-design-v0.2 §3.2) ───────────────────────────────

/** 单个 NPC 的静态对话脚本：fallback 必用，AI 不可用时的完整体验。 */
export interface DialogueScript {
  id: string;                         // 与 NpcConfig.dialogueId 对应
  npcId: string;
  lines: DialogueLine[];
  aiPromptId?: string;                // AI 增强提示词 id（M3），无 AI 时整段忽略
}

export interface DialogueLine {
  speaker: "npc" | "guide" | "player";
  /** 支持插值：{title} {summary} {excerpt} {condition} {upvotes} {author} {support} {camp} */
  text: string;
  actions?: DialogueAction[];
}

export type DialogueAction =
  | { type: "show-source"; sourceId: string }       // 弹出原文卡（直接读 OpinionSource，不经 AI）
  | { type: "collect-opinion"; opinionId: string }  // 收下观点卡进背包（M3）
  | { type: "open-compare" }                        // 打开比较面板（M3）
  | { type: "open-stance"; opinionId: string };     // 对该观点标记态度（M4）

// ── 探索进度传输对象（world-design-v0.2 §4.4，M3 提前落地） ──────────────────

/** GET/POST /api/opinion/world/progress 的响应负载（与服务端行记录解耦）。 */
export interface ExplorationProgressDto {
  questionId: string;
  visitedNpcIds: string[];
  collectedOpinionIds: string[];
  foundSourceIds: string[];
  firedTriggerIds: string[];
  worldState: Record<string, unknown>; // §3.4 键值约定
  updatedAt?: string;                   // ISO 时间；内存降级路径可能缺省
}

/** POST /api/opinion/world/dialogue 的回复（§4.2）。 */
export interface WorldDialogueReply {
  lines: DialogueLine[];
  source: "ai" | "fallback";
}
