import type { Opinion, OpinionSource } from "@/lib/opinion/types";
import type { CognitionFragmentSpec } from "@/lib/world/cognition-fragment-plan";

export type CarrierActionKind =
  | "inspect"
  | "toggle"
  | "align"
  | "follow"
  | "restore"
  | "listen"
  | "open-source"
  | "choose";

export interface CarrierChoice {
  id: string;
  label: { "zh-CN": string; "en-US": string };
  feedback?: { "zh-CN": string; "en-US": string };
  grounded?: boolean;
}

export interface CarrierInteractionStep {
  id: string;
  action: CarrierActionKind;
  prompt: { "zh-CN": string; "en-US": string };
  reveal?: string;
  sourceId?: string;
  sourceExcerpt?: string;
  sourceUrl?: string;
  sourceUpvotes?: number;
  comparisonExcerpts?: [string, string];
  choiceMode?: "grounded" | "interpretive";
  choices?: CarrierChoice[];
}

export interface CarrierInteractionDefinition {
  fragmentId: string;
  carrier: string;
  mode: CognitionFragmentSpec["mode"];
  steps: CarrierInteractionStep[];
  completionLine: { "zh-CN": string; "en-US": string };
}

function valueOrGap(value: string | undefined, zhGap: string, enGap: string) {
  return value?.trim() || `${zhGap} / ${enGap}`;
}

function sourceReadingSteps(source: OpinionSource, index: number): CarrierInteractionStep[] {
  return [
    {
      id: `source-${index}`,
      action: "open-source",
      sourceId: source.id,
      sourceExcerpt: source.excerpt,
      sourceUrl: source.url,
      sourceUpvotes: source.upvotes,
      prompt: {
        "zh-CN": `打开第 ${index + 1} 份知乎原文片段，先完整读一遍。`,
        "en-US": `Open Zhihu source excerpt ${index + 1} and read it once before judging it.`,
      },
      reveal: source.excerpt,
    },
    {
      id: `source-grounding-${index}`,
      action: "choose",
      choiceMode: "grounded",
      prompt: {
        "zh-CN": "只根据刚才那段原文，下面哪种说法最谨慎？",
        "en-US": "Based only on that excerpt, which statement is the most careful?",
      },
      choices: [
        {
          id: "traceable-support",
          grounded: true,
          label: {
            "zh-CN": "它是支持当前观点的一份可追溯材料",
            "en-US": "It is a traceable piece of material supporting the current opinion",
          },
          feedback: {
            "zh-CN": "对。先确认它确实存在、确实可追溯，再讨论它能支持多远。",
            "en-US": "Yes. First establish that the material exists and is traceable; scope comes later.",
          },
        },
        {
          id: "universal-proof",
          label: {
            "zh-CN": "它已经证明这个观点对所有人都成立",
            "en-US": "It already proves the opinion applies to everyone",
          },
          feedback: {
            "zh-CN": "这一步跨得太远。单个原文片段可以提供支撑，但不能自动变成普遍证明。",
            "en-US": "That goes too far. A source excerpt can support a claim without proving universal validity.",
          },
        },
        {
          id: "ai-generated",
          label: {
            "zh-CN": "它只是 AI 为这个星球生成的解释",
            "en-US": "It is only an AI-generated explanation for this planet",
          },
          feedback: {
            "zh-CN": "不是。这一段来自绑定到该观点的知乎来源；系统总结和 AI 推演必须与原文分开。",
            "en-US": "No. This excerpt comes from the Zhihu source bound to the opinion; summaries and AI inference are separate.",
          },
        },
      ],
    },
  ];
}

function sourceComparisonStep(sources: readonly OpinionSource[]): CarrierInteractionStep[] {
  if (sources.length < 2) return [];
  const [first, second] = sources;
  return [{
    id: "source-comparison",
    action: "choose",
    choiceMode: "grounded",
    comparisonExcerpts: [first.excerpt, second.excerpt],
    prompt: {
      "zh-CN": "把两段原文放在一起看：它们共同能够支持的、最谨慎的判断是什么？",
      "en-US": "Read both excerpts together. What is the most careful conclusion they jointly support?",
    },
    choices: [
      {
        id: "shared-cost",
        grounded: true,
        label: {
          "zh-CN": "持续消耗身心的环境本身也有成本，离开可能是一种止损",
          "en-US": "A persistently harmful environment has a cost, so leaving can function as damage control",
        },
        feedback: {
          "zh-CN": "对。两段材料都指向‘继续承受也有成本’，但它们仍不足以证明所有人都应该裸辞。",
          "en-US": "Yes. Both point to a cost of staying, without proving that everyone should resign without another job.",
        },
      },
      {
        id: "always-resign",
        label: {
          "zh-CN": "只要工作难受，就应该立刻裸辞",
          "en-US": "Whenever work feels bad, one should resign immediately",
        },
        feedback: {
          "zh-CN": "原文没有支持这么强的外推。它们讲的是严重、持续的消耗，不是任何不舒服都等于必须离开。",
          "en-US": "The sources do not support that broad generalization; they describe serious, sustained harm.",
        },
      },
      {
        id: "no-relation",
        label: {
          "zh-CN": "两段原文与当前观点没有关系",
          "en-US": "The two excerpts are unrelated to the current opinion",
        },
        feedback: {
          "zh-CN": "它们至少都提供了与身心消耗有关的直接经历或观察，因此不能说完全无关。",
          "en-US": "Both contain direct experience or observation about sustained harm, so they are not unrelated.",
        },
      },
    ],
  }];
}

/**
 * The carrier is the physical/ambient object in the world. A cognition shard
 * only appears AFTER the player completes this sequence.
 */
export function buildCarrierInteraction(
  fragment: CognitionFragmentSpec,
  opinion: Pick<Opinion, "claim" | "title" | "reason" | "conditions" | "sourceIds" | "evidence">,
  sources: readonly OpinionSource[],
): CarrierInteractionDefinition {
  const claim = opinion.claim?.trim() || opinion.title;
  const reason = valueOrGap(opinion.reason, "理由没有完整留下", "the reason was not fully preserved");
  const conditions = opinion.conditions?.filter(Boolean) ?? [];
  const boundSources = sources.filter((source) => opinion.sourceIds.includes(source.id));

  switch (fragment.mode) {
    case "observe":
      return {
        fragmentId: fragment.id,
        carrier: fragment.carrier,
        mode: fragment.mode,
        steps: [
          { id: "shape", action: "inspect", prompt: { "zh-CN": `绕着「${fragment.carrier}」看一圈，先不要点开文字。`, "en-US": `Walk around the ${fragment.carrier} before reading anything.` } },
          { id: "detail", action: "inspect", prompt: { "zh-CN": "找出两个最反常的细节。", "en-US": "Notice two details that feel out of place." } },
          { id: "meaning", action: "choose", prompt: { "zh-CN": "再看看它留下的认知。", "en-US": "Now read the cognition it carries." }, reveal: fragment.id === "claim" ? claim : reason },
        ],
        completionLine: { "zh-CN": "你不是捡到了一块道具，而是从这个载体里读出了一段认知。", "en-US": "You did not pick up an item; you recovered cognition from its carrier." },
      };

    case "experiment":
      return {
        fragmentId: fragment.id,
        carrier: fragment.carrier,
        mode: fragment.mode,
        steps: [
          { id: "baseline", action: "inspect", prompt: { "zh-CN": "先观察装置现在通向哪里。", "en-US": "Observe where the mechanism leads before changing it." } },
          ...(conditions.length ? conditions.slice(0, 3).map((condition, index) => ({
            id: `condition-${index}`,
            action: "toggle" as const,
            prompt: { "zh-CN": `切换前提：${condition}`, "en-US": `Toggle assumption: ${condition}` },
            reveal: condition,
          })) : [{ id: "gap", action: "toggle" as const, prompt: { "zh-CN": "这里没有留下明确条件。试着拨动空档位，确认它确实是一个缺口。", "en-US": "No explicit condition survives here. Move the empty control and confirm the gap." } }]),
          { id: "relation", action: "choose", prompt: { "zh-CN": "哪些前提真正改变了这条路线？", "en-US": "Which assumptions actually changed the route?" }, reveal: reason },
        ],
        completionLine: { "zh-CN": "你恢复的是条件与判断之间的关系，不是现实结果的预测。", "en-US": "You recovered a relationship between assumptions and judgment, not a real-world prediction." },
      };

    case "trace": {
      const readableSources = boundSources.slice(0, 2);
      return {
        fragmentId: fragment.id,
        carrier: fragment.carrier,
        mode: fragment.mode,
        steps: readableSources.length
          ? [
              ...readableSources.flatMap(sourceReadingSteps),
              ...sourceComparisonStep(readableSources),
              {
                id: "source-interpretation",
                action: "choose" as const,
                choiceMode: "interpretive" as const,
                prompt: {
                  "zh-CN": "读完并对照这些原文后，你暂时会把它们放在什么位置？",
                  "en-US": "After reading and comparing the sources, how would you provisionally place them?",
                },
                choices: [
                  {
                    id: "support",
                    label: { "zh-CN": "它们为当前观点提供了明显支撑", "en-US": "They provide meaningful support for the opinion" },
                    feedback: { "zh-CN": "这是你的当前判断。继续保留条件与反例的位置。", "en-US": "That is your current reading. Keep conditions and counterexamples open." },
                  },
                  {
                    id: "partial",
                    label: { "zh-CN": "它们提供了一部分支撑，但还不足以外推", "en-US": "They provide partial support, but not enough to generalize" },
                    feedback: { "zh-CN": "这是一个较保守的阅读方式：承认材料，同时保留适用边界。", "en-US": "This is a conservative reading: recognize the material while preserving scope limits." },
                  },
                  {
                    id: "uncertain",
                    label: { "zh-CN": "我还无法判断，需要更多材料", "en-US": "I still cannot tell; I need more material" },
                    feedback: { "zh-CN": "可以。未知本身也可以被保留下来。", "en-US": "That is valid. Uncertainty can remain unresolved." },
                  },
                ],
              },
            ]
          : [{ id: "missing-source", action: "inspect", prompt: { "zh-CN": "检查这个空档案位：没有原文可以继续追。", "en-US": "Inspect the empty archive slot: no original source can be traced." } }],
        completionLine: { "zh-CN": "你先读到了原文，再比较它们共同能支持什么，最后才决定证据能走多远。", "en-US": "You read the sources, compared what they jointly support, and only then judged how far the evidence reaches." },
      };
    }

    case "compare":
      return {
        fragmentId: fragment.id,
        carrier: fragment.carrier,
        mode: fragment.mode,
        steps: [
          { id: "left", action: "align", prompt: { "zh-CN": "把主张放到一侧。", "en-US": "Place the claim on one side." }, reveal: claim },
          { id: "right", action: "align", prompt: { "zh-CN": "把理由或条件放到另一侧。", "en-US": "Place the reason or condition on the other side." }, reveal: conditions[0] || reason },
          { id: "relation", action: "choose", prompt: { "zh-CN": "它们是支撑、限定，还是仍然无法判断？", "en-US": "Do they support, constrain, or still fail to determine each other?" } },
        ],
        completionLine: { "zh-CN": "对照让关系可见，但不会替你宣布结论。", "en-US": "Comparison exposes a relation without declaring a verdict." },
      };

    case "navigate":
      return {
        fragmentId: fragment.id,
        carrier: fragment.carrier,
        mode: fragment.mode,
        steps: [0, 1, 2].map((index) => ({
          id: `beacon-${index}`,
          action: "follow" as const,
          prompt: { "zh-CN": `跟随第 ${index + 1} 个信标。`, "en-US": `Follow beacon ${index + 1}.` },
          reveal: index === 2 ? (boundSources[0]?.excerpt || "") : undefined,
        })),
        completionLine: { "zh-CN": "你沿航线抵达了材料，而不是只看到了远处的灯。", "en-US": "You reached the material along a route instead of mistaking a distant light for evidence." },
      };

    case "restore":
      return {
        fragmentId: fragment.id,
        carrier: fragment.carrier,
        mode: fragment.mode,
        steps: [
          { id: "piece-a", action: "restore", prompt: { "zh-CN": "复原第一块遗留结构。", "en-US": "Restore the first surviving piece." }, reveal: claim },
          { id: "piece-b", action: "restore", prompt: { "zh-CN": "复原第二块，但不要填补不存在的部分。", "en-US": "Restore the second piece without inventing what is missing." }, reveal: reason },
          { id: "gap", action: "inspect", prompt: { "zh-CN": "指出仍然断裂的位置。", "en-US": "Mark the part that still remains broken." } },
        ],
        completionLine: { "zh-CN": "复原不是补全；缺失仍然可以保持缺失。", "en-US": "Restoration is not fabrication; missing parts may stay missing." },
      };

    case "listen":
      return {
        fragmentId: fragment.id,
        carrier: fragment.carrier,
        mode: fragment.mode,
        steps: [
          { id: "echo-a", action: "listen", prompt: { "zh-CN": "停下来听第一段回声。", "en-US": "Stay still and listen to the first echo." }, reveal: claim },
          { id: "echo-b", action: "listen", prompt: { "zh-CN": "再听一段更远的回声。", "en-US": "Listen to a more distant echo." }, reveal: reason },
          { id: "protect", action: "choose", prompt: { "zh-CN": "这条观点真正想保护的是什么？", "en-US": "What is this opinion actually trying to protect?" } },
        ],
        completionLine: { "zh-CN": "有些观点的边界来自价值，而不是效率。", "en-US": "Some boundaries come from values rather than efficiency." },
      };
  }
}
