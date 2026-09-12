import type { Opinion } from "./types";
import { OPINION_WORLD_THEMES, type OpinionWorldTheme } from "./world-theme";
import {
  buildPlanetSceneSpec,
  legacyThemeIdForGrammar,
  type PlanetBiomeId,
  type PlanetSceneSpec,
  type SemanticGrammarId,
} from "./planet-scene-spec";
import { composeBiomeTheme } from "./scene-theme-composer";

export type ComposedPlanetWorldTheme = OpinionWorldTheme & {
  semanticGrammar: SemanticGrammarId;
  biome: PlanetBiomeId;
  sceneSpec: PlanetSceneSpec;
};

/**
 * New planet renderer entry point.
 * Semantic grammar chooses reasoning structure; biome adds independent
 * epistemic meaning and modifies palette/material/atmosphere.
 */
export function getPlanetWorldTheme(
  opinion: Pick<Opinion, "id" | "title" | "summary" | "claim" | "reason" | "conditions" | "evidence" | "camp">,
): ComposedPlanetWorldTheme {
  const sceneSpec = buildPlanetSceneSpec(opinion);
  const baseId = legacyThemeIdForGrammar(sceneSpec.semanticGrammar);
  const base = OPINION_WORLD_THEMES[baseId];
  return composeBiomeTheme(base, sceneSpec) as ComposedPlanetWorldTheme;
}
