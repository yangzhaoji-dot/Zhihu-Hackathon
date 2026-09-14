import type { Opinion } from "./types";
import {
  buildPlanetSceneSpec,
  legacyThemeIdForGrammar,
  type PlanetBiomeId,
  type PlanetSceneSpec,
  type SemanticGrammarId,
} from "./planet-scene-spec";
import { composeBiomeTheme } from "./scene-theme-composer";

export type OpinionWorldId = "crossroads" | "archive" | "theater" | "forest" | "machine";
export type PlanetSilhouette = "fractured" | "layered" | "faceted" | "organic" | "mechanical";
export type ResonanceTransformation = "rebuild" | "reveal" | "illuminate" | "bloom" | "awaken";

export interface OpinionWorldTheme {
  /** Legacy renderer id; semantic identity is semanticGrammar + biome. */
  id: OpinionWorldId;
  semanticGrammar?: SemanticGrammarId;
  biome?: PlanetBiomeId;
  sceneSpec?: PlanetSceneSpec;
  planet: string;
  accent: string;
  sky: string;
  ground: string;
  road: string;
  mist: string;
  cosmos: {
    silhouette: PlanetSilhouette;
    roughness: number;
    metalness: number;
    atmosphere: number;
    surfaceLines: number;
    rings: number;
  };
  surface: {
    motif: "junction" | "records" | "stage" | "growth" | "system";
    density: "sparse" | "balanced" | "dense";
    fog: "low" | "medium" | "high";
    warmth: "cold" | "mixed" | "warm";
  };
  resonance: ResonanceTransformation;
}

export const OPINION_WORLD_THEMES: Record<OpinionWorldId, OpinionWorldTheme> = {
  crossroads: {
    id: "crossroads", planet: "#465b6b", accent: "#d2975d", sky: "#172833", ground: "#4d5150", road: "#9b8263", mist: "#7d9296",
    cosmos: { silhouette: "fractured", roughness: 0.64, metalness: 0.22, atmosphere: 0.2, surfaceLines: 0.2, rings: 0.12 },
    surface: { motif: "junction", density: "balanced", fog: "medium", warmth: "mixed" }, resonance: "rebuild",
  },
  archive: {
    id: "archive", planet: "#766d58", accent: "#d8bd82", sky: "#191b1d", ground: "#574f42", road: "#a18f70", mist: "#b8ae98",
    cosmos: { silhouette: "layered", roughness: 0.78, metalness: 0.12, atmosphere: 0.14, surfaceLines: 0.34, rings: 0.08 },
    surface: { motif: "records", density: "dense", fog: "medium", warmth: "warm" }, resonance: "reveal",
  },
  theater: {
    id: "theater", planet: "#652e39", accent: "#d6ad68", sky: "#160e14", ground: "#44252c", road: "#8f6261", mist: "#9d7a7e",
    cosmos: { silhouette: "faceted", roughness: 0.52, metalness: 0.28, atmosphere: 0.18, surfaceLines: 0.16, rings: 0.18 },
    surface: { motif: "stage", density: "balanced", fog: "low", warmth: "warm" }, resonance: "illuminate",
  },
  forest: {
    id: "forest", planet: "#365d50", accent: "#b4c987", sky: "#101d1c", ground: "#304b3e", road: "#78866a", mist: "#83a59c",
    cosmos: { silhouette: "organic", roughness: 0.88, metalness: 0.04, atmosphere: 0.32, surfaceLines: 0.08, rings: 0 },
    surface: { motif: "growth", density: "sparse", fog: "high", warmth: "cold" }, resonance: "bloom",
  },
  machine: {
    id: "machine", planet: "#40566d", accent: "#dd8956", sky: "#0d1720", ground: "#354654", road: "#718493", mist: "#7894a3",
    cosmos: { silhouette: "mechanical", roughness: 0.28, metalness: 0.72, atmosphere: 0.11, surfaceLines: 0.4, rings: 0.34 },
    surface: { motif: "system", density: "dense", fog: "low", warmth: "mixed" }, resonance: "awaken",
  },
};

/**
 * Resolve a stable TWO-AXIS world from the opinion.
 * Grammar carries cognitive structure; biome carries an independent
 * epistemic/experiential meaning (Ocean is uncertainty+connection, Desert is
 * scarcity+erosion, etc.) and therefore also changes materials and atmosphere.
 */
export function getOpinionWorldTheme(
  opinion: Pick<Opinion, "id" | "title" | "summary" | "claim" | "reason" | "conditions" | "evidence" | "camp">,
): OpinionWorldTheme {
  const sceneSpec = buildPlanetSceneSpec(opinion);
  const base = OPINION_WORLD_THEMES[legacyThemeIdForGrammar(sceneSpec.semanticGrammar)];
  return composeBiomeTheme(base, sceneSpec) as OpinionWorldTheme;
}
