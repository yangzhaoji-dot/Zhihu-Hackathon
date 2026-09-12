import "server-only";

import type { DialogueLine, Opinion, OpinionGraph, OpinionSource, WorldDialogueReply } from "./types";
import { aiJson, type AiMessage } from "./ai-client";
import { validateDialogueLines } from "./dialogue/validate";
import { getOpinionGraph } from "./store";

export type PlanetDialogueTrigger = "inspect-claim" | "inspect-reason" | "inspect-evidence";

export interface PlanetDialogueHistoryLine {
  speaker: string;
  text: string;
}

export interface ComposePlanetDialogueInput {
  questionId: string;
  opinionId: string;
  trigger: PlanetDialogueTrigger;
  locale: string;
  history: PlanetDialogueHistoryLine[];
  worldState?: Record<string, unknown>;
}

const SYSTEM: AiMessage = {
  role: "system",
  content:
    "你是知乎观点宇宙中的引导角色刘看山。玩家正在探索一颗只代表一条具体观点的星球。" +
    "你的职责是先让玩家观察、猜测和提问，再帮助玩家回到原观点与来源；不要替玩家判断观点正确与否。" +
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

function fallback(
  opinion: Opinion,
  sources: OpinionSource[],
  locale: string,
  trigger: PlanetDialogueTrigger,
): DialogueLine[] {
  const zh = locale !== "en-US";
  if (!zh) return fallbackEnglish(opinion, sources, trigger);

  if (trigger === "inspect-claim") {
    return [
      { speaker: "guide", text: `先别急着看答案。你觉得这个地方为什么会围绕「${opinion.title}」形成？` },
      { speaker: "guide", text: `当前材料里能确认的主张是：${opinion.claim || opinion.title}` },
      { speaker: "guide", text: "先记住它在主张什么；是否赞同，留到看完理由和依据以后再说。" },
    ];
  }

  if (trigger === "inspect-reason") {
    return [
      { speaker: "guide", text: "如果这里是一台会改变路线的装置，你觉得让它运转的条件会是什么？" },
      {
        speaker: "guide",
        text: opinion.reason
          ? `材料里明确留下的理由是：${opinion.reason}`
          : "目前材料没有留下完整理由，所以这台装置有一部分仍然是空的。",
      },
      ...(opinion.conditions?.length
        ? [{ speaker: "guide" as const, text: `它还依赖这些条件：${opinion.conditions.join("；")}` }]
        : []),
      {
        speaker: "guide",
        text: "现在你已经知道它为什么会这样判断了。把这部分理解带走，而不是把它当成正确答案。",
        actions: [{ type: "collect-opinion", opinionId: opinion.id }],
      },
    ];
  }

  if (sources[0]) {
    return [
      { speaker: "guide", text: "这里不是结论，而是一处可以回到原文的痕迹。你觉得一段经历最多能支撑多大的结论？" },
      {
        speaker: "guide",
        text: "先打开这份原文，再决定它能支撑观点里的哪一部分。",
        actions: [{ type: "show-source", sourceId: sources[0].id }],
      },
      { speaker: "guide", text: "读过来源以后，仍然看不见的地方就应该继续留在雾里。" },
    ];
  }

  return [
    { speaker: "guide", text: "你找到的是一个空档案位。它没有原文，不代表观点是错的，只代表这一块目前无法核对。" },
    { speaker: "guide", text: "把“缺少可追溯来源”本身记下来。理解缺口，也是理解这颗星球的一部分。" },
  ];
}

function fallbackEnglish(opinion: Opinion, sources: OpinionSource[], trigger: PlanetDialogueTrigger): DialogueLine[] {
  if (trigger === "inspect-claim") {
    return [
      { speaker: "guide", text: `Before judging it, ask why this place formed around “${opinion.title}”.` },
      { speaker: "guide", text: `The supplied claim is: ${opinion.claim || opinion.title}` },
      { speaker: "guide", text: "Remember what it claims. Agreement can wait until you inspect its reasons and evidence." },
    ];
  }
  if (trigger === "inspect-reason") {
    return [
      { speaker: "guide", text: "If this device changes the route, what condition do you think makes it move?" },
      { speaker: "guide", text: opinion.reason ? `The supplied reason is: ${opinion.reason}` : "The supplied material does not contain a complete reason." },
      { speaker: "guide", text: "Take away the reasoning, not a verdict.", actions: [{ type: "collect-opinion", opinionId: opinion.id }] },
    ];
  }
  if (sources[0]) {
    return [
      { speaker: "guide", text: "This is a trace back to source material, not a conclusion." },
      { speaker: "guide", text: "Read the excerpt before deciding what it can support.", actions: [{ type: "show-source", sourceId: sources[0].id }] },
    ];
  }
  return [
    { speaker: "guide", text: "This archive slot is empty. That does not refute the claim; it means this part cannot currently be traced." },
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

function taskFor(trigger: PlanetDialogueTrigger) {
  switch (trigger) {
    case "inspect-claim":
      return "玩家正在观察代表核心主张的场景。第一行提出‘为什么这里会这样’一类观察问题；随后只澄清主张本身。不要给 collect-opinion 或 show-source。";
    case "inspect-reason":
      return "玩家正在操作或观察代表理由/条件的装置。先问哪个条件会改变结果，再解释已有理由。最后给一次 collect-opinion，它在地表代表获得理由碎片。";
    case "inspect-evidence":
      return "玩家正在调查档案/痕迹。先问‘这份材料最多能支撑什么’，若存在来源则给一次 show-source；若不存在，明确指出依据缺失。不要给 collect-opinion。";
  }
}

export async function composePlanetDialogue(input: ComposePlanetDialogueInput): Promise<WorldDialogueReply | null> {
  const resolved = resolvePlanet(input.questionId, input.opinionId);
  if (!resolved) return null;
  const { graph, opinion, sources } = resolved;
  const zh = input.locale !== "en-US";
  const fallbackLines = fallback(opinion, sources, input.locale, input.trigger);

  const result = await aiJson<{ lines?: unknown }>([
    SYSTEM,
    {
      role: "user",
      content:
        `问题：${graph.questionTitle}\n` +
        `${materialText(opinion, sources)}\n` +
        `${fragmentState(input.worldState, opinion.id)}\n\n` +
        `历史：\n${safeHistory(input.history) || "（无）"}\n\n` +
        `${taskFor(input.trigger)}\n` +
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

  const invalid = lines.some((line) => {
    if (line.speaker !== "guide") return true;
    return line.actions?.some((action) => {
      if (action.type === "open-compare" || action.type === "open-stance") return true;
      if (input.trigger === "inspect-claim") return action.type === "collect-opinion" || action.type === "show-source";
      if (input.trigger === "inspect-reason") return action.type === "show-source";
      return action.type === "collect-opinion";
    });
  });
  if (invalid) return { lines: fallbackLines, source: "fallback" };
  return { lines, source: "ai" };
}
