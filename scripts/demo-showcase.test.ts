import { describe, expect, test } from "bun:test";
import { HOME_DEMOS, DEMO_GRAPHS, getDemoGraph, getDemoLawPreset } from "../src/lib/cognitive-galaxy/demo";
import { LAW_CATALOG } from "../src/lib/opinion/law-catalog";
import { SCIENTIFIC_LAWS } from "../src/lib/opinion/scientific-law-additions";

const VALID_LAWS = new Set([...LAW_CATALOG, ...SCIENTIFIC_LAWS].map((law) => law.id));
const SCIENCE_SAMPLE = new Set(["arrhenius", "michaelis_menten", "newton_cooling", "fick_diffusion", "hooke", "sir"]);

describe("homepage demo showcase", () => {
  test("the homepage exposes four fully local showcase galaxies", () => {
    expect(HOME_DEMOS).toHaveLength(4);
    for (const demo of HOME_DEMOS) {
      const graph = getDemoGraph(demo.id);
      expect(graph).not.toBeNull();
      expect(graph?.sourceScope).toBe("demo");
      expect(graph?.opinions.length).toBeGreaterThanOrEqual(24);
      expect(graph?.sources).toEqual([]);
      expect(graph?.authors).toEqual([]);
    }
  });

  test("each showcase covers six perspectives and starts with a connected graph", () => {
    for (const graph of Object.values(DEMO_GRAPHS)) {
      expect(new Set(graph.opinions.map((opinion) => opinion.camp))).toEqual(
        new Set(["health", "resources", "growth", "values", "context", "reasoning"]),
      );
      expect(graph.relations.length).toBeGreaterThan(6);
      expect(graph.relations.every((relation) => graph.opinions.some((opinion) => opinion.id === relation.from))).toBe(true);
      expect(graph.relations.every((relation) => graph.opinions.some((opinion) => opinion.id === relation.to))).toBe(true);
    }
  });

  test("every authored planet has a deterministic valid scientific-law preset", () => {
    for (const graph of Object.values(DEMO_GRAPHS)) {
      for (const opinion of graph.opinions) {
        const preset = getDemoLawPreset(opinion.id);
        expect(preset).not.toBeNull();
        expect(VALID_LAWS.has(preset!.lawId)).toBe(true);
        expect(preset!.confidence).toBeGreaterThan(0.7);
      }
    }
  });

  test("the curated showcase actually uses physics, chemistry and biology laws", () => {
    const used = new Set(
      Object.values(DEMO_GRAPHS).flatMap((graph) =>
        graph.opinions.map((opinion) => getDemoLawPreset(opinion.id)?.lawId).filter(Boolean),
      ),
    );
    for (const lawId of SCIENCE_SAMPLE) expect(used.has(lawId)).toBe(true);
  });
});
