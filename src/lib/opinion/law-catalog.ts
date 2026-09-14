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
  | "exponential"
  | "loss_aversion"
  | "load"
  | "selection"
  | "discount"
  | "feedback"
  | "diffusion";

export type PlanetModelKind = "equation" | "formal-model" | "theory" | "bias";

export interface PlanetLawDefinition {
  id: string;
  name: string;
  field: string;
  kind: PlanetModelKind;
  kindLabel: string;
  /** Canonical formula only when the source model actually has one. Never invent equations for conceptual models. */
  formula?: string;
  /** A short canonical representation. For conceptual models this is plain structure text, not a pseudo-formula. */
  signature: string;
  provenance: string;
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
    kind: "equation",
    kindLabel: "经典方程",
    formula: "ẋ = r + x²",
    signature: "ẋ = r + x²",
    provenance: "Saddle-node bifurcation · normal form",
    definition:
      "鞍结分岔的经典规范形刻画一个稳定平衡态与一个不稳定平衡态如何随控制参数变化逐渐靠近，并在临界点相遇后同时消失。",
    mechanism: "原本可维持的稳定状态，会在参数越过临界点后失去存在条件。",
    goodFor: ["长期累积后突然失稳", "恢复能力逼近边界", "跨过阈值后旧平衡消失"],
    badFor: ["简单收益比较", "多人策略互动", "纯概率判断"],
    visual: "bifurcation",
  },
  {
    id: "bayes",
    name: "贝叶斯更新",
    field: "概率论 · 贝叶斯统计",
    kind: "equation",
    kindLabel: "概率模型",
    formula: "P(H|E) = P(E|H)P(H) / P(E)",
    signature: "P(H|E) = P(E|H)P(H) / P(E)",
    provenance: "Bayes' theorem",
    definition:
      "贝叶斯定理描述在观察到新证据 E 之后，如何把原先对假设 H 的相信程度更新为后验概率。证据的力量取决于它在不同假设下出现的可能性，而不只是证据数量。",
    mechanism: "新的证据会重写旧判断，而且不同证据拥有不同的更新强度。",
    goodFor: ["信息出现后改变判断", "证据冲突", "从先验走向后验"],
    badFor: ["多目标取舍", "群体博弈", "增长饱和"],
    visual: "belief",
  },
  {
    id: "pareto",
    name: "帕累托前沿",
    field: "多目标优化 · 经济学",
    kind: "formal-model",
    kindLabel: "优化模型",
    formula: "¬∃y : fᵢ(y) ≥ fᵢ(x*) ∀i, 且至少一项严格更优",
    signature: "多个目标 · 不存在同时全面改进",
    provenance: "Pareto efficiency",
    definition:
      "帕累托前沿描述多目标选择中的一种边界：当一个方案已经位于前沿，再改善某个目标就必须牺牲至少另一个目标。问题不再是寻找唯一的“最好”，而是决定愿意交换什么。",
    mechanism: "多个重要目标无法同时无限改善，选择本质上包含交换。",
    goodFor: ["高薪与轻松的取舍", "稳定与成长", "多个目标无法同时最优"],
    badFor: ["单一概率更新", "临界失稳", "传播问题"],
    visual: "pareto",
  },
  {
    id: "nash",
    name: "纳什均衡",
    field: "博弈论 · 战略互动",
    kind: "formal-model",
    kindLabel: "博弈模型",
    formula: "uᵢ(sᵢ*, s₋ᵢ*) ≥ uᵢ(sᵢ, s₋ᵢ*)",
    signature: "单方偏离不能让自己更好",
    provenance: "Nash equilibrium",
    definition:
      "纳什均衡描述一种策略组合：当其他人的策略保持不变时，任何单个参与者都无法通过独自改变策略获得更高收益。均衡可以很稳定，却不一定对所有人都好。",
    mechanism: "每个人都做局部合理的选择，系统仍可能停在集体并不理想的状态。",
    goodFor: ["内卷", "竞争", "没人愿意先改变", "相互依赖的决策"],
    badFor: ["单人停止时机", "纯增长", "证据更新"],
    visual: "game",
  },
  {
    id: "optimal_stopping",
    name: "最优停止",
    field: "随机过程 · 决策理论",
    kind: "formal-model",
    kindLabel: "决策模型",
    formula: "V(x) = max{ g(x), 𝔼[V(Xₜ₊₁)|Xₜ=x] }",
    signature: "现在停止 vs 继续等待",
    provenance: "Optimal stopping theory",
    definition:
      "最优停止问题比较两件事：现在停止能够获得的价值，与继续等待后未来可能获得的期望价值。最优策略不是永远坚持或尽快退出，而是在信息、机会与等待成本之间寻找停止边界。",
    mechanism: "真正的问题不是“继续还是放弃”，而是继续等待的未来价值是否仍高于现在停止。",
    goodFor: ["什么时候辞职", "什么时候接受 offer", "什么时候读研", "什么时候停止坚持"],
    badFor: ["多人博弈", "信息传播", "稳定态消失"],
    visual: "decision",
  },
  {
    id: "bellman",
    name: "贝尔曼最优性",
    field: "动态规划 · 强化学习",
    kind: "equation",
    kindLabel: "长期决策方程",
    formula: "V(s) = maxₐ 𝔼[R + γV(s′) | s,a]",
    signature: "当前收益 + 下一状态的未来价值",
    provenance: "Bellman optimality principle",
    definition:
      "贝尔曼最优性把长期决策拆成“当前收益 + 下一状态的未来价值”。一个动作是否值得，不能只看它现在带来的结果，还要看它把人送进了怎样的后续状态。",
    mechanism: "今天的选择会改变明天可选择的空间，因此局部收益不能代表长期价值。",
    goodFor: ["长期规划", "读研与工作的长期路径", "选择会改变未来机会集"],
    badFor: ["一次性概率判断", "纯群体竞争", "简单临界现象"],
    visual: "value",
  },
  {
    id: "logistic",
    name: "Logistic 增长",
    field: "动力系统 · 种群与容量模型",
    kind: "equation",
    kindLabel: "增长方程",
    formula: "dx/dt = rx(1 - x/K)",
    signature: "增长 → 受容量约束 → 逐渐饱和",
    provenance: "Logistic growth model",
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
    kind: "equation",
    kindLabel: "信息度量",
    formula: "H(X) = -Σ p(x) log p(x)",
    signature: "概率越分散 · 不确定性越高",
    provenance: "Claude Shannon · 1948",
    definition:
      "香农熵衡量随机变量结果的不确定性。概率越均匀分散，熵越高；概率越集中在少数结果上，熵越低。它衡量的是未知程度，而不是信息数量本身。",
    mechanism: "当可能性分布更分散时，判断的不确定性更高；有效信息的作用是压缩这种不确定性。",
    goodFor: ["信息混乱", "不确定性", "观点分散", "信息是否真正减少未知"],
    badFor: ["停止时机", "收益取舍", "稳定态消失"],
    visual: "entropy",
  },
  {
    id: "little_law",
    name: "Little 定律",
    field: "排队论 · 运营系统",
    kind: "equation",
    kindLabel: "排队定律",
    formula: "L = λW",
    signature: "在途数量 = 到达率 × 停留时间",
    provenance: "Little's law",
    definition:
      "Little 定律连接稳定系统中的平均在途数量 L、平均到达率 λ 与平均停留时间 W。它揭示：当吞吐率一定时，系统里堆积得越多，平均等待时间就越长。",
    mechanism: "任务持续流入而处理能力有限时，堆积会直接体现在等待时间上。",
    goodFor: ["排队", "工作积压", "系统负载", "流程拥堵"],
    badFor: ["证据更新", "多人策略均衡", "长期价值规划"],
    visual: "queue",
  },
  {
    id: "exponential",
    name: "指数增长",
    field: "微分方程 · 增长模型",
    kind: "equation",
    kindLabel: "增长方程",
    formula: "x(t) = x₀eʳᵗ",
    signature: "固定比例差异被时间持续复合",
    provenance: "Exponential growth model",
    definition:
      "指数增长描述变化率与当前规模成正比的过程。固定比例的微小差异会被时间持续复合，因此早期看似很小的差距，长期可能被显著放大。",
    mechanism: "时间会把持续存在的比例差异不断复合，形成越来越大的长期结果差异。",
    goodFor: ["复利", "长期积累", "习惯", "小优势被时间放大"],
    badFor: ["资源饱和", "策略互动", "证据冲突"],
    visual: "exponential",
  },
  {
    id: "prospect_theory",
    name: "前景理论",
    field: "行为经济学 · 决策心理学",
    kind: "formal-model",
    kindLabel: "行为决策模型",
    formula: "v(x) = xᵅ (x≥0);  -λ(-x)ᵝ (x<0)",
    signature: "参考点 · 损失厌恶 · 敏感度递减",
    provenance: "Kahneman & Tversky · 1979",
    definition:
      "前景理论描述人们如何相对某个参考点感受收益与损失。典型价值函数在损失一侧更陡，意味着相同幅度的损失通常比收益带来更强烈的心理影响。",
    mechanism: "决策并不只由最终结果决定；参考点与损失厌恶会显著改变主观价值。",
    goodFor: ["怕失去已有位置", "沉没在损失感里", "收益与损失不对称", "风险选择"],
    badFor: ["客观最优路径", "群体扩散", "系统临界失稳"],
    visual: "loss_aversion",
  },
  {
    id: "cognitive_load",
    name: "认知负荷理论",
    field: "认知心理学 · 学习科学",
    kind: "theory",
    kindLabel: "认知理论",
    signature: "有限工作记忆 · 内在负荷 · 外在负荷",
    provenance: "John Sweller · Cognitive Load Theory",
    definition:
      "认知负荷理论强调工作记忆容量有限。任务本身的复杂度与呈现方式带来的额外负荷都会占用有限资源；当负荷超过可处理范围，学习、推理和任务表现会下降。",
    mechanism: "能力没有消失，但有限的认知资源可能先被任务复杂度与无关干扰占满。",
    goodFor: ["信息过载", "同时处理太多任务", "学习材料过于复杂", "频繁打断与切换"],
    badFor: ["长期收益比较", "群体博弈", "概率证据更新"],
    visual: "load",
  },
  {
    id: "selection_bias",
    name: "选择偏差",
    field: "统计推断 · 科学方法",
    kind: "bias",
    kindLabel: "推断偏差",
    signature: "被观察到的样本 ≠ 原始总体",
    provenance: "Selection bias · statistical inference",
    definition:
      "选择偏差发生在进入观察样本的机制与研究对象本身相关时。此时我们看到的案例并不能代表原始总体，遗漏的失败者、退出者或不可见样本会系统性扭曲判断。",
    mechanism: "真正决定结论的，有时不是看到了什么，而是哪些东西根本没有机会被看到。",
    goodFor: ["幸存者经验", "成功案例", "平台上的可见样本", "只看到留下来的人"],
    badFor: ["单人长期规划", "资源饱和", "停止边界"],
    visual: "selection",
  },
  {
    id: "hyperbolic_discounting",
    name: "双曲折扣",
    field: "行为经济学 · 时间决策",
    kind: "formal-model",
    kindLabel: "时间偏好模型",
    formula: "V = A / (1 + kD)",
    signature: "越靠近当下 · 折扣变化越剧烈",
    provenance: "Hyperbolic discounting",
    definition:
      "双曲折扣用来描述一种常见的时间偏好：人们会显著低估更远期的价值，而且越接近当下，偏好反转越容易发生。因此“长期知道应该做什么”和“眼前真正选择什么”可能并不一致。",
    mechanism: "短期诱因会被过度放大，导致长期计划在临近行动时被重新改写。",
    goodFor: ["拖延", "即时满足", "长期计划反复失守", "现在舒服与未来收益冲突"],
    badFor: ["多人竞争", "样本偏差", "临界失稳"],
    visual: "discount",
  },
  {
    id: "feedback_loop",
    name: "反馈回路",
    field: "系统动力学 · 控制与组织系统",
    kind: "theory",
    kindLabel: "系统模型",
    signature: "强化回路 ↔ 平衡回路",
    provenance: "System dynamics · feedback loops",
    definition:
      "系统动力学把许多持续变化理解为反馈回路。强化回路会让变化自我放大，平衡回路则抵消偏离、把系统拉回某个目标附近。现实系统通常由多个回路同时作用。",
    mechanism: "一个结果会反过来改变产生它的条件，于是变化可能被放大，也可能被抑制。",
    goodFor: ["恶性循环", "正向飞轮", "越忙越乱", "行为会反过来改变环境"],
    badFor: ["一次性选择", "纯样本偏差", "单个概率更新"],
    visual: "feedback",
  },
  {
    id: "diffusion_innovations",
    name: "创新扩散",
    field: "传播学 · 社会学",
    kind: "theory",
    kindLabel: "传播模型",
    signature: "创新者 → 早期采用者 → 多数群体 → 滞后者",
    provenance: "Everett Rogers · Diffusion of Innovations",
    definition:
      "创新扩散理论研究新想法、技术或实践如何通过社会系统传播。不同人群采用新事物的时间不同，传播常呈现先慢、后快、再趋缓的扩散过程。",
    mechanism: "一个观点或做法能否普及，不只取决于它本身，还取决于社会网络、可观察性与采用门槛。",
    goodFor: ["新技术接受", "观念传播", "为什么少数人先尝试", "群体采用速度"],
    badFor: ["个人停止时机", "工作记忆负荷", "单纯损失厌恶"],
    visual: "diffusion",
  },
];

export function getPlanetLaw(id: string) {
  return LAW_CATALOG.find((law) => law.id === id) ?? null;
}
