import { describe, expect, test } from "bun:test";
import { buildPlanetSceneSpec } from "../src/lib/opinion/planet-scene-spec";
import type { Opinion } from "../src/lib/opinion/types";
import { buildCognitionFragmentPlan } from "../src/lib/world/cognition-fragment-plan";

const opinion: Opinion = {
  id: "o_simple",
  questionId: "q_simple",
  title: "测试观点",
  summary: "测试摘要",
  kind: "human",
  support: 50,
  x: 0.5,
  y: 0.5,
  sourceIds: ["s1", "s2"],
  claim: "测试主张",
  reason: undefined,
  conditions: [],
  evidence: [],
};

describe("simplified cognition plan", () => {
  test("missing reason does not create an empty reason carrier", () => {
    const plan = buildCognitionFragmentPlan(opinion, buildPlanetSceneSpec(opinion));
    expect(plan.map((fragment) => fragment.role)).toEqual(["claim", "evidence", "boundary"]);
  });
});
