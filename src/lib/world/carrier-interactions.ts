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

export interface CarrierInteractionStep {
  id: string;
  action: CarrierActionKind;
  prompt: { "zh-CN": string; "en-US": string };
  reveal?: string;
  sourceId?: string;
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

    case "trace":
      return {
        fragmentId: fragment.id,
        carrier: fragment.carrier,
        mode: fragment.mode,
        steps: boundSources.length ? boundSources.slice(0, 2).map((source, index) => ({
          id: `source-${index}`,
          action: "open-source" as const,
          sourceId: source.id,
          prompt: { "zh-CN": `打开第 ${index + 1} 份原文痕迹。`, "en-US": `Open source trace ${index + 1}.` },
          reveal: source.excerpt,
        })) : [{ id: "missing-source", action: "inspect", prompt: { "zh-CN": "检查这个空档案位：没有原文可以继续追。", "en-US": "Inspect the empty archive slot: no original source can be traced." } }],
        completionLine: { "zh-CN": "可追溯到哪里，依据就只恢复到哪里。", "en-US": "Evidence is recovered only as far as the trace actually goes." },
      };

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
