import type { OpinionGraph } from "../opinion/types";
import type { Dimension } from "./model";

/** Authored interaction fixtures. These are NOT retrieved Zhihu answers or statistics. */
const EXAMPLES: Partial<Record<Dimension, readonly string[]>> = {
  health: [
    "长期消耗身心的工作，离开也可以是一种止损。", "短期的不适，不一定意味着这份工作不适合你。",
    "先区分工作本身的伤害，和生活中其他压力。", "休息不是失败，恢复判断力也是一种进展。",
    "换一个环境，未必能解决已经形成的内在焦虑。", "改善工作边界，有时比立刻离开更值得尝试。",
    "不同人的承受边界，不能用同一把尺子衡量。", "一份工作的隐性成本，也包括下班后的生活。",
  ],
  resources: [
    "没有现金流，焦虑可能只是换了一种形式。", "经济缓冲决定的是选择空间，而不是人的勇气。",
    "家庭责任不同，同一个离职决定的代价也不同。", "看清固定支出，比比较别人的存款更重要。",
    "裸辞的成本，也应与继续留下的成本比较。", "别把所有风险都交给未来的自己承担。",
    "可逆的小尝试，能减少一次性选择的压力。", "别人的成功经历，不能代替自己的资源盘点。",
  ],
  growth: [
    "在职时先验证下一份机会，再决定是否离开。", "真正的转型，有时需要一段完整的学习时间。",
    "空窗期的价值，取决于你如何使用这段时间。", "成长不只发生在公司，也不自动发生在离职后。",
    "先弄清想去哪里，而不只是想离开什么。", "一份可展示的作品，有时比一个转行宣言更有用。",
    "工作经验的积累，也存在边际收益下降。", "路径不必一次选对，但需要及时收到反馈。",
  ],
  values: [
    "稳定是一种价值，但不是唯一值得追求的价值。", "拥有离开的选择权，本身就很重要。",
    "不必用吃苦的程度，证明一个人的价值。", "自由也包含为自己的选择承担后果。",
    "留下和离开，都不应该被简单贴上道德标签。", "别把他人的人生节奏，当成自己的进度条。",
    "工作的意义，不必承担人生全部的意义。", "有时真正想改变的，是生活方式而不是职业。",
  ],
  context: [
    "行业处在什么周期，会改变同一个选择的难度。", "组织的问题，不应该被全都解释成个人能力问题。",
    "一家公司不适合你，不代表整个行业都不适合。", "地区之间的机会差异，可能比想象中更大。",
    "讨论离职，也不能忽略工作环境能否被改善。", "职业建议需要放回它产生的年代与环境。",
    "管理方式不同，工作的体验也可能完全不同。", "不要把少数行业的机会，当成所有人的常态。",
  ],
  reasoning: [
    "先分清一段回答是在讲事实、经历，还是价值判断。", "我们更容易看见讲出来的故事，而不是沉默的样本。",
    "一段成功经历，还不足以证明同样的路径普遍有效。", "判断之前，先问还有哪些重要信息没有被看见。",
    "支持一个结论，也要说明它在哪些条件下成立。", "改变一个前提，再看看原来的结论是否仍然成立。",
    "犹豫未必来自胆量，也可能来自信息不足。", "理解一个观点，不等于必须赞同它。",
  ],
};

export const DEMO_ID = "demo-luoci";
export const DEMO_ASSIGNMENTS: Record<string, Dimension> = {};
export const DEMO_GRAPH: OpinionGraph = {
  questionId: DEMO_ID, questionTitle: "年轻人，到底该不该裸辞？", sourceScope: "demo",
  opinions: Object.entries(EXAMPLES).flatMap(([dimension, statements]) => statements.map((title, index) => {
    const id = `demo-${dimension}-${index}`;
    DEMO_ASSIGNMENTS[id] = dimension as Dimension;
    return { id, questionId: DEMO_ID, title, summary: title, kind: "human" as const, origin: "demo" as const, support: 0, x: 0, y: 0, sourceIds: [] };
  })),
  relations: [], authors: [], sources: [],
};
