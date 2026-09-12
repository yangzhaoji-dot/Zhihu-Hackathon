import { describe, expect, test } from "bun:test";
import { buildPlanetSceneSpec } from "../src/lib/opinion/planet-scene-spec";
import type { Opinion } from "../src/lib/opinion/types";
import { buildCognitionFragmentPlan } from "../src/lib/world/cognition-fragment-plan";

function opinion(overrides: Partial<Opinion> = {}): Opinion {
  return {
    id: "o_test",
    questionId: "q_test",
    title: "一个测试观点",
    summary: "测试摘要",
    kind: "human",
    support: 60,
    x: 0.5,
    y: 0.5,
    sourceIds: [],
    claim: "这是核心主张",
    reason: "这是理由",
    conditions: [],
    evidence: [],
    ...overrides,
  };
}

function planFor(value: Opinion) {
  return buildCognitionFragmentPlan(value, buildPlanetSceneSpec(value));
}

describe("dynamic cognition fragment plan", () => {
  test("simple opinion uses three cognition fragments", () => {
    const plan = planFor(opinion());
    expect(plan.map((fragment) => fragment.role)).toEqual(["claim", "reason", "evidence"]);
    expect(plan).toHaveLength(3);
  });

  test("explicit conditions add a condition carrier", () => {
    const plan = planFor(opinion({ conditions: ["有稳定现金流"] }));
    expect(plan.map((fragment) => fragment.role)).toEqual(["claim", "reason", "condition", "evidence"]);
    expect(plan).toHaveLength(4);
  });

  test("rich material can justify a separate boundary carrier", () => {
    const plan = planFor(opinion({
      conditions: ["条件 A", "条件 B"],
      sourceIds: ["s1", "s2"],
      evidence: ["证据 A", "证据 B"],
    }));
    expect(plan.map((fragment) => fragment.role)).toEqual(["claim", "reason", "condition", "evidence", "boundary"]);
    expect(plan).toHaveLength(5);
  });

  test("count is material-driven rather than fixed", () => {
    const counts = [
      planFor(opinion()).length,
      planFor(opinion({ conditions: ["条件 A"] })).length,
      planFor(opinion({ conditions: ["条件 A", "条件 B"], sourceIds: ["s1", "s2"] })).length,
    ];
    expect(counts).toEqual([3, 4, 5]);
  });
});
