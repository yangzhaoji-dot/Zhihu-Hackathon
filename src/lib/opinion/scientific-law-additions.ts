import type { PlanetLawDefinition } from "./law-catalog";

/**
 * Cross-domain scientific laws used by the planet interior.
 * Every entry is a real, canonical scientific relation. We reuse the existing
 * visual grammar where the qualitative shape is compatible; no pseudo-formulas.
 */
export const SCIENTIFIC_LAWS: PlanetLawDefinition[] = [
  {
    id: "arrhenius",
    name: "Arrhenius 方程",
    field: "物理化学 · 化学动力学",
    kind: "equation",
    kindLabel: "反应速率方程",
    formula: "k = A e^{-Eₐ/(RT)}",
    signature: "温度进入指数项 · 速率对条件高度敏感",
    provenance: "Svante Arrhenius · chemical kinetics",
    definition:
      "Arrhenius 方程描述许多化学反应的速率常数如何随温度变化。因为温度出现在指数项中，条件看似只改变一点，反应速率却可能发生很大的变化。",
    mechanism: "当关键条件进入指数关系时，小幅环境变化也可能被放大成显著的结果差异。",
    goodFor: ["环境变化被非线性放大", "临界条件附近的敏感反应", "投入与结果不是线性关系"],
    badFor: ["多人战略互动", "证据更新", "纯价值判断"],
    visual: "exponential",
  },
  {
    id: "michaelis_menten",
    name: "Michaelis–Menten 方程",
    field: "生物化学 · 酶动力学",
    kind: "equation",
    kindLabel: "酶动力学方程",
    formula: "v = Vₘₐₓ[S] / (Kₘ + [S])",
    signature: "早期增加明显 · 接近上限后逐渐饱和",
    provenance: "Michaelis & Menten · enzyme kinetics",
    definition:
      "Michaelis–Menten 方程描述底物浓度增加时酶促反应速度的变化。开始时增加底物能明显提高速率，但当酶逐渐被占满后，继续增加投入的边际作用越来越小。",
    mechanism: "系统存在处理上限；投入继续增加时，产出会逐渐进入饱和区。",
    goodFor: ["边际收益递减", "能力或资源存在上限", "更多投入不再同比增加结果"],
    badFor: ["策略博弈", "样本选择", "一次性概率判断"],
    visual: "growth",
  },
  {
    id: "newton_cooling",
    name: "牛顿冷却定律",
    field: "热学 · 传热学",
    kind: "equation",
    kindLabel: "传热定律",
    formula: "dT/dt = -k(T - Tₑₙᵥ)",
    signature: "差距越大 · 初期变化越快 · 接近环境后趋缓",
    provenance: "Newton's law of cooling",
    definition:
      "牛顿冷却定律描述物体与环境之间的温差如何驱动温度变化。温差大时变化快，随着状态接近环境，变化速度逐渐下降。",
    mechanism: "变化速度取决于当前状态与环境之间的差距，而不是保持恒定。",
    goodFor: ["恢复与适应", "差距驱动的变化", "越接近目标越慢"],
    badFor: ["多人竞争", "长期策略规划", "证据可信度"],
    visual: "exponential",
  },
  {
    id: "fick_diffusion",
    name: "Fick 第一定律",
    field: "物理 · 化学 · 扩散过程",
    kind: "equation",
    kindLabel: "扩散定律",
    formula: "J = -D∇C",
    signature: "梯度驱动流动 · 从高浓度指向低浓度",
    provenance: "Adolf Fick · diffusion law",
    definition:
      "Fick 第一定律描述扩散通量与浓度梯度之间的关系。梯度越强，扩散驱动力越大；负号表示净流动方向与浓度上升方向相反。",
    mechanism: "差异本身形成流动驱动力，系统会沿梯度重新分配。",
    goodFor: ["信息或资源从高密度区域扩散", "机会差异产生迁移", "梯度驱动流动"],
    badFor: ["价值冲突", "最优停止", "证据更新"],
    visual: "diffusion",
  },
  {
    id: "hooke",
    name: "胡克定律",
    field: "力学 · 弹性",
    kind: "equation",
    kindLabel: "弹性定律",
    formula: "F = -kx",
    signature: "偏离越大 · 恢复力越强 · 仅在弹性区间成立",
    provenance: "Hooke's law",
    definition:
      "胡克定律描述弹性材料在一定范围内的恢复力与位移近似成正比。负号表示恢复力总是指向平衡位置；超过弹性区间后，这个线性关系会失效。",
    mechanism: "系统会对偏离产生恢复作用，但这种恢复能力本身有适用边界。",
    goodFor: ["边界内的自我恢复", "偏离与纠偏", "压力增加带来更强反作用"],
    badFor: ["不可逆崩溃", "概率判断", "群体传播"],
    visual: "value",
  },
  {
    id: "sir",
    name: "SIR 模型",
    field: "流行病学 · 动力系统",
    kind: "formal-model",
    kindLabel: "传播动力学模型",
    formula: "dS/dt=-βSI/N; dI/dt=βSI/N-γI",
    signature: "传播取决于接触 · 易感者 · 当前传播者 · 恢复率",
    provenance: "Kermack–McKendrick SIR model",
    definition:
      "SIR 模型把人群分成易感、感染与移除三类，描述传播如何由接触率、当前传播者规模和恢复速度共同决定。传播不是只由内容本身决定，而是与当前网络状态耦合。",
    mechanism: "一个现象能否扩散取决于它遇到多少可被影响的对象，以及传播与退出之间的竞争。",
    goodFor: ["观点传播", "技术采用的爆发阶段", "网络状态影响扩散速度"],
    badFor: ["个人价值选择", "单点收益比较", "纯粹的恢复过程"],
    visual: "diffusion",
  },
];
