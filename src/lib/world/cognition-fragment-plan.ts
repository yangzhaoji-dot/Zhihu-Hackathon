import type { Opinion } from "@/lib/opinion/types";
import type { PlanetSceneSpec, SceneInteractionMode } from "@/lib/opinion/planet-scene-spec";

export type CognitionFragmentRole = "claim" | "reason" | "condition" | "evidence" | "boundary";

export interface CognitionFragmentSpec {
  id: string;
  /** Carries route identity without turning the fragment key itself into a UI label. */
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
 * A planet does NOT have a globally fixed fragment count.
 * The interaction carriers vary by planet; after a carrier is understood its
 * cognition is distilled into one unified shard in the HUD / resonance scroll.
 *
 * Baseline = claim + reason + evidence.
 * - add condition only when the opinion explicitly provides conditions;
 * - add boundary only when the supplied material is rich enough to make a
 *   separate boundary interaction meaningful.
 */
export function buildCognitionFragmentPlan(
  opinion: Pick<Opinion, "id" | "reason" | "conditions" | "evidence" | "sourceIds">,
  sceneSpec: PlanetSceneSpec,
): CognitionFragmentSpec[] {
  const plan: CognitionFragmentSpec[] = [
    {
      id: "claim",
      opinionId: opinion.id,
      role: "claim",
      label: LABELS.claim,
      carrier: sceneSpec.fragments.claim.artifact,
      mode: sceneSpec.fragments.claim.mode,
      intent: sceneSpec.fragments.claim.intent,
    },
    {
      id: "reason",
      opinionId: opinion.id,
      role: "reason",
      label: LABELS.reason,
      carrier: sceneSpec.fragments.reason.artifact,
      mode: sceneSpec.fragments.reason.mode,
      intent: sceneSpec.fragments.reason.intent,
    },
  ];

  if ((opinion.conditions?.filter(Boolean).length ?? 0) > 0) {
    plan.push({
      id: "condition",
      opinionId: opinion.id,
      role: "condition",
      label: LABELS.condition,
      carrier: conditionCarrier(sceneSpec),
      mode: "experiment",
      intent: "把这条观点自己声明的条件放进场景里试一遍，观察哪些关系会改变。",
    });
  }

  plan.push({
    id: "evidence",
    opinionId: opinion.id,
    role: "evidence",
    label: LABELS.evidence,
    carrier: sceneSpec.fragments.evidence.artifact,
    mode: sceneSpec.fragments.evidence.mode,
    intent: sceneSpec.fragments.evidence.intent,
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
      mode: sceneSpec.biome === "ruins" || sceneSpec.biome === "desert" ? "restore" : "observe",
      intent: "找到这条观点目前无法继续推出的地方：哪些人、条件、时间或证据仍然留在边界之外。",
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
