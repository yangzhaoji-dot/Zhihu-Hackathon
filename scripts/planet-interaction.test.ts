import { describe, expect, test } from "bun:test";
import { resolvePlanetProximity } from "../src/components/planet-interaction/geometry";
import { fuseGalaxyOpinions } from "../src/lib/cognitive-galaxy/evolution";
import { DEMO_GRAPH } from "../src/lib/cognitive-galaxy/demo";

const source = { id: "a", x: 0, y: 0, radius: 10 };
const target = { id: "b", x: 100, y: 0, radius: 12 };

describe("planet proximity", () => {
  test("stays idle outside the gravity field", () => {
    expect(resolvePlanetProximity(source, [source, target], { x: 0, y: 0 })).toEqual({
      targetId: null,
      collisionReady: false,
      state: "idle",
    });
  });

  test("reports gravity without treating proximity as a collision", () => {
    expect(resolvePlanetProximity(source, [source, target], { x: 40, y: 0 })).toEqual({
      targetId: "b",
      collisionReady: false,
      state: "gravity",
    });
  });

  test("reports collision only inside the contact threshold", () => {
    expect(resolvePlanetProximity(source, [source, target], { x: 70, y: 0 })).toEqual({
      targetId: "b",
      collisionReady: true,
      state: "collision",
    });
  });

  test("always chooses the nearest eligible target", () => {
    const closer = { id: "c", x: 62, y: 0, radius: 8 };
    expect(resolvePlanetProximity(source, [source, target, closer], { x: 40, y: 0 }).targetId).toBe("c");
  });
});

describe("planet fusion", () => {
  test("preserves both parents and bridges them to one candidate", () => {
    const parentA = DEMO_GRAPH.opinions[0].id;
    const parentB = DEMO_GRAPH.opinions[1].id;
    const result = fuseGalaxyOpinions({
      graph: DEMO_GRAPH,
      parentA,
      parentB,
      id: "fusion-test",
      title: "融合候选观点",
      summary: "保留两边成立条件后形成的新判断。",
    });

    expect(result.graph.opinions.some((opinion) => opinion.id === parentA)).toBe(true);
    expect(result.graph.opinions.some((opinion) => opinion.id === parentB)).toBe(true);
    expect(result.graph.opinions.find((opinion) => opinion.id === result.opinionId)?.derivedFrom).toEqual([
      parentA,
      parentB,
    ]);
    expect(result.graph.relations.filter((relation) => relation.to === result.opinionId)).toEqual([
      expect.objectContaining({ from: parentA }),
      expect.objectContaining({ from: parentB }),
    ]);
  });
});
