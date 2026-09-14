import { PLANET_BIOMES, type PlanetSceneSpec } from "./planet-scene-spec";

export interface RenderThemeLike {
  id: string;
  planet: string;
  accent: string;
  sky: string;
  ground: string;
  road: string;
  mist: string;
  cosmos: {
    roughness: number;
    metalness: number;
    atmosphere: number;
    surfaceLines: number;
    rings: number;
    silhouette: string;
  };
  surface: {
    motif: string;
    density: "sparse" | "balanced" | "dense";
    fog: "low" | "medium" | "high";
    warmth: "cold" | "mixed" | "warm";
  };
  resonance: string;
}

function hexToRgb(hex: string) {
  const value = Number.parseInt(hex.replace("#", ""), 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

function toHex(value: number) {
  return Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0");
}

function mixHex(leftHex: string, rightHex: string, rightWeight: number) {
  const left = hexToRgb(leftHex);
  const right = hexToRgb(rightHex);
  const lw = 1 - rightWeight;
  return `#${toHex(left.r * lw + right.r * rightWeight)}${toHex(left.g * lw + right.g * rightWeight)}${toHex(left.b * lw + right.b * rightWeight)}`;
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

/** Grammar supplies structure; biome supplies a second semantic visual force. */
export function composeBiomeTheme<T extends RenderThemeLike>(base: T, sceneSpec: PlanetSceneSpec): T & {
  semanticGrammar: PlanetSceneSpec["semanticGrammar"];
  biome: PlanetSceneSpec["biome"];
  sceneSpec: PlanetSceneSpec;
} {
  const biome = PLANET_BIOMES[sceneSpec.biome];
  const visual = biome.visual;
  return {
    ...base,
    semanticGrammar: sceneSpec.semanticGrammar,
    biome: sceneSpec.biome,
    sceneSpec,
    planet: mixHex(base.planet, visual.planet, 0.56),
    accent: mixHex(base.accent, visual.accent, 0.5),
    sky: mixHex(base.sky, visual.sky, 0.62),
    ground: mixHex(base.ground, visual.ground, 0.58),
    road: mixHex(base.road, visual.road, 0.54),
    mist: mixHex(base.mist, visual.mist, 0.62),
    cosmos: {
      ...base.cosmos,
      roughness: clamp01(base.cosmos.roughness + visual.roughnessBias),
      metalness: clamp01(base.cosmos.metalness + visual.metalnessBias),
      atmosphere: clamp01(base.cosmos.atmosphere + visual.atmosphereBias),
    },
    surface: {
      ...base.surface,
      density: visual.density,
      fog: visual.fog,
      warmth: visual.warmth,
    },
  };
}
