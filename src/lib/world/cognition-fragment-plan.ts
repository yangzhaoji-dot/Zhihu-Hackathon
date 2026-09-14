import type { Opinion } from "@/lib/opinion/types";
import type { PlanetSceneSpec, SceneInteractionMode } from "@/lib/opinion/planet-scene-spec";

export type CognitionFragmentRole = "claim" | "reason" | "condition" | "evidence" | "boundary";

export interface CognitionFragmentSpec {
  id: string;
  opinionId?: string;
  role: CognitionFragmentRole;
  label: { "zh-CN": string; "en-US": string };
  carrier: string;
  mode: SceneInteractionMode;
  intent: string;
}

const LABELS: Record<CognitionFragmentRole, CognitionFragmentSpec["label"]> = {
  claim: { "zh-CN": "主张", "en-US": "Claim" },
  reason: { "zh-CN": "理由", "en-US": "Reason" },
  condition: { "zh-CN": "条件", "en-US": "Condition" },
  evidence: { "zh-CN": "依据", "en-US": "Evidence" },
  boundary: { "zh-CN": "边界", "en-US": "Boundary" },
};

function boundaryCarrier(sceneSpec: PlanetSceneSpec) {
  switch (sceneSpec.biome) {
    case "ocean": return "雾外浮标";
    case "desert": return "风蚀残碑";
    case "forest": return "断根界碑";
    case "city": return "封闭站台";
    case "ruins": return "断裂遗迹";
    case "industrial": return "失效旁路";
  }
}

function conditionCarrier(sceneSpec: PlanetSceneSpec) {
  switch (sceneSpec.semanticGrammar) {
    case "crossroads": return "条件闸机";
    case "archive": return "索引筛选台";
    case "mechanism": return "依赖控制台";
    case "theater": return "换位机关";
    case "sanctuary": return "边界回声池";
  }
}

/**
 * Fragment count follows the material instead of a fixed gameplay template.
 * Missing reasons or conditions no longer create empty minigames.
 */
export function buildCognitionFragmentPlan(
  opinion: Pick<Opinion, "id" | "reason" | "conditions" | "evidence" | "sourceIds">,
  sceneSpec: PlanetSceneSpec,
): CognitionFragmentSpec[] {
  const plan: CognitionFragmentSpec[] = [{
    id: "claim",
    opinionId: opinion.id,
    role: "claim",
    label: LABELS.claim,
    carrier: sceneSpec.fragments.claim.artifact,
    mode: "observe",
    intent: sceneSpec.fragments.claim.intent,
  }];

  if (opinion.reason?.trim()) {
    plan.push({
      id: "reason",
      opinionId: opinion.id,
      role: "reason",
      label: LABELS.reason,
      carrier: sceneSpec.fragments.reason.artifact,
      mode: "observe",
      intent: sceneSpec.fragments.reason.intent,
    });
  }

  if ((opinion.conditions?.filter(Boolean).length ?? 0) > 0) {
    plan.push({
      id: "condition",
      opinionId: opinion.id,
      role: "condition",
      label: LABELS.condition,
      carrier: conditionCarrier(sceneSpec),
      mode: "observe",
      intent: "保留观点明确声明的条件，并判断它们怎样限制适用范围。",
    });
  }

  plan.push({
    id: "evidence",
    opinionId: opinion.id,
    role: "evidence",
    label: LABELS.evidence,
    carrier: sceneSpec.fragments.evidence.artifact,
    mode: "trace",
    intent: "先读可追溯原文，再判断材料能支持到哪里。",
  });

  const hasSeparateBoundary =
    (opinion.conditions?.filter(Boolean).length ?? 0) >= 2 ||
    (opinion.evidence?.filter(Boolean).length ?? 0) >= 2 ||
    opinion.sourceIds.length >= 2;

  if (hasSeparateBoundary) {
    plan.push({
      id: "boundary",
      opinionId: opinion.id,
      role: "boundary",
      label: LABELS.boundary,
      carrier: boundaryCarrier(sceneSpec),
      mode: "observe",
      intent: "保留这条观点目前无法继续推出的部分：条件、反例与未知。",
    });
  }

  return plan;
}

export function cognitionFragmentKey(opinionId: string, fragmentId: string) {
  return `fragment:${opinionId}:${fragmentId}`;
}

export function collectedCognitionFragments(
  worldState: Record<string, unknown>,
  opinionId: string,
  plan: readonly CognitionFragmentSpec[],
) {
  return plan.filter((fragment) => Boolean(worldState[cognitionFragmentKey(opinionId, fragment.id)]));
}

export function isCognitionPlanComplete(
  worldState: Record<string, unknown>,
  opinionId: string,
  plan: readonly CognitionFragmentSpec[],
) {
  return plan.length > 0 && plan.every((fragment) => Boolean(worldState[cognitionFragmentKey(opinionId, fragment.id)]));
}
