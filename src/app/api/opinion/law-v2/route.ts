import { type NextRequest, NextResponse } from "next/server";
import { aiJsonWithProvider, type AiMessage } from "@/lib/opinion/ai-client";
import { LAW_CATALOG, getPlanetLaw } from "@/lib/opinion/law-catalog";
import { SCIENTIFIC_LAWS } from "@/lib/opinion/scientific-law-additions";
import { getDemoLawPreset } from "@/lib/cognitive-galaxy/demo";

export const runtime = "nodejs";

const ALL_LAWS = [...LAW_CATALOG, ...SCIENTIFIC_LAWS];
const findLaw = (id: string) => getPlanetLaw(id) ?? SCIENTIFIC_LAWS.find((law) => law.id === id) ?? null;

function compact(value: unknown, max = 320) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}
function quality(confidence: number) {
  return confidence >= 0.72 ? "strong" : confidence >= 0.48 ? "plausible" : "exploratory";
}

type RawMatch = {
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
    "你是观点星球的科学法则匹配器。候选只包含真实存在的数学、物理、化学、生物、信息、经济和决策科学公式/形式模型。" +
    "只能从候选中选择，不得发明、改写公式或虚构来源。先判断观点的底层机制，再按结构而非关键词匹配。" +
    "如果只有弱类比，confidence 必须低于 0.45。公式是解释器，不是人生结论的证明。只输出 JSON。",
};

const FALLBACKS: Array<[RegExp, string, number]> = [
  [/(饱和|收益递减|上限)/, "michaelis_menten", 0.70],
  [/(恢复|适应|趋近)/, "newton_cooling", 0.65],
  [/(扩散|梯度|迁移)/, "fick_diffusion", 0.65],
  [/(传播|接触率|群体采用)/, "sir", 0.67],
  [/(反应速率|条件敏感|非线性放大)/, "arrhenius", 0.68],
  [/(弹性|纠偏|恢复力)/, "hooke", 0.64],
  [/(样本|幸存|选择偏差)/, "selection_bias", 0.67],
  [/(证据|概率|反例|更新)/, "bayes", 0.66],
  [/(取舍|权衡|多个目标)/, "pareto", 0.65],
  [/(竞争|内卷|博弈)/, "nash", 0.64],
  [/(继续|停止|退出|辞职|读研)/, "optimal_stopping", 0.66],
  [/(长期|未来|路径|机会)/, "bellman", 0.63],
  [/(临界|阈值|失稳|崩溃)/, "saddle_node", 0.64],
  [/(不确定|未知|信息量)/, "entropy", 0.61],
  [/(排队|积压|等待|拥堵)/, "little_law", 0.65],
  [/(积累|复利|滚雪球)/, "exponential", 0.63],
];

function fallbackLaw(text: string) {
  const hit = FALLBACKS.find(([pattern]) => pattern.test(text));
  return hit ? { id: hit[1], confidence: hit[2] } : { id: "bellman", confidence: 0.36 };
}

function fallbackMatch(law: PlanetLawDefinitionLike, confidence: number, model: string) {
  return {
    confidence,
    quality: quality(confidence),
    mechanism: law.mechanism,
    reason: `这条观点与“${law.mechanism}”存在可解释的结构相似性。`,
    mapping: `借用 ${law.name} 观察观点中的条件、边界与变化关系，而不是把科学量直接替换成人生变量。`,
    boundary: "这是结构类比，不是因果证明；模型不能替代现实条件、个体差异与真实证据。",
    source: "fallback" as const,
    model,
  };
}

type PlanetLawDefinitionLike = (typeof ALL_LAWS)[number];

export async function POST(request: NextRequest) {
  let body: { opinionId?: unknown; title?: unknown; summary?: unknown; sources?: unknown; demo?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const opinionId = compact(body.opinionId, 120);
  const title = compact(body.title, 180);
  const summary = compact(body.summary, 420);
  const sources = Array.isArray(body.sources)
    ? body.sources.map((item) => compact(item, 520)).filter(Boolean).slice(0, 5)
    : [];
  const demo = body.demo === true;
  if (!title) return NextResponse.json({ ok: false, error: "missing_opinion" }, { status: 400 });

  if (demo) {
    if (!opinionId) return NextResponse.json({ ok: false, error: "missing_demo_opinion_id" }, { status: 400 });
    const preset = getDemoLawPreset(opinionId);
    const curatedLaw = preset ? findLaw(preset.lawId) : null;
    if (preset && curatedLaw) {
      return NextResponse.json({
        ok: true,
        law: curatedLaw,
        match: {
          ...preset,
          quality: quality(preset.confidence),
          source: "fallback",
          model: "authored-demo",
        },
      });
    }

    // Fusion/fork planets are created during a demo session and therefore do
    // not exist in the authored preset table. Keep the demo complete offline
    // by using the same deterministic structural fallback instead of calling AI.
    const fallback = fallbackLaw(`${title} ${summary}`);
    const fallbackModel = findLaw(fallback.id) ?? findLaw("bellman")!;
    return NextResponse.json({
      ok: true,
      law: fallbackModel,
      match: fallbackMatch(fallbackModel, Math.max(0.52, fallback.confidence), "evolved-demo"),
    });
  }

  const catalog = ALL_LAWS.map(({ id, name, field, provenance, mechanism, goodFor, badFor }) => ({
    id, name, field, provenance, mechanism, goodFor, badFor,
  }));
  const user: AiMessage = {
    role: "user",
    content:
      `观点：${title}\n说明：${summary || "无"}\n真实知乎回答摘录：\n${sources.length ? sources.map((source, index) => `[${index + 1}] ${source}`).join("\n") : "无"}\n\n` +
      `候选科学法则：${JSON.stringify(catalog)}\n\n` +
      '输出 {"selectedId":"候选id","confidence":0到1,"mechanism":"现实机制","reason":"结构匹配理由","mapping":"结构对应","boundary":"模型边界"}',
  };
  const ai = await aiJsonWithProvider<RawMatch>([SYSTEM, user]);
  const fallback = fallbackLaw(`${title} ${summary} ${sources.join(" ")}`);
  const selectedLaw = findLaw(compact(ai?.value.selectedId, 80));
  const law = selectedLaw ?? findLaw(fallback.id)!;
  const rawConfidence = Number(ai?.value.confidence);
  const confidence = selectedLaw && Number.isFinite(rawConfidence)
    ? Math.max(0, Math.min(1, rawConfidence))
    : fallback.confidence;

  return NextResponse.json({
    ok: true,
    law,
    match: {
      confidence,
      quality: quality(confidence),
      mechanism: compact(ai?.value.mechanism, 180) || law.mechanism,
      reason: compact(ai?.value.reason, 240) || `这条观点与“${law.mechanism}”存在结构相似性。`,
      mapping: compact(ai?.value.mapping, 360) || `借用 ${law.name} 观察观点中的变化结构。`,
      boundary: compact(ai?.value.boundary, 280) || "模型只提供结构视角，不能替代现实条件、个体差异、因果证据与价值判断。",
      source: ai ? "ai" : "fallback",
      model: ai?.model,
    },
  });
}
