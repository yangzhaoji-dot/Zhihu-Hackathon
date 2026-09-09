import type {
  Opinion,
  Relation,
  Question,
  QuestionRelation,
} from "./types";

// The focus question of the whole demo.
export const CORE_QUESTION_ID = "q_luoci";
export const CORE_QUESTION_TITLE = "年轻人该不该裸辞？";

// ── Layer 2: opinions in the "年轻人该不该裸辞？" opinion space ────────────
export const OPINIONS: Opinion[] = [
  {
    id: "o_stoploss",
    questionId: CORE_QUESTION_ID,
    title: "裸辞能止损，别把身心耗在坏环境",
    summary: "当环境已经损害健康时，尽快离开才能恢复判断力。",
    kind: "human",
    support: 86,
    x: 0.24,
    y: 0.36,
    sourceIds: ["s1", "s2"],
    camp: "止损派",
  },
  {
    id: "o_cashflow",
    questionId: CORE_QUESTION_ID,
    title: "没现金流就裸辞，焦虑只会换个形式",
    summary: "至少准备 6 个月生活费，否则议价权会迅速下降。",
    kind: "human",
    support: 79,
    x: 0.68,
    y: 0.34,
    sourceIds: ["s3", "s4"],
    camp: "稳健派",
  },
  {
    id: "o_inwork",
    questionId: CORE_QUESTION_ID,
    title: "先用在职窗口验证下一份机会",
    summary: "投递、面试、作品集先跑起来，拿到反馈再决定退出。",
    kind: "human",
    support: 64,
    x: 0.47,
    y: 0.56,
    sourceIds: ["s5"],
    camp: "稳健派",
  },
  {
    id: "o_transform",
    questionId: CORE_QUESTION_ID,
    title: "裸辞适合需要深度转型的人",
    summary: "转行学习需要整块时间，但目标必须可拆解、可复盘。",
    kind: "human",
    support: 58,
    x: 0.2,
    y: 0.66,
    sourceIds: ["s6"],
    camp: "止损派",
  },
  {
    id: "o_legal",
    questionId: CORE_QUESTION_ID,
    title: "公司违法不该由个人辞职来解决",
    summary: "先保留证据、协商或仲裁，离职不是唯一选项。",
    kind: "human",
    support: 52,
    x: 0.73,
    y: 0.64,
    sourceIds: ["s7"],
    camp: "维权派",
  },
  {
    id: "o_inner",
    questionId: CORE_QUESTION_ID,
    title: "不解决内在焦虑，换环境也没用",
    summary: "把裸辞当逃离，焦虑会以新的形式回来。",
    kind: "human",
    support: 47,
    x: 0.5,
    y: 0.78,
    sourceIds: ["s8"],
    camp: "维权派",
  },
  {
    id: "o_window",
    questionId: CORE_QUESTION_ID,
    title: "手握 near-offer 时裸辞风险很小",
    summary: "行业扩招或已有意向时，别被‘稳定’吓住。",
    kind: "human",
    support: 41,
    x: 0.82,
    y: 0.46,
    sourceIds: ["s10"],
    camp: "止损派",
  },
  {
    id: "o_threshold",
    questionId: CORE_QUESTION_ID,
    title: "关键不是裸辞，而是退出成本可控",
    summary: "把身心风险、现金储备、市场周期折算成退出阈值。",
    kind: "ai",
    support: 60,
    x: 0.5,
    y: 0.26,
    sourceIds: ["s9"],
    derivedFrom: ["o_stoploss", "o_cashflow"],
  },
];

// ── Relations between opinions (all five types represented) ────────────────
export const RELATIONS: Relation[] = [
  { from: "o_stoploss", to: "o_cashflow", type: "oppose" },
  { from: "o_stoploss", to: "o_transform", type: "support" },
  { from: "o_cashflow", to: "o_inwork", type: "add" },
  { from: "o_inwork", to: "o_threshold", type: "cond" },
  { from: "o_legal", to: "o_stoploss", type: "refute" },
  { from: "o_inner", to: "o_stoploss", type: "refute" },
  { from: "o_window", to: "o_cashflow", type: "oppose" },
  { from: "o_threshold", to: "o_stoploss", type: "add" },
  { from: "o_threshold", to: "o_cashflow", type: "add" },
  { from: "o_transform", to: "o_inwork", type: "cond" },
];

// ── Layer 1: the global question network around the core question ──────────
export const QUESTIONS: Question[] = [
  { id: CORE_QUESTION_ID, title: CORE_QUESTION_TITLE, x: 0.44, y: 0.44, core: true, answerCount: 1836 },
  { id: "q_gap", title: "裸辞后如何解释空窗期？", x: 0.18, y: 0.26, kind: "sub", answerCount: 612 },
  { id: "q_stress", title: "职场压力到什么程度该离开？", x: 0.68, y: 0.22, kind: "prerequisite", answerCount: 934 },
  { id: "q_firstjob", title: "应届生第一份工作重要吗？", x: 0.2, y: 0.64, kind: "related", answerCount: 2210 },
  { id: "q_savefirst", title: "转行要不要先攒钱？", x: 0.74, y: 0.62, kind: "sub", answerCount: 458 },
  { id: "q_market", title: "大环境差时跳槽风险多大？", x: 0.5, y: 0.8, kind: "extension", answerCount: 1105 },
  { id: "q_2019", title: "（2019）裸辞去 Gap 一年值得吗？", x: 0.83, y: 0.42, kind: "temporal", era: "2019", answerCount: 1520 },
];

export const QUESTION_RELATIONS: QuestionRelation[] = [
  { from: CORE_QUESTION_ID, to: "q_gap", type: "add", label: "子问题" },
  { from: CORE_QUESTION_ID, to: "q_stress", type: "cond", label: "前置问题" },
  { from: CORE_QUESTION_ID, to: "q_firstjob", type: "support", label: "相关问题" },
  { from: CORE_QUESTION_ID, to: "q_savefirst", type: "add", label: "子问题" },
  { from: CORE_QUESTION_ID, to: "q_market", type: "cond", label: "延伸问题" },
  { from: CORE_QUESTION_ID, to: "q_2019", type: "oppose", label: "同源议题 · 2019" },
];
