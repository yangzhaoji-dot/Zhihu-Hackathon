import type { CognitionFragmentSpec } from "@/lib/world/cognition-fragment-plan";
import type { CarrierInteractionDefinition } from "@/lib/world/carrier-interactions";

export interface KanshanChoice {
  id: string;
  label: { "zh-CN": string; "en-US": string };
  response?: { "zh-CN": string; "en-US": string };
}

export interface KanshanPrompt {
  id: string;
  line: { "zh-CN": string; "en-US": string };
  choices?: KanshanChoice[];
}

const MODE_QUESTIONS: Record<CognitionFragmentSpec["mode"], { "zh-CN": string; "en-US": string }> = {
  observe: { "zh-CN": "先别碰它。你第一眼觉得这里最不对劲的地方是什么？", "en-US": "Don't touch it yet. What feels most unusual at first glance?" },
  experiment: { "zh-CN": "如果只允许你改变一个前提，你觉得哪一处会先发生变化？", "en-US": "If you could change one assumption, what would shift first?" },
  trace: { "zh-CN": "我们现在看到的是结论，还是能一路追到原文的痕迹？", "en-US": "Are we looking at a conclusion, or a trace that really reaches the source?" },
  compare: { "zh-CN": "这两边真的互相冲突，还是只是站在不同条件下说话？", "en-US": "Do these sides really conflict, or are they speaking under different conditions?" },
  navigate: { "zh-CN": "远处有灯，但灯本身算不算证据？我们要不要真的走过去？", "en-US": "There is a light in the distance. Is the light itself evidence, or do we need to reach it?" },
  restore: { "zh-CN": "残骸能告诉我们发生过什么，但它能直接告诉我们为什么吗？", "en-US": "A ruin tells us something happened. Can it tell us why by itself?" },
  listen: { "zh-CN": "这里没有机关。你觉得这条观点真正想保护的是什么？", "en-US": "There is no mechanism here. What do you think this opinion is trying to protect?" },
};

/**
 * Liu Kanshan frames the carrier before interaction. Choices are hypotheses or
 * actions, never graded answers. The player's choice changes Kanshan's response
 * but never gates access to the carrier.
 */
export function buildKanshanCarrierPrompts(
  fragment: CognitionFragmentSpec,
  interaction: CarrierInteractionDefinition,
): KanshanPrompt[] {
  const question = MODE_QUESTIONS[fragment.mode];
  return [
    {
      id: "notice",
      line: {
        "zh-CN": `看这里，${fragment.carrier}。${question["zh-CN"]}`,
        "en-US": `Look at the ${fragment.carrier}. ${question["en-US"]}`,
      },
      choices: [
        {
          id: "guess",
          label: { "zh-CN": "我先猜一猜", "en-US": "I want to make a guess" },
          response: {
            "zh-CN": "可以。先把这个猜测留在心里，看看接下来的实物会不会支持它。",
            "en-US": "Good. Keep that guess provisional and see whether the carrier actually supports it.",
          },
        },
        {
          id: "inspect",
          label: { "zh-CN": "先让我调查它", "en-US": "Let me investigate first" },
          response: {
            "zh-CN": "好。先让眼前的结构和留下来的材料自己说话。",
            "en-US": "Good. Let the structure and surviving material speak before you decide.",
          },
        },
        {
          id: "unknown",
          label: { "zh-CN": "我还看不出来", "en-US": "I can't tell yet" },
          response: {
            "zh-CN": "看不出来也很重要。先把未知保留下来，不用急着填一个答案。",
            "en-US": "Not knowing yet matters. Keep the unknown intact instead of filling it with an answer.",
          },
        },
      ],
    },
    {
      id: "action",
      line: {
        "zh-CN": `那就按照这个载体自己的方式去读它：${interaction.steps[0]?.prompt["zh-CN"] ?? fragment.intent}`,
        "en-US": `Then read this carrier on its own terms: ${interaction.steps[0]?.prompt["en-US"] ?? fragment.intent}`,
      },
    },
  ];
}

export function buildKanshanCompletionLine(
  fragment: CognitionFragmentSpec,
  interaction: CarrierInteractionDefinition,
) {
  return {
    "zh-CN": `${interaction.completionLine["zh-CN"]} 现在，这段认知可以从载体里析出成一枚碎片。`,
    "en-US": `${interaction.completionLine["en-US"]} This cognition can now distill out of its carrier as a shard.`,
  };
}
