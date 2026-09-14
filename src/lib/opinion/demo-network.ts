import type { Question, QuestionRelation, Relation } from "./types";

// 核心示例问题配置
export const CORE_QUESTION_ID = "q_luoci";
export const CORE_QUESTION_TITLE = "年轻人该不该裸辞？";

// 问题网络（第一层）
export const QUESTIONS: Question[] = [
  { id: CORE_QUESTION_ID, title: CORE_QUESTION_TITLE, x: 0.44, y: 0.44, core: true, answerCount: 1836 },
  { id: "q_gap", title: "裸辞后如何解释空窗期？", x: 0.18, y: 0.26, kind: "sub", answerCount: 612 },
  { id: "q_stress", title: "职场压力到什么程度该离开？", x: 0.68, y: 0.22, kind: "prerequisite", answerCount: 934 },
  { id: "q_firstjob", title: "应届生第一份工作重要吗？", x: 0.2, y: 0.64, kind: "related", answerCount: 2210 },
  { id: "q_savefirst", title: "转行要不要先攒钱？", x: 0.74, y: 0.62, kind: "sub", answerCount: 458 },
  { id: "q_market", title: "大环境差时跳槽风险多大？", x: 0.5, y: 0.8, kind: "extension", answerCount: 1105 },
  { id: "q_2019", title: "（2019）裸辞去 Gap 一年值得吗？", x: 0.83, y: 0.42, kind: "temporal", era: "2019", answerCount: 1520 },
];

// 问题间关系
export const QUESTION_RELATIONS: QuestionRelation[] = [
  { from: CORE_QUESTION_ID, to: "q_gap", type: "add", label: "子问题" },
  { from: CORE_QUESTION_ID, to: "q_stress", type: "cond", label: "前置问题" },
  { from: CORE_QUESTION_ID, to: "q_firstjob", type: "support", label: "相关问题" },
  { from: CORE_QUESTION_ID, to: "q_savefirst", type: "add", label: "子问题" },
  { from: CORE_QUESTION_ID, to: "q_market", type: "cond", label: "延伸问题" },
  { from: CORE_QUESTION_ID, to: "q_2019", type: "oppose", label: "同源议题 · 2019" },
];

// 观点节点之间的关系（保持默认示例）
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
