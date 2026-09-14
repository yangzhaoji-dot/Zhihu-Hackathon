import { type NextRequest, NextResponse } from "next/server";
import { aiJsonWithProvider, type AiMessage } from "@/lib/opinion/ai-client";
import { LAW_CATALOG, getPlanetLaw } from "@/lib/opinion/law-catalog";

export const runtime = "nodejs";

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
    "你是观点星球的法则匹配器。你只能从给定的真实数学法则库中选择，不得发明公式、修改公式或声称公式能够证明人生结论。" +
    "先识别观点的底层机制，再选结构最接近的数学法则。关键词相似不是充分理由。若匹配较弱，应降低 confidence。只输出 JSON。",
};

function compact(value: unknown, max = 320) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function fallbackLaw(text: string) {
  const rules: Array<[RegExp, string]> = [
    [/(证据|信息|相信|判断|概率|反例|更新)/, "bayes"],
    [/(高薪|轻松|取舍|兼顾|权衡|平衡|多个目标|代价)/, "pareto"],
    [/(内卷|竞争|大家都|没人先|博弈|互相|对手)/, "nash"],
    [/(什么时候|何时|继续|停止|退出|辞职|offer|读研|考研)/, "optimal_stopping"],
    [/(长期|未来|路径|后续|机会|规划|选择空间)/, "bellman"],
    [/(临界|撑不住|恢复|崩溃|阈值|失稳|耗尽)/, "saddle_node"],
    [/(平台期|饱和|上限|边际|收益递减)/, "logistic"],
    [/(不确定|混乱|未知|信息量)/, "entropy"],
    [/(排队|积压|拥堵|等待|任务堆积)/, "little_law"],
    [/(复利|积累|长期主义|习惯|差距扩大)/, "exponential"],
  ];
  for (const [pattern, id] of rules) if (pattern.test(text)) return id;
  return "bellman";
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

  const catalog = LAW_CATALOG.map((law) => ({
    id: law.id,
    name: law.name,
    field: law.field,
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
      `候选法则库：\n${JSON.stringify(catalog)}\n\n` +
      "请输出：" +
      '{"selectedId":"只能是候选 id","confidence":0到1,"mechanism":"先用一句话概括现实机制","reason":"为什么这个数学结构最接近，不超过80字","mapping":"数学结构与观点的对应关系，不超过120字","boundary":"这条法则不能说明什么，不超过90字"}',
  };

  const ai = await aiJsonWithProvider<MatchPayload>([SYSTEM, user]);
  const fallbackId = fallbackLaw(`${title} ${summary} ${sources.join(" ")}`);
  const selectedId = compact(ai?.value.selectedId, 80);
  const law = getPlanetLaw(selectedId) ?? getPlanetLaw(fallbackId)!;
  const confidenceRaw = Number(ai?.value.confidence);
  const confidence = Number.isFinite(confidenceRaw)
    ? Math.max(0, Math.min(1, confidenceRaw))
    : 0.62;

  return NextResponse.json({
    ok: true,
    law,
    match: {
      confidence,
      mechanism: compact(ai?.value.mechanism, 160) || law.mechanism,
      reason: compact(ai?.value.reason, 220) || `这条观点最接近“${law.mechanism}”这一结构。`,
      mapping: compact(ai?.value.mapping, 320) || `这颗星球借用 ${law.name} 的结构来观察观点，而不是用公式替现实作决定。`,
      boundary: compact(ai?.value.boundary, 240) || `数学模型只提供结构化视角，不能替代现实条件、个体差异与具体证据。`,
      source: ai ? "ai" : "fallback",
      model: ai?.model,
    },
  });
}
