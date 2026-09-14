import type { OpinionGraph } from "../opinion/types";
import type { Dimension } from "./model";

/**
 * Authored interaction fixtures for the homepage showcase.
 * These are explicitly demo material: they are NOT retrieved Zhihu answers,
 * authors, vote counts, or statistics. Arbitrary search still uses the live API.
 */

type DemoExamples = Partial<Record<Dimension, readonly string[]>>;

const DIMENSION_SUMMARY: Record<Dimension, string> = {
  health: "从身心状态、压力与恢复边界观察这条判断。",
  resources: "从现金流、机会成本与可承受风险观察这条判断。",
  growth: "从长期能力、路径依赖与未来选择空间观察这条判断。",
  values: "从价值排序、身份认同与人生目标观察这条判断。",
  context: "从行业、组织、技术与外部环境观察这条判断。",
  reasoning: "从证据质量、样本偏差与推理条件观察这条判断。",
  other: "从尚未被归入固定方向的角度观察这条判断。",
};

const RESIGN_EXAMPLES: DemoExamples = {
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

const AI_EXAMPLES: DemoExamples = {
  growth: [
    "AI 更可能先替代重复任务，而不是一次性替代整个职业。",
    "会使用 AI 的程序员，可能先替代不会使用 AI 的程序员。",
    "真正稀缺的会从写代码，转向定义问题与验证结果。",
    "底层工程能力仍然决定你能否发现 AI 生成代码里的错误。",
  ],
  context: [
    "不同软件岗位受到 AI 的冲击速度会非常不一样。",
    "当软件需求总量继续增长时，效率提升未必直接减少总岗位。",
    "企业是否愿意承担 AI 代码的责任成本，会影响替代速度。",
    "工具能力扩散之后，岗位标准往往会被重新抬高。",
  ],
  resources: [
    "对公司而言，AI 的价值首先取决于单位产出的真实成本是否下降。",
    "程序员数量是否减少，还取决于新增软件需求能否吸收效率提升。",
    "个人最重要的资源不是某门语言，而是迁移到新工具链的速度。",
    "越靠近业务和系统责任的岗位，短期替代成本通常越高。",
  ],
  values: [
    "程序员这个身份会变化，但创造软件这件事不会消失。",
    "效率提高不等于人的价值下降，只是价值所在的位置改变了。",
    "把职业安全感绑定在某个具体工具上，本身就是高风险策略。",
    "AI 时代更值得保护的是判断力，而不是手写每一行代码的仪式感。",
  ],
  reasoning: [
    "不能用一次模型发布的表现，直接外推整个职业十年的变化。",
    "要区分 benchmark 上会写代码，和真实工程里能承担责任。",
    "只看被自动化的任务比例，会高估职业本身被替代的速度。",
    "讨论替代之前，应先明确替代的是任务、岗位还是完整职业。",
  ],
  health: [
    "持续追逐新模型会制造学习焦虑，但焦虑不等于行业已经没有位置。",
    "工具更新过快时，建立稳定的学习节奏比追每个热点更重要。",
    "长期高强度适应新技术，也需要考虑认知负荷与恢复成本。",
    "把每次技术更新都理解成生存危机，会削弱真实判断。",
  ],
};

const STUDY_EXAMPLES: DemoExamples = {
  growth: [
    "读研最有价值的部分，往往是进入更高密度的学习与研究环境。",
    "如果目标岗位明确要求学历，读研就是直接的路径投资。",
    "工作几年后再读研，已有经验反而能帮助你更清楚地选方向。",
    "读研不会自动带来成长，真正的收益取决于你如何使用这几年。",
  ],
  resources: [
    "读研的成本不只是学费，还包括两到三年的机会成本。",
    "家庭现金流不同，同一个硕士学位的可承受成本完全不同。",
    "如果能拿到明显更好的平台，机会成本可能被长期收益覆盖。",
    "不要只比较毕业起薪，也要比较未来五年的路径差异。",
  ],
  values: [
    "读研值不值，取决于你想换取的是学历、研究经历还是缓冲时间。",
    "不应该把读研当成逃避就业的默认选项。",
    "想做研究，本身就是一个足够正当的读研理由。",
    "别人眼里的学历提升，不一定等于你自己真正想要的人生增量。",
  ],
  context: [
    "同一个硕士学位，在不同行业里的回报差异非常大。",
    "学校、导师和实验室的差异，可能比是否读研本身更重要。",
    "经济周期会改变本科直接就业与继续深造的相对吸引力。",
    "有些行业正在提高学历门槛，有些行业却更看重真实作品。",
  ],
  reasoning: [
    "不能只看读研成功者的故事，还要看到没有获得预期收益的人。",
    "比较读研和工作时，应使用同一时间尺度，而不是只看第一年。",
    "先明确反事实：如果不读研，这几年你最可能做什么。",
    "平均薪资差异不能直接证明学历本身造成了全部收益。",
  ],
  health: [
    "为了逃离当前焦虑去读研，可能只是把压力换了一个场景。",
    "研究型硕士的长期不确定性，对心理状态也是现实成本。",
    "如果已经长期透支，先恢复状态可能比立刻做重大选择更重要。",
    "高强度科研环境并不天然比工作环境更轻松。",
  ],
};

const GRADE_EXAMPLES: DemoExamples = {
  growth: [
    "项目能把知识变成可展示的能力证据。",
    "扎实课程训练仍然是做复杂项目的底层能力。",
    "真正好的项目应该逼你补齐知识，而不是逃避课程。",
    "本科阶段最值得积累的是能够反复迁移的方法，而不是单一成果。",
  ],
  resources: [
    "时间是大学阶段最稀缺的资源，绩点和项目必然存在机会成本。",
    "保研目标明确时，绩点的边际价值会突然变得很高。",
    "如果项目能带来导师、实习或论文机会，它的复合收益可能更大。",
    "不要为了一个低价值项目牺牲核心课程和睡眠。",
  ],
  values: [
    "绩点是评价体系里的信号，不应该成为学习本身的全部意义。",
    "做项目不是为了显得厉害，而是为了知道自己真正会不会。",
    "大学不必在卷绩点和做项目之间做身份站队。",
    "选择哪条路线，应该服务于你想成为怎样的人。",
  ],
  context: [
    "不同学校的保研规则，会直接改变绩点和项目的最优权重。",
    "科研、求职、出国三条路径，对同一份经历的定价完全不同。",
    "低年级和高年级的最优策略不应该完全一样。",
    "当课程质量很高时，认真上课本身就是高价值项目准备。",
  ],
  reasoning: [
    "先区分相关性：高绩点学生项目也好，不代表只卷绩点就会带来项目能力。",
    "不要拿极端大神案例当作普通学生的默认路线。",
    "比较两条路径时，要看它们对同一个目标的贡献，而不是抽象比较谁更高级。",
    "应该定期根据反馈调整权重，而不是大一就锁死四年策略。",
  ],
  health: [
    "长期睡眠不足换来的绩点，很可能透支后续学习能力。",
    "同时追求满绩和多个高强度项目，容易让系统长期过载。",
    "阶段性放弃次要目标，不等于整体失败。",
    "可持续的节奏，通常比短期把所有指标拉满更有长期价值。",
  ],
};

export const DEMO_ID = "demo-luoci";
export const AI_DEMO_ID = "demo-ai-programmers";
export const STUDY_DEMO_ID = "demo-study-value";
export const GRADE_DEMO_ID = "demo-grade-project";

const DEMO_ASSIGNMENTS_BY_ID: Record<string, Record<string, Dimension>> = {};
const DEMO_OPINION_DIMENSION = new Map<string, Dimension>();
const DEMO_OPINION_TITLE = new Map<string, string>();

function buildDemoGraph(
  questionId: string,
  questionTitle: string,
  prefix: string,
  examples: DemoExamples,
): OpinionGraph {
  const assignments: Record<string, Dimension> = {};
  const opinions = Object.entries(examples).flatMap(([dimension, statements]) =>
    statements.map((title, index) => {
      const id = prefix === "demo"
        ? `${prefix}-${dimension}-${index}`
        : `${prefix}-${dimension}-${index}`;
      const typed = dimension as Dimension;
      assignments[id] = typed;
      DEMO_OPINION_DIMENSION.set(id, typed);
      DEMO_OPINION_TITLE.set(id, title);
      return {
        id,
        questionId,
        title,
        summary: DIMENSION_SUMMARY[typed],
        kind: "human" as const,
        origin: "demo" as const,
        support: 0,
        x: 0,
        y: 0,
        sourceIds: [],
        camp: typed,
      };
    }),
  );
  DEMO_ASSIGNMENTS_BY_ID[questionId] = assignments;
  return {
    questionId,
    questionTitle,
    sourceScope: "demo",
    opinions,
    relations: [],
    authors: [],
    sources: [],
  };
}

export const DEMO_GRAPH = buildDemoGraph(DEMO_ID, "年轻人，到底该不该裸辞？", "demo", RESIGN_EXAMPLES);
export const AI_DEMO_GRAPH = buildDemoGraph(AI_DEMO_ID, "AI 会取代程序员吗？", "demo-ai", AI_EXAMPLES);
export const STUDY_DEMO_GRAPH = buildDemoGraph(STUDY_DEMO_ID, "读研真的值得吗？", "demo-study", STUDY_EXAMPLES);
export const GRADE_DEMO_GRAPH = buildDemoGraph(GRADE_DEMO_ID, "大学应该卷绩点还是做项目？", "demo-grade", GRADE_EXAMPLES);

export const DEMO_GRAPHS: Record<string, OpinionGraph> = {
  [DEMO_ID]: DEMO_GRAPH,
  [AI_DEMO_ID]: AI_DEMO_GRAPH,
  [STUDY_DEMO_ID]: STUDY_DEMO_GRAPH,
  [GRADE_DEMO_ID]: GRADE_DEMO_GRAPH,
};

/** Backward-compatible assignment export for the original naked-resignation demo. */
export const DEMO_ASSIGNMENTS = DEMO_ASSIGNMENTS_BY_ID[DEMO_ID];

export const HOME_DEMOS = [
  { id: DEMO_ID, title: "年轻人，到底该不该裸辞？", index: "01", meta: "48 个演示观点 · 6 个方向" },
  { id: AI_DEMO_ID, title: "AI 会取代程序员吗？", index: "02", meta: "24 个演示观点 · 6 个方向" },
  { id: STUDY_DEMO_ID, title: "读研真的值得吗？", index: "03", meta: "24 个演示观点 · 6 个方向" },
  { id: GRADE_DEMO_ID, title: "大学应该卷绩点还是做项目？", index: "04", meta: "24 个演示观点 · 6 个方向" },
] as const;

export function getDemoGraph(id: string): OpinionGraph | null {
  return DEMO_GRAPHS[id] ?? null;
}

export function getDemoAssignments(id: string): Record<string, Dimension> {
  return DEMO_ASSIGNMENTS_BY_ID[id] ?? {};
}

export function isDemoGalaxy(id: string): boolean {
  return Boolean(DEMO_GRAPHS[id]);
}

const LAW_ROTATION: Record<Dimension, readonly string[]> = {
  health: ["saddle_node", "prospect_theory", "optimal_stopping", "logistic"],
  resources: ["pareto", "optimal_stopping", "little_law", "bellman"],
  growth: ["bellman", "logistic", "exponential", "optimal_stopping"],
  values: ["prospect_theory", "pareto", "hyperbolic_discounting", "bellman"],
  context: ["nash", "little_law", "logistic", "exponential"],
  reasoning: ["bayes", "entropy", "pareto", "nash"],
  other: ["bellman"],
};

export type DemoLawPreset = {
  lawId: string;
  confidence: number;
  mechanism: string;
  reason: string;
  mapping: string;
  boundary: string;
};

export function getDemoLawPreset(opinionId: string): DemoLawPreset | null {
  const dimension = DEMO_OPINION_DIMENSION.get(opinionId);
  const title = DEMO_OPINION_TITLE.get(opinionId);
  if (!dimension || !title) return null;
  const rotation = LAW_ROTATION[dimension];
  const match = opinionId.match(/-(\d+)$/);
  const index = Number(match?.[1] ?? 0);
  const lawId = rotation[index % rotation.length];
  const mechanismByDimension: Record<Dimension, string> = {
    health: "现实中的承受、恢复与阈值会随状态变化，并不是固定常数。",
    resources: "选择的关键往往不是单点收益，而是资源约束与机会成本如何共同变化。",
    growth: "当前选择会改变后续能力与机会集，因此需要沿时间看路径。",
    values: "冲突常来自不同目标和参考点，而不是简单的事实判断。",
    context: "个体选择嵌在更大的系统里，外部结构会改变局部最优。",
    reasoning: "结论依赖证据、样本与前提；新信息可能改变原来的判断。",
    other: "这条观点更适合被当作一个动态结构，而不是孤立口号。",
  };
  return {
    lawId,
    confidence: 0.82 - (index % 3) * 0.04,
    mechanism: mechanismByDimension[dimension],
    reason: `这个演示观点被归入「${dimension}」方向，核心不是关键词相似，而是它关心的变化方式与候选法则具有相近结构。`,
    mapping: `把「${title}」放进这个科学结构里观察，可以看到它真正依赖的是哪些变量、边界和随时间变化的关系，而不是把公式当作人生结论。`,
    boundary: "这是为了展示结构相似性而做的策展式映射；它不能证明这条观点在现实中必然成立，也不能替代具体情境和真实证据。",
  };
}
