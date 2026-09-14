export type LawVisual =
  | "bifurcation"
  | "belief"
  | "pareto"
  | "game"
  | "decision"
  | "value"
  | "growth"
  | "entropy"
  | "queue"
  | "exponential";

export interface PlanetLawDefinition {
  id: string;
  name: string;
  field: string;
  formula: string;
  definition: string;
  mechanism: string;
  goodFor: string[];
  badFor: string[];
  visual: LawVisual;
}

export const LAW_CATALOG: PlanetLawDefinition[] = [
  {
    id: "saddle_node",
    name: "鞍结分岔",
    field: "非线性动力系统 · 分岔理论",
    formula: "ẋ = r + x²",
    definition:
      "公式 ẋ = r + x² 是分岔理论中描述鞍结分岔的经典规范形。它刻画一个稳定平衡态与一个不稳定平衡态如何随控制参数变化逐渐靠近，并在临界点相遇后同时消失。",
    mechanism: "原本可维持的稳定状态，会在参数越过临界点后失去存在条件。",
    goodFor: ["长期累积后突然失稳", "恢复能力逼近边界", "系统跨过阈值后旧平衡消失"],
    badFor: ["简单收益比较", "多人策略互动", "纯概率判断"],
    visual: "bifurcation",
  },
  {
    id: "bayes",
    name: "贝叶斯定理",
    field: "概率论 · 贝叶斯统计",
    formula: "P(H|E) = P(E|H)P(H) / P(E)",
    definition:
      "贝叶斯定理描述在观察到新证据 E 之后，如何把原先对假设 H 的相信程度更新为后验概率 P(H|E)。证据的力量取决于它在不同假设下出现的可能性，而不只是证据数量。",
    mechanism: "新的证据会重写旧判断，而且不同证据拥有不同的更新强度。",
    goodFor: ["信息出现后改变判断", "证据冲突", "从先验走向后验"],
    badFor: ["多目标取舍", "群体博弈", "增长饱和"],
    visual: "belief",
  },
  {
    id: "pareto",
    name: "帕累托最优",
    field: "多目标优化 · 经济学",
    formula: "¬∃y : fᵢ(y) ≥ fᵢ(x*) ∀i, 且至少一项严格更优",
    definition:
      "帕累托最优描述多目标选择中的一种边界状态：当一个方案已经位于帕累托前沿，再改善某个目标就必须牺牲至少另一个目标。问题因此不再是寻找单一的“最好”，而是决定愿意交换什么。",
    mechanism: "多个重要目标无法同时无限改善，选择本质上包含交换。",
    goodFor: ["高薪与轻松的取舍", "稳定与成长", "多个目标无法同时最优"],
    badFor: ["单一概率更新", "临界失稳", "传播问题"],
    visual: "pareto",
  },
  {
    id: "nash",
    name: "纳什均衡",
    field: "博弈论",
    formula: "uᵢ(sᵢ*, s₋ᵢ*) ≥ uᵢ(sᵢ, s₋ᵢ*)",
    definition:
      "纳什均衡描述这样一种策略组合：当其他人的策略保持不变时，任何单个参与者都无法通过独自改变策略获得更高收益。均衡可以很稳定，却不一定对所有人都好。",
    mechanism: "每个人都做局部合理的选择，系统仍可能停在集体并不理想的状态。",
    goodFor: ["内卷", "竞争", "没人愿意先改变", "相互依赖的决策"],
    badFor: ["单人停止时机", "纯增长", "证据更新"],
    visual: "game",
  },
  {
    id: "optimal_stopping",
    name: "最优停止",
    field: "随机过程 · 决策理论",
    formula: "V(x) = max{ g(x), 𝔼[V(Xₜ₊₁)|Xₜ=x] }",
    definition:
      "最优停止问题比较两件事：现在停止能够获得的价值 g(x)，与继续等待后未来可能获得的期望价值。最优策略并不是永远坚持或尽快退出，而是在信息、机会与等待成本之间寻找停止边界。",
    mechanism: "真正的问题不是“继续还是放弃”，而是继续等待的未来价值是否仍高于现在停止。",
    goodFor: ["什么时候辞职", "什么时候接受 offer", "什么时候读研", "什么时候停止坚持"],
    badFor: ["多人博弈", "信息传播", "稳定态消失"],
    visual: "decision",
  },
  {
    id: "bellman",
    name: "贝尔曼最优性方程",
    field: "动态规划 · 强化学习",
    formula: "V(s) = maxₐ 𝔼[R + γV(s′) | s,a]",
    definition:
      "贝尔曼最优性方程把长期决策拆成“当前收益 + 下一状态的未来价值”。一个动作是否值得，不能只看它现在带来的结果，还要看它把人送进了怎样的后续状态。",
    mechanism: "今天的选择会改变明天可选择的空间，因此局部收益不能代表长期价值。",
    goodFor: ["长期规划", "读研与工作的长期路径", "选择会改变未来机会集"],
    badFor: ["一次性概率判断", "纯群体竞争", "简单临界现象"],
    visual: "value",
  },
  {
    id: "logistic",
    name: "Logistic 增长",
    field: "动力系统 · 种群模型",
    formula: "dx/dt = rx(1 - x/K)",
    definition:
      "Logistic 方程描述受资源上限 K 约束的增长。系统早期近似指数增长，但随着规模接近承载上限，增长速度逐渐下降并最终趋于饱和。",
    mechanism: "增长不是无限的；越接近容量上限，继续投入带来的增量越小。",
    goodFor: ["学习收益递减", "市场增长", "技能提升进入平台期", "资源约束下的增长"],
    badFor: ["博弈", "证据更新", "停止时机"],
    visual: "growth",
  },
  {
    id: "entropy",
    name: "香农熵",
    field: "信息论",
    formula: "H(X) = -Σ p(x) log p(x)",
    definition:
      "香农熵衡量一个随机变量结果的不确定性。概率越均匀分散，熵越高；概率越集中在少数结果上，熵越低。它衡量的是未知程度，而不是信息数量本身。",
    mechanism: "当可能性分布更分散时，判断的不确定性更高；有效信息的作用是压缩这种不确定性。",
    goodFor: ["信息混乱", "不确定性", "观点分散", "信息是否真正减少未知"],
    badFor: ["停止时机", "收益取舍", "稳定态消失"],
    visual: "entropy",
  },
  {
    id: "little_law",
    name: "Little 定律",
    field: "排队论 · 随机过程",
    formula: "L = λW",
    definition:
      "Little 定律连接一个稳定系统中的平均在途数量 L、平均到达率 λ 与平均停留时间 W。它揭示：当吞吐率一定时，系统里堆积得越多，平均等待时间就越长。",
    mechanism: "任务不断流入而处理能力有限时，堆积与等待会相互放大。",
    goodFor: ["排队", "工作积压", "系统负载", "流程拥堵"],
    badFor: ["证据更新", "多人策略均衡", "长期价值规划"],
    visual: "queue",
  },
  {
    id: "exponential",
    name: "指数增长",
    field: "微分方程 · 增长模型",
    formula: "x(t) = x₀eʳᵗ",
    definition:
      "指数增长描述变化率与当前规模成正比的过程。固定比例的微小差异会被时间持续复合，因此早期看似很小的差距，长期可能被显著放大。",
    mechanism: "时间会把持续存在的比例差异不断复合，形成越来越大的长期结果差异。",
    goodFor: ["复利", "长期积累", "习惯", "小优势被时间放大"],
    badFor: ["资源饱和", "策略互动", "证据冲突"],
    visual: "exponential",
  },
];

export function getPlanetLaw(id: string) {
  return LAW_CATALOG.find((law) => law.id === id) ?? null;
}
