import { describe, expect, test } from "bun:test";
import type { Opinion, OpinionSource } from "../src/lib/opinion/types";
import { buildCarrierInteraction } from "../src/lib/world/carrier-interactions";
import type { CognitionFragmentSpec } from "../src/lib/world/cognition-fragment-plan";

const opinion: Opinion = {
  id: "o_source_test",
  questionId: "q_source_test",
  title: "离开持续消耗的环境是一种止损",
  summary: "测试摘要",
  kind: "human",
  support: 60,
  x: 0.5,
  y: 0.5,
  sourceIds: ["s1"],
  claim: "离开持续消耗的环境可以是一种止损",
  reason: "长期消耗本身也有成本",
  conditions: [],
  evidence: [],
};

const source: OpinionSource = {
  id: "s1",
  authorId: "a1",
  excerpt: "真正让我难受的不是离职本身，而是长期待在一个持续消耗自己的环境里。",
  upvotes: 128,
  url: "https://www.zhihu.com/question/example/answer/example",
};

const evidenceFragment: CognitionFragmentSpec = {
  id: "evidence",
  role: "evidence",
  label: { "zh-CN": "依据", "en-US": "Evidence" },
  carrier: "留痕树",
  mode: "trace",
  intent: "追到原始材料",
};

const claimFragment: CognitionFragmentSpec = {
  id: "claim",
  role: "claim",
  label: { "zh-CN": "主张", "en-US": "Claim" },
  carrier: "主张石",
  mode: "observe",
  intent: "先看见主张",
};

const legacyActions = new Set(["toggle", "align", "follow", "restore", "listen"]);

describe("simplified source-grounded carrier interactions", () => {
  test("claim interaction is one lightweight continue step", () => {
    const interaction = buildCarrierInteraction(claimFragment, opinion, [source]);
    expect(interaction.steps).toHaveLength(1);
    expect(interaction.steps[0].action).toBe("continue");
    expect(interaction.steps[0].reveal).toBe(opinion.claim);
  });

  test("evidence shows the bound Zhihu excerpt then asks one grounded judgement", () => {
    const interaction = buildCarrierInteraction(evidenceFragment, opinion, [source]);
    expect(interaction.steps.map((step) => step.action)).toEqual(["open-source", "choose"]);
    expect(interaction.steps[0].sourceExcerpt).toBe(source.excerpt);
    expect(interaction.steps[0].sourceUrl).toBe(source.url);
    expect(interaction.steps[0].sourceUpvotes).toBe(128);
    expect(interaction.steps[1].choiceMode).toBe("grounded");
    expect(interaction.steps[1].choices?.some((choice) => choice.grounded)).toBe(true);
  });

  test("main interaction builder emits no legacy minigame actions", () => {
    const interaction = buildCarrierInteraction(evidenceFragment, opinion, [source]);
    expect(interaction.steps.some((step) => legacyActions.has(step.action))).toBe(false);
  });

  test("evidence never fabricates a source when none is bound", () => {
    const interaction = buildCarrierInteraction(evidenceFragment, { ...opinion, sourceIds: [] }, []);
    expect(interaction.steps.some((step) => step.action === "open-source")).toBe(false);
    expect(interaction.steps[0].id).toBe("evidence-gap");
  });
});
