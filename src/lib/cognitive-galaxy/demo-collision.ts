import type { CollisionAnalysis, Opinion } from "../opinion/types";

const CAMP_LABELS: Record<string, string> = {
  health: "身心边界",
  resources: "资源约束",
  growth: "长期成长",
  values: "价值目标",
  context: "外部环境",
  reasoning: "证据与前提",
  "融合观点": "综合判断",
};

function label(opinion: Opinion) {
  return CAMP_LABELS[opinion.camp ?? ""] ?? "另一种判断";
}

export function analyzeDemoCollision(a: Opinion, b: Opinion): CollisionAnalysis {
  const aLabel = label(a);
  const bLabel = label(b);
  const sameCamp = a.camp && a.camp === b.camp;
  return {
    consensus: sameCamp
      ? `两条观点都从「${aLabel}」出发，但强调了不同条件。`
      : `两条观点都在回答同一个问题，只是分别优先考虑「${aLabel}」与「${bLabel}」。`,
    coreDisagreement: sameCamp
      ? `分歧不在方向，而在于「${a.title}」与「${b.title}」各自把什么条件放在更前面。`
      : `真正的张力是：做决定时，应该先满足「${aLabel}」，还是先满足「${bLabel}」。`,
    conditions: {
      a: a.title,
      b: b.title,
    },
    evidence: {
      a: "策展演示观点，不冒充真实知乎证据。",
      b: "策展演示观点，不冒充真实知乎证据。",
      verdict: "这里不比较虚构证据强弱；演示只展示观点结构如何碰撞与融合。",
    },
    missing: [
      "当事人的具体目标与约束",
      "现实中的时间尺度和可逆性",
      "能够验证双方判断的真实来源",
    ],
    candidate: {
      title: sameCamp ? `先识别${aLabel}中的关键条件` : `同时校准${aLabel}与${bLabel}`,
      summary: sameCamp
        ? `两条判断可以并存，关键是先识别各自成立的边界，再决定当前情境更接近哪一侧。`
        : `更稳健的判断不是二选一，而是先确认${aLabel}的底线，再评估${bLabel}能带来的长期变化。`,
    },
    source: "fallback",
  };
}
