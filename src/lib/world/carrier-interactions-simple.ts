import type { Opinion, OpinionSource } from "@/lib/opinion/types";
import type { CognitionFragmentSpec } from "@/lib/world/cognition-fragment-plan";

export type CarrierActionKind =
  | "continue"
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

const INTERPRETIVE_CHOICES: CarrierChoice[] = [
  { id: "understand", label: { "zh-CN": "先理解它在什么情况下成立", "en-US": "Understand when it may hold" } },
  { id: "question", label: { "zh-CN": "我理解了，但仍保留疑问", "en-US": "I understand it, but still have questions" } },
  { id: "boundary", label: { "zh-CN": "我想继续找边界和反例", "en-US": "I want its boundaries and counterexamples" } },
];

function sourceStep(source: OpinionSource, index: number): CarrierInteractionStep {
  return {
    id: `source-${index}`,
    action: "open-source",
    sourceId: source.id,
    sourceExcerpt: source.excerpt,
    sourceUrl: source.url,
    sourceUpvotes: source.upvotes,
    prompt: {
      "zh-CN": `读第 ${index + 1} 段知乎原文。先看作者实际说了什么。`,
      "en-US": `Read Zhihu excerpt ${index + 1}. Start with what the author actually said.`,
    },
  };
}

function evidenceJudgement(): CarrierInteractionStep {
  return {
    id: "evidence-judgement",
    action: "choose",
    choiceMode: "grounded",
    prompt: {
      "zh-CN": "只根据刚才的原文，哪种判断最稳妥？",
      "en-US": "Based only on the excerpts, which judgement is the most careful?",
    },
    choices: [
      {
        id: "bounded-support",
        grounded: true,
        label: {
          "zh-CN": "这些材料能提供支撑，但不能证明观点对所有人都成立",
          "en-US": "The sources support the opinion without proving it applies to everyone",
        },
        feedback: {
          "zh-CN": "对。材料提供支撑，但适用范围仍需要单独判断。",
          "en-US": "Yes. The material supports the opinion, while scope still needs separate judgement.",
        },
      },
      {
        id: "votes-equal-proof",
        label: {
          "zh-CN": "赞同数高就足以证明观点正确",
          "en-US": "High upvotes are enough to prove the opinion correct",
        },
        feedback: {
          "zh-CN": "赞同数不是证明，它只能说明可见度和共鸣。",
          "en-US": "Upvotes are not proof; they show visibility and resonance.",
        },
      },
      {
        id: "source-ends-search",
        label: {
          "zh-CN": "找到原文后就不需要再看反例",
          "en-US": "Finding sources means counterexamples no longer matter",
        },
        feedback: {
          "zh-CN": "原文解决可追溯性，不会消除反例、条件和未知。",
          "en-US": "Sources establish traceability; they do not erase counterexamples or uncertainty.",
        },
      },
    ],
  };
}

export function buildCarrierInteraction(
  fragment: CognitionFragmentSpec,
  opinion: Pick<Opinion, "claim" | "title" | "reason" | "conditions" | "sourceIds" | "evidence">,
  sources: readonly OpinionSource[],
): CarrierInteractionDefinition {
  const claim = opinion.claim?.trim() || opinion.title;
  const reason = opinion.reason?.trim() || "";
  const conditions = opinion.conditions?.filter(Boolean) ?? [];
  const evidence = opinion.evidence?.filter(Boolean) ?? [];
  const boundSources = sources.filter((source) => opinion.sourceIds.includes(source.id));

  if (fragment.role === "claim") {
    return {
      fragmentId: fragment.id,
      carrier: fragment.carrier,
      mode: fragment.mode,
      steps: [{
        id: "claim-notice",
        action: "continue",
        prompt: {
          "zh-CN": "先看场景。这里留下的是这颗星球最核心的一句话。",
          "en-US": "Look at the scene first. This place carries the planet's central claim.",
        },
        reveal: claim,
      }],
      completionLine: {
        "zh-CN": "你已经知道这颗星球在讨论什么。",
        "en-US": "You now know what this planet is arguing.",
      },
    };
  }

  if (fragment.role === "reason") {
    return {
      fragmentId: fragment.id,
      carrier: fragment.carrier,
      mode: fragment.mode,
      steps: [{
        id: "reason-judgement",
        action: "choose",
        choiceMode: "interpretive",
        prompt: {
          "zh-CN": `这里留下的理由是：“${reason || "理由没有完整留下"}”\n你现在想怎样继续理解它？`,
          "en-US": `The surviving reason is: “${reason || "The reason was not fully preserved"}”\nHow do you want to continue reading it?`,
        },
        choices: INTERPRETIVE_CHOICES,
      }],
      completionLine: { "zh-CN": "这是当前理解，不是标准答案。", "en-US": "This is a current reading, not a scored answer." },
    };
  }

  if (fragment.role === "condition") {
    return {
      fragmentId: fragment.id,
      carrier: fragment.carrier,
      mode: fragment.mode,
      steps: [{
        id: "condition-judgement",
        action: "choose",
        choiceMode: "interpretive",
        prompt: {
          "zh-CN": `观点明确留下的条件是：${conditions.join("；") || "没有明确条件"}。这些条件会改变什么？`,
          "en-US": `Explicit conditions: ${conditions.join("; ") || "none"}. What do they change?`,
        },
        choices: [
          { id: "scope", label: { "zh-CN": "它们会改变观点适用到哪里", "en-US": "They change the scope of the opinion" } },
          { id: "more", label: { "zh-CN": "信息还不够，我需要更多材料", "en-US": "I still need more material" } },
          { id: "hold", label: { "zh-CN": "先保留这些条件，不急着结论", "en-US": "Keep the conditions visible without rushing" } },
        ],
      }],
      completionLine: { "zh-CN": "条件被保留下来，没有被做成预测游戏。", "en-US": "The conditions remain visible without becoming a prediction game." },
    };
  }

  if (fragment.role === "evidence") {
    const readable = boundSources.slice(0, 2);
    const steps: CarrierInteractionStep[] = readable.map(sourceStep);

    if (readable.length) steps.push(evidenceJudgement());
    else if (evidence.length) steps.push({
      id: "structured-evidence",
      action: "continue",
      prompt: { "zh-CN": "这里没有绑定原回答，但保留了这些依据。", "en-US": "No original answer is bound here, but these supporting notes remain." },
      reveal: evidence.join("；"),
    });
    else steps.push({
      id: "evidence-gap",
      action: "continue",
      prompt: { "zh-CN": "这里没有可追溯原文。这个缺口本身需要保留。", "en-US": "There is no traceable source here. Keep the gap visible." },
    });

    return {
      fragmentId: fragment.id,
      carrier: fragment.carrier,
      mode: fragment.mode,
      steps,
      completionLine: {
        "zh-CN": "你读了材料，并只判断它当前能支持到哪里。",
        "en-US": "You read the material and judged only how far it currently supports the opinion.",
      },
    };
  }

  return {
    fragmentId: fragment.id,
    carrier: fragment.carrier,
    mode: fragment.mode,
    steps: [{
      id: "boundary-judgement",
      action: "choose",
      choiceMode: "interpretive",
      prompt: {
        "zh-CN": `你已经看过 ${boundSources.length} 份可追溯原文。现在问：这条观点还有什么没有覆盖？`,
        "en-US": `You have read ${boundSources.length} traceable source(s). What still remains outside the opinion's reach?`,
      },
      choices: [
        { id: "context", label: { "zh-CN": "不同的人和处境可能得到不同结果", "en-US": "Different people and contexts may lead to different outcomes" } },
        { id: "counterexample", label: { "zh-CN": "我还想找反例或相反经历", "en-US": "I still want counterexamples or opposing experiences" } },
        { id: "unknown", label: { "zh-CN": "信息仍不足，我愿意保留未知", "en-US": "Information is still insufficient; keep the uncertainty" } },
      ],
    }],
    completionLine: {
      "zh-CN": "理解一个观点，也包括知道它不能推出什么。",
      "en-US": "Understanding an opinion also means knowing what it cannot establish.",
    },
  };
}
