import { describe, expect, test } from "bun:test";
import { normalizePlanetSynthesis, selectionBelongsToSource } from "../src/lib/planet-synthesis/model";

describe("planet synthesis", () => {
  test("selection must be a real substring of the source", () => {
    const source = "辞职以后前两个月状态恢复很多，但后来因为没有收入又开始焦虑。";
    expect(selectionBelongsToSource("前两个月状态恢复很多", source)).toBe(true);
    expect(selectionBelongsToSource("不存在的伪造材料", source)).toBe(false);
    expect(selectionBelongsToSource("太短", source)).toBe(false);
  });

  test("normalizes score ranges and relation payload", () => {
    const result = normalizePlanetSynthesis({
      viewpoint: "离开可能是止损，但经济缓冲会改变它的合理性。",
      summary: "材料同时显示心理恢复与经济压力。",
      relation: "revision",
      action: "fork",
      reason: "加入了经济风险这一关键条件。",
      additions: ["经济缓冲"],
      gaps: ["长期结果"],
      scores: { grounding: 109, coherence: 88.6, specificity: 91, boundary: -3, novelty: 74, overall: 82 },
    });
    expect(result?.scores.grounding).toBe(100);
    expect(result?.scores.coherence).toBe(89);
    expect(result?.scores.boundary).toBe(0);
    expect(result?.relation).toBe("revision");
    expect(result?.action).toBe("fork");
  });

  test("rejects malformed model output", () => {
    expect(normalizePlanetSynthesis({ viewpoint: "x", relation: "unknown", action: "fork" })).toBeNull();
  });
});
