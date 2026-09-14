import { type NextRequest, NextResponse } from "next/server";
import { aiJsonWithProvider, type AiMessage } from "@/lib/opinion/ai-client";
import { LAW_CATALOG, getPlanetLaw } from "@/lib/opinion/law-catalog";
import { SCIENTIFIC_LAWS } from "@/lib/opinion/scientific-law-additions";
import { DEMO_GRAPHS, getDemoLawPreset } from "@/lib/cognitive-galaxy/demo";

export const runtime = "nodejs";

const ALL_LAWS = [...LAW_CATALOG, ...SCIENTIFIC_LAWS];

function findLaw(id: string) {
  return getPlanetLaw(id) ?? SCIENTIFIC_LAWS.find((law) => law.id === id) ?? null;
}

type MatchPayload = {
  selectedId?: unknown;
  confidence?: unknown;
  mechanism?: unknown;
  reason?: unknown;
  mapping?: unknown;
  boundary?: unknown;
};

const SYSTEM: AiMessage = {
  role: "system",
  content:
    "你是观点星球的解释模型匹配器。候选库包含数学、物理、化学、生物、信息科学、经济与决策科学中的真实公式、定律和形式模型。" +
    "你只能从给定候选中选择，不得发明公式、理论、论文或来源，也不得修改候选中的定义。" +
    "先识别观点的底层机制，再判断哪个模型提供了真正的结构增量；关键词相似不是充分理由。" +
    "如果没有很强的对应关系，仍可返回最接近的候选，但 confidence 必须低于 0.45。" +
    "模型只能解释结构，不能证明人生判断或替用户做决定。只输出规范 JSON。",
};

function compact(value: unknown, max = 320) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function fallbackLaw(text: string): { id: string; confidence: number } {
  const rules: Array<[RegExp, string, number]> = [
    [/(温度|反应速率|一点变化.*很大|条件敏感|非线性放大)/, "arrhenius", 0.7],
    [/(边际收益|饱和|处理上限|投入越来越多|上限)/, "michaelis_menten", 0.71],
    [/(恢复|适应|接近环境|差距越大|趋近)/, "newton_cooling", 0.66],
    [/(扩散|梯度|高密度|低密度|迁移|资源流动)/, "fick_diffusion", 0.66],
    [/(恢复力|弹性|纠偏|偏离平衡|反作用)/, "hooke", 0.65],
    [/(传播|感染|接触率|扩散速度|群体采用)/, "sir", 0.68],
    [/(幸存|成功案例|留下来的人|样本|看得到|看不见|选择偏差|幸存者)/, "selection_bias", 0.68],
    [/(拖延|即时满足|短期诱惑|眼前舒服|以后再说|未来的自己)/, "hyperbolic_discounting", 0.68],
    [/(损失|失去|舍不得|亏|后悔|风险厌恶|参考点)/, "prospect_theory", 0.66],
    [/(认知负荷|信息过载|多任务|频繁切换|被打断|脑子装不下|学不动)/, "cognitive_load", 0.7],
    [/(恶性循环|正反馈|越.*越|飞轮|反馈|自我强化|反过来影响)/, "feedback_loop", 0.66],
    [/(普及|传播|采用|新技术|早期用户|大众接受|扩散)/, "diffusion_innovations", 0.64],
    [/(证据|信息|相信|判断|概率|反例|更新)/, "bayes", 0.67],
    [/(高薪|轻松|取舍|兼顾|权衡|多个目标|代价|鱼和熊掌)/, "pareto", 0.66],
    [/(内卷|竞争|大家都|没人先|博弈|互相|对手)/, "nash", 0.65],
    [/(什么时候|何时|继续|停止|退出|辞职|offer|读研|考研|要不要等)/, "optimal_stopping", 0.67],
    [/(长期|未来|路径|后续|机会|规划|选择空间|下一步状态)/, "bellman", 0.64],
    [/(临界|撑不住|崩溃|阈值|失稳|耗尽)/, "saddle_node", 0.65],
    [/(平台期|边际|收益递减)/, "logistic", 0.65],
    [/(不确定|混乱|未知|信息量|分布很散)/, "entropy", 0.62],
    [/(排队|积压|拥堵|等待|任务堆积|工单)/, "little_law", 0.66],
    [/(复利|积累|长期主义|习惯|差距扩大|滚雪球)/, "exponential", 0.64],
  ];
  for (const [pattern, id, confidence] of rules) {
    if (pattern.test(text)) return { id, confidence };
  }
  return { id: "bellman", confidence: 0.36 };
}

function quality(confidence: number) {
  if (confidence >= 0.72) return "strong";
  if (confidence >= 0.48) return "plausible";
  return "exploratory";
}

function demoOpinionByTitle(title: string) {
  for (const graph of Object.values(DEMO_GRAPHS)) {
    const opinion = graph.opinions.find((item) => item.title === title);
    if (opinion) return opinion;
  }
  return null;
}

export async function POST(request: NextRequest) {
  let body: { title?: unknown; summary?: unknown; sources?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const title = compact(body.title, 180);
  const summary = compact(body.summary, 420);
  const sources = Array.isArray(body.sources)
    ? body.sources.map((item) => compact(item, 520)).filter(Boolean).slice(0, 5)
    : [];
  if (!title) return NextResponse.json({ ok: false, error: "missing_opinion" }, { status: 400 });

  // Homepage showcase galaxies are deterministic and never depend on external
  // AI/API availability. Free-form search continues below through the real
  // Zhihu + model pipeline.
  const demoOpinion = demoOpinionByTitle(title);
  if (demoOpinion) {
    const preset = getDemoLawPreset(demoOpinion.id);
    const law = preset ? findLaw(preset.lawId) : null;
    if (preset && law) {
      return NextResponse.json({
        ok: true,
        law,
        match: {
          confidence: preset.confidence,
          quality: quality(preset.confidence),
          mechanism: preset.mechanism,
          reason: preset.reason,
          mapping: preset.mapping,
          boundary: preset.boundary,
          source: "fallback",
          model: "authored-demo",
        },
      });
    }
  }

  const catalog = ALL_LAWS.map((law) => ({
    id: law.id,
    name: law.name,
    kind: law.kind,
    kindLabel: law.kindLabel,
    field: law.field,
    provenance: law.provenance,
    mechanism: law.mechanism,
    goodFor: law.goodFor,
    badFor: law.badFor,
  }));

  const user: AiMessage = {
    role: "user",
    content:
      `观点：${title}\n` +
      `说明：${summary || "无"}\n` +
      `代表性知乎回答摘录：\n${sources.length ? sources.map((s, i) => `[${i + 1}] ${s}`).join("\n") : "无"}\n\n` +
      `候选科学法则库：\n${JSON.stringify(catalog)}\n\n` +
      "请先判断现实机制，再匹配模型。输出：" +
      '{"selectedId":"只能是候选 id","confidence":0到1,"mechanism":"一句话概括这个现实观点的底层机制","reason":"为什么这个模型结构最接近，不超过90字","mapping":"模型中的关键结构如何对应到这个观点，不超过140字","boundary":"这个模型无法解释或不能推出什么，不超过100字"}',
  };

  const ai = await aiJsonWithProvider<MatchPayload>([SYSTEM, user]);
  const fallback = fallbackLaw(`${title} ${summary} ${sources.join(" ")}`);
  const selectedId = compact(ai?.value.selectedId, 80);
  const selectedLaw = findLaw(selectedId);
  const law = selectedLaw ?? findLaw(fallback.id)!;
  const confidenceRaw = Number(ai?.value.confidence);
  const confidence = selectedLaw && Number.isFinite(confidenceRaw)
    ? Math.max(0, Math.min(1, confidenceRaw))
    : fallback.confidence;

  return NextResponse.json({
    ok: true,
    law,
    match: {
      confidence,
      quality: quality(confidence),
      mechanism: compact(ai?.value.mechanism, 180) || law.mechanism,
      reason: compact(ai?.value.reason, 240) || `这条观点与“${law.mechanism}”存在结构相似性。`,
      mapping: compact(ai?.value.mapping, 360) || `这颗星球借用 ${law.name} 观察观点中的机制，而不是用模型替现实作决定。`,
      boundary: compact(ai?.value.boundary, 280) || "这个模型只提供结构视角，不能替代现实条件、个体差异、因果证据与价值判断。",
      source: ai ? "ai" : "fallback",
      model: ai?.model,
    },
  });
}
