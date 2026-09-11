import "server-only";

import type { DialogueLine, Opinion, OpinionGraph, OpinionSource, WorldDialogueReply } from "./types";
import { aiJson, type AiMessage } from "./ai-client";
import { validateDialogueLines } from "./dialogue/validate";
import { getOpinionGraph } from "./store";

export interface PlanetDialogueHistoryLine {
  speaker: string;
  text: string;
}

export interface ComposePlanetDialogueInput {
  questionId: string;
  opinionId: string;
  locale: string;
  history: PlanetDialogueHistoryLine[];
  worldState?: Record<string, unknown>;
}

const SYSTEM: AiMessage = {
  role: "system",
  content:
    "你是知乎观点宇宙中的引导角色刘看山。玩家正在探索一颗只代表一条具体观点的星球。" +
    "你的职责是先引导观察和思考，再帮助玩家回到原观点与来源；不要替玩家判断观点正确与否。" +
    "铁律：只能使用注入材料中已有的主张、理由、条件和来源摘录；禁止新增人物、数据、案例或引用。" +
    "场景隐喻只是解释方式，不得当作事实。缺少的材料必须明确说不知道。只输出规范 JSON。",
};

function materialText(opinion: Opinion, sources: OpinionSource[]) {
  const parts = [
    `观点标题：${opinion.title}`,
    opinion.claim ? `主张：${opinion.claim}` : null,
    opinion.summary ? `摘要：${opinion.summary}` : null,
    opinion.reason ? `理由：${opinion.reason}` : null,
    opinion.conditions?.length ? `成立条件：${opinion.conditions.join("；")}` : null,
    `观点类型：${opinion.kind === "ai" ? "AI 推演观点" : "真人观点"}`,
    `允许引用的来源：${sources.length ? sources.map((source) => `${source.id}「${source.excerpt}」`).join("；") : "无"}`,
  ];
  return parts.filter(Boolean).join("\n");
}

function safeHistory(history: PlanetDialogueHistoryLine[]) {
  return history
    .slice(-8)
    .map((line) => `${line.speaker === "player" ? "玩家" : "看山"}：${line.text.slice(0, 200)}`)
    .join("\n");
}

function fragmentState(worldState: Record<string, unknown> | undefined, opinionId: string) {
  const has = (kind: string) => Boolean(worldState?.[`fragment:${opinionId}:${kind}`]);
  return `当前已获得碎片：主张=${has("claim") ? "是" : "否"}，理由=${has("reason") ? "是" : "否"}，依据=${has("evidence") ? "是" : "否"}。`;
}

function fallback(opinion: Opinion, sources: OpinionSource[], locale: string): DialogueLine[] {
  const zh = locale !== "en-US";
  if (!zh) {
    return [
      { speaker: "guide", text: `Look at this place first. This planet formed around one claim: “${opinion.title}”.` },
      { speaker: "guide", text: opinion.reason ? `The supplied reason is: ${opinion.reason}` : "The supplied material does not yet contain a complete reason." },
      ...(sources[0]
        ? [{ speaker: "guide" as const, text: "There is an original excerpt here. Read it before deciding how much the claim can support.", actions: [{ type: "show-source" as const, sourceId: sources[0].id }] }]
        : [{ speaker: "guide" as const, text: "No traceable original excerpt is currently attached, so this part stays unresolved." }]),
      { speaker: "guide", text: "What condition would have to change before you stopped applying this claim?", actions: [{ type: "collect-opinion", opinionId: opinion.id }] },
    ];
  }
  return [
    { speaker: "guide", text: `先看看这里。整颗星球只围绕一条观点形成：「${opinion.title}」。你觉得眼前的环境最想提醒你什么？` },
    { speaker: "guide", text: opinion.reason ? `材料里明确留下的理由是：${opinion.reason}` : "目前材料没有留下完整理由，这一块先不要替它补齐。" },
    ...(sources[0]
      ? [{ speaker: "guide" as const, text: "这里还留着一份原文。先读它，再判断这条经历究竟能支撑多大的结论。", actions: [{ type: "show-source" as const, sourceId: sources[0].id }] }]
      : [{ speaker: "guide" as const, text: "目前没有能回到原文的来源，所以依据这一块仍然应该留在雾里。" }]),
    { speaker: "guide", text: "最后想一个问题：什么条件一旦改变，你就不会再把这条观点直接套用到那个情境？", actions: [{ type: "collect-opinion", opinionId: opinion.id }] },
  ];
}

function resolvePlanet(questionId: string, opinionId: string): { graph: OpinionGraph; opinion: Opinion; sources: OpinionSource[] } | null {
  const graph = getOpinionGraph(questionId);
  if (!graph) return null;
  const opinion = graph.opinions.find((candidate) => candidate.id === opinionId);
  if (!opinion) return null;
  const sources = graph.sources.filter((source) => opinion.sourceIds.includes(source.id));
  return { graph, opinion, sources };
}

export async function composePlanetDialogue(input: ComposePlanetDialogueInput): Promise<WorldDialogueReply | null> {
  const resolved = resolvePlanet(input.questionId, input.opinionId);
  if (!resolved) return null;
  const { graph, opinion, sources } = resolved;
  const zh = input.locale !== "en-US";
  const fallbackLines = fallback(opinion, sources, input.locale);

  const result = await aiJson<{ lines?: unknown }>([
    SYSTEM,
    {
      role: "user",
      content:
        `问题：${graph.questionTitle}\n` +
        `${materialText(opinion, sources)}\n` +
        `${fragmentState(input.worldState, opinion.id)}\n\n` +
        `历史：\n${safeHistory(input.history) || "（无）"}\n\n` +
        "玩家刚刚主动调查了这颗观点星球上的一个环境物件。请以刘看山的身份续写 2-4 行。" +
        "第一行优先提出一个与眼前观点有关、可以继续观察的问题；随后只用提供的材料解释。" +
        "如果存在来源，至少给一次 show-source；最后可以给 collect-opinion 动作，它在地表表示获得‘理由碎片’，不是收集第二条观点。" +
        `动作白名单：show-source 仅限 [${sources.map((source) => source.id).join(", ") || "无"}]；collect-opinion 仅限 [${opinion.id}]；禁止 open-compare / open-stance。` +
        "输出严格 JSON：{\"lines\":[{\"speaker\":\"guide\",\"text\":\"…\",\"actions\":[…]}]}。" +
        (zh ? "语言：中文。" : "Language: English."),
    },
  ]);

  const lines = validateDialogueLines(result, {
    sourceIds: new Set(sources.map((source) => source.id)),
    opinionIds: new Set([opinion.id]),
    maxLines: 4,
  });
  if (!lines) return { lines: fallbackLines, source: "fallback" };
  if (lines.some((line) => line.speaker !== "guide" || line.actions?.some((action) => action.type === "open-compare" || action.type === "open-stance"))) {
    return { lines: fallbackLines, source: "fallback" };
  }
  return { lines, source: "ai" };
}
