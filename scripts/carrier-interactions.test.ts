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

const traceFragment: CognitionFragmentSpec = {
  id: "evidence",
  role: "evidence",
  label: { "zh-CN": "依据", "en-US": "Evidence" },
  carrier: "留痕树",
  mode: "trace",
  intent: "追到原始材料",
};

describe("source-grounded carrier interactions", () => {
  test("trace carrier shows the bound Zhihu excerpt before interpretation", () => {
    const interaction = buildCarrierInteraction(traceFragment, opinion, [source]);
    expect(interaction.steps[0].action).toBe("open-source");
    expect(interaction.steps[0].sourceExcerpt).toBe(source.excerpt);
    expect(interaction.steps[0].sourceUrl).toBe(source.url);
    expect(interaction.steps[0].sourceUpvotes).toBe(128);
  });

  test("source reading is followed by a grounded material-understanding choice", () => {
    const interaction = buildCarrierInteraction(traceFragment, opinion, [source]);
    const grounded = interaction.steps.find((step) => step.choiceMode === "grounded");
    expect(grounded?.action).toBe("choose");
    expect(grounded?.choices?.some((choice) => choice.grounded)).toBe(true);
  });

  test("trace carrier never fabricates a source when none is bound", () => {
    const interaction = buildCarrierInteraction(traceFragment, { ...opinion, sourceIds: [] }, []);
    expect(interaction.steps.some((step) => step.action === "open-source")).toBe(false);
    expect(interaction.steps[0].id).toBe("missing-source");
  });
});
