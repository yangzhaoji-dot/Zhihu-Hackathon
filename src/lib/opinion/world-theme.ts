import type { Opinion } from "./types";

export type OpinionWorldId = "crossroads" | "archive" | "theater" | "forest" | "machine";

export interface OpinionWorldTheme {
  id: OpinionWorldId;
  planet: string;
  accent: string;
  sky: string;
  ground: string;
  road: string;
  mist: string;
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
  },
  archive: {
    id: "archive",
    planet: "#766d58",
    accent: "#d8bd82",
    sky: "#191b1d",
    ground: "#574f42",
    road: "#a18f70",
    mist: "#b8ae98",
  },
  theater: {
    id: "theater",
    planet: "#652e39",
    accent: "#d6ad68",
    sky: "#160e14",
    ground: "#44252c",
    road: "#8f6261",
    mist: "#9d7a7e",
  },
  forest: {
    id: "forest",
    planet: "#365d50",
    accent: "#b4c987",
    sky: "#101d1c",
    ground: "#304b3e",
    road: "#78866a",
    mist: "#83a59c",
  },
  machine: {
    id: "machine",
    planet: "#40566d",
    accent: "#dd8956",
    sky: "#0d1720",
    ground: "#354654",
    road: "#718493",
    mist: "#7894a3",
  },
};

const RULES: { id: OpinionWorldId; pattern: RegExp }[] = [
  { id: "theater", pattern: /违法|法律|责任|道德|仲裁|公平|权利|维权|正义|legal|moral|responsib/i },
  { id: "archive", pattern: /证据|事实|数据|研究|历史|真相|来源|实验|记录|evidence|fact|research|history/i },
  { id: "machine", pattern: /\bai\b|人工智能|自动化|算法|效率|技术|机器|模型|automation|algorithm|technology/i },
  { id: "forest", pattern: /焦虑|心理|内在|关系|家庭|情绪|健康|自我|意义|anxiety|emotion|identity|mental/i },
  { id: "crossroads", pattern: /裸辞|工作|职场|现金|转行|机会|选择|学习|就业|考研|职业|offer|career|job|choice/i },
];

function hash(value: string) {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) {
    result = (result * 31 + value.charCodeAt(index)) >>> 0;
  }
  return result;
}

/** Resolve one stable visual world from the opinion's meaning. */
export function getOpinionWorldTheme(opinion: Pick<Opinion, "id" | "title" | "summary" | "claim" | "reason" | "conditions" | "camp">) {
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
