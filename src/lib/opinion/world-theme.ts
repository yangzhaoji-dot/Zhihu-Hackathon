import type { Opinion } from "./types";

export type OpinionWorldId = "crossroads" | "archive" | "theater" | "forest" | "machine";
export type PlanetSilhouette = "fractured" | "layered" | "faceted" | "organic" | "mechanical";
export type ResonanceTransformation = "rebuild" | "reveal" | "illuminate" | "bloom" | "awaken";

export interface OpinionWorldTheme {
  id: OpinionWorldId;
  planet: string;
  accent: string;
  sky: string;
  ground: string;
  road: string;
  mist: string;
  /** 宇宙中看见的星球外观。必须与登陆后的场景语言对应。 */
  cosmos: {
    silhouette: PlanetSilhouette;
    roughness: number;
    metalness: number;
    atmosphere: number;
    surfaceLines: number;
    rings: number;
  };
  /** 地表的场景语法，不等于具体地图布局。 */
  surface: {
    motif: "junction" | "records" | "stage" | "growth" | "system";
    density: "sparse" | "balanced" | "dense";
    fog: "low" | "medium" | "high";
    warmth: "cold" | "mixed" | "warm";
  };
  /** 共鸣后的主要世界变化。变化表达“读懂”，不表达“正确”。 */
  resonance: ResonanceTransformation;
}

export const OPINION_WORLD_THEMES: Record<OpinionWorldId, OpinionWorldTheme> = {
  crossroads: {
    id: "crossroads",
    planet: "#465b6b",
    accent: "#d2975d",
    sky: "#172833",
    ground: "#4d5150",
    road: "#9b8263",
    mist: "#7d9296",
    cosmos: {
      silhouette: "fractured",
      roughness: 0.64,
      metalness: 0.22,
      atmosphere: 0.2,
      surfaceLines: 0.2,
      rings: 0.12,
    },
    surface: { motif: "junction", density: "balanced", fog: "medium", warmth: "mixed" },
    resonance: "rebuild",
  },
  archive: {
    id: "archive",
    planet: "#766d58",
    accent: "#d8bd82",
    sky: "#191b1d",
    ground: "#574f42",
    road: "#a18f70",
    mist: "#b8ae98",
    cosmos: {
      silhouette: "layered",
      roughness: 0.78,
      metalness: 0.12,
      atmosphere: 0.14,
      surfaceLines: 0.34,
      rings: 0.08,
    },
    surface: { motif: "records", density: "dense", fog: "medium", warmth: "warm" },
    resonance: "reveal",
  },
  theater: {
    id: "theater",
    planet: "#652e39",
    accent: "#d6ad68",
    sky: "#160e14",
    ground: "#44252c",
    road: "#8f6261",
    mist: "#9d7a7e",
    cosmos: {
      silhouette: "faceted",
      roughness: 0.52,
      metalness: 0.28,
      atmosphere: 0.18,
      surfaceLines: 0.16,
      rings: 0.18,
    },
    surface: { motif: "stage", density: "balanced", fog: "low", warmth: "warm" },
    resonance: "illuminate",
  },
  forest: {
    id: "forest",
    planet: "#365d50",
    accent: "#b4c987",
    sky: "#101d1c",
    ground: "#304b3e",
    road: "#78866a",
    mist: "#83a59c",
    cosmos: {
      silhouette: "organic",
      roughness: 0.88,
      metalness: 0.04,
      atmosphere: 0.32,
      surfaceLines: 0.08,
      rings: 0,
    },
    surface: { motif: "growth", density: "sparse", fog: "high", warmth: "cold" },
    resonance: "bloom",
  },
  machine: {
    id: "machine",
    planet: "#40566d",
    accent: "#dd8956",
    sky: "#0d1720",
    ground: "#354654",
    road: "#718493",
    mist: "#7894a3",
    cosmos: {
      silhouette: "mechanical",
      roughness: 0.28,
      metalness: 0.72,
      atmosphere: 0.11,
      surfaceLines: 0.4,
      rings: 0.34,
    },
    surface: { motif: "system", density: "dense", fog: "low", warmth: "mixed" },
    resonance: "awaken",
  },
};

const RULES: { id: OpinionWorldId; pattern: RegExp }[] = [
  { id: "theater", pattern: /违法|法律|责任|道德|仲裁|公平|权利|维权|正义|审判|legal|moral|responsib/i },
  { id: "archive", pattern: /证据|事实|数据|研究|历史|真相|来源|实验|记录|统计|evidence|fact|research|history|data/i },
  { id: "machine", pattern: /\bai\b|人工智能|自动化|算法|效率|技术|机器|模型|系统|automation|algorithm|technology|model/i },
  { id: "forest", pattern: /焦虑|心理|内在|关系|家庭|情绪|健康|自我|意义|成长|anxiety|emotion|identity|mental|growth/i },
  { id: "crossroads", pattern: /裸辞|工作|职场|现金|转行|机会|选择|学习|就业|考研|职业|路径|offer|career|job|choice|path/i },
];

function hash(value: string) {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) {
    result = (result * 31 + value.charCodeAt(index)) >>> 0;
  }
  return result;
}

/** Resolve one stable visual/interaction grammar from the selected opinion's meaning. */
export function getOpinionWorldTheme(
  opinion: Pick<Opinion, "id" | "title" | "summary" | "claim" | "reason" | "conditions" | "camp">,
) {
  const text = [
    opinion.title,
    opinion.summary,
    opinion.claim,
    opinion.reason,
    opinion.conditions?.join(" "),
    opinion.camp,
  ].filter(Boolean).join(" ");
  const match = RULES.find((rule) => rule.pattern.test(text));
  if (match) return OPINION_WORLD_THEMES[match.id];
  const ids = Object.keys(OPINION_WORLD_THEMES) as OpinionWorldId[];
  return OPINION_WORLD_THEMES[ids[hash(opinion.id) % ids.length]];
}
