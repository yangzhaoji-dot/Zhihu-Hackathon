import type { Opinion } from "./types";

/**
 * Planet scene generation deliberately uses TWO semantic axes:
 *
 * 1. semanticGrammar = what kind of reasoning structure the player must understand.
 * 2. biome = what epistemic / experiential condition that reasoning lives inside.
 *
 * The biome is NOT a cosmetic skin. Ocean, desert, forest, city, ruins and
 * industrial worlds each carry a different meaning and therefore alter scene
 * tension, landmarks, evidence presentation, motion and resonance.
 */
export type SemanticGrammarId =
  | "crossroads"
  | "archive"
  | "mechanism"
  | "theater"
  | "sanctuary";

export type PlanetBiomeId =
  | "ocean"
  | "desert"
  | "forest"
  | "city"
  | "ruins"
  | "industrial";

export type SceneInteractionMode =
  | "observe"
  | "experiment"
  | "trace"
  | "compare"
  | "navigate"
  | "restore"
  | "listen";

export type SceneResonanceVerb =
  | "reconnect"
  | "reveal"
  | "awaken"
  | "illuminate"
  | "bloom";

export interface SemanticGrammarDefinition {
  id: SemanticGrammarId;
  /** The cognitive relationship this grammar expresses. */
  meaning: string;
  tension: string;
  kanshanLens: string;
  layout: "branch" | "layers" | "system" | "stage" | "refuge";
  reasonInteraction: SceneInteractionMode;
  resonanceVerb: SceneResonanceVerb;
}

export interface PlanetBiomeDefinition {
  id: PlanetBiomeId;
  /** The epistemic / experiential condition expressed by the environment. */
  meaning: string;
  tension: string;
  kanshanLens: string;
  topology: "islands" | "dunes" | "groves" | "blocks" | "fragments" | "platforms";
  evidenceInteraction: SceneInteractionMode;
  claimInteraction: SceneInteractionMode;
  resonanceModifier: string;
  motion: string;
  visual: {
    planet: string;
    accent: string;
    sky: string;
    ground: string;
    road: string;
    mist: string;
    fog: "low" | "medium" | "high";
    density: "sparse" | "balanced" | "dense";
    warmth: "cold" | "mixed" | "warm";
    roughnessBias: number;
    metalnessBias: number;
    atmosphereBias: number;
  };
}

export interface PlanetSceneSpec {
  version: 1;
  opinionId: string;
  semanticGrammar: SemanticGrammarId;
  biome: PlanetBiomeId;
  /** Why this exact combination is meaningful, not just visually different. */
  semanticEquation: string;
  signatureLandmark: string;
  secondaryLandmark: string;
  coreParadox: string;
  kanshanOpeningQuestion: string;
  spatialPattern: string;
  fragments: {
    claim: { mode: SceneInteractionMode; artifact: string; intent: string };
    reason: { mode: SceneInteractionMode; artifact: string; intent: string };
    evidence: { mode: SceneInteractionMode; artifact: string; intent: string };
  };
  resonance: {
    verb: SceneResonanceVerb;
    modifier: string;
    worldChange: string;
  };
  /** Prompt seed for offline concept/asset generation, not a runtime truth source. */
  artDirectionPrompt: string;
}

export const SEMANTIC_GRAMMARS: Record<SemanticGrammarId, SemanticGrammarDefinition> = {
  crossroads: {
    id: "crossroads",
    meaning: "选择、替代方案与条件分支：同一个目标在不同前提下可能通向不同路线。",
    tension: "真正的分歧往往不在终点，而在选择哪条路径、以及什么条件允许那条路径成立。",
    kanshanLens: "哪一个条件改变时，你会换一条路？",
    layout: "branch",
    reasonInteraction: "experiment",
    resonanceVerb: "reconnect",
  },
  archive: {
    id: "archive",
    meaning: "证据、来源与覆盖范围：观点的可信程度取决于我们究竟看见了什么材料，以及什么仍然缺失。",
    tension: "材料很多不等于覆盖充分；最关键的部分可能恰好没有被记录。",
    kanshanLens: "哪些东西是原文留下的，哪些只是我们自己的解释？",
    layout: "layers",
    reasonInteraction: "trace",
    resonanceVerb: "reveal",
  },
  mechanism: {
    id: "mechanism",
    meaning: "因果机制、依赖关系与系统约束：理解一个判断需要知道系统如何运转，而不只是看最终结果。",
    tension: "看起来有效的结果可能来自隐藏机制，也可能在某个依赖项失效后整体改变。",
    kanshanLens: "这里真正驱动变化的是哪一个环节？",
    layout: "system",
    reasonInteraction: "experiment",
    resonanceVerb: "awaken",
  },
  theater: {
    id: "theater",
    meaning: "角色、立场、叙事与责任：同一事实从不同位置看，解释和责任边界可能不同。",
    tension: "最响亮的叙事未必覆盖所有位置；判断之前需要知道谁在什么位置上说话。",
    kanshanLens: "如果换一个位置看，同一件事会不会变成另一种解释？",
    layout: "stage",
    reasonInteraction: "compare",
    resonanceVerb: "illuminate",
  },
  sanctuary: {
    id: "sanctuary",
    meaning: "价值、身份、关系与内在边界：观点常常不是在优化单一指标，而是在保护某种重要的生活状态。",
    tension: "外部最优解不一定等于个人可接受的生活；有些边界来自价值而不是效率。",
    kanshanLens: "这条观点真正想保护的东西是什么？",
    layout: "refuge",
    reasonInteraction: "listen",
    resonanceVerb: "bloom",
  },
};

export const PLANET_BIOMES: Record<PlanetBiomeId, PlanetBiomeDefinition> = {
  ocean: {
    id: "ocean",
    meaning: "连接、距离、流动与不确定性：信息像航线一样跨越空间，但远方始终存在看不清的部分。",
    tension: "可见的岛屿彼此分离，连接依赖航线、信标与时机；看见远方不代表已经抵达。",
    kanshanLens: "你看到的是一条确定的航线，还是只看到了远处的灯？",
    topology: "islands",
    evidenceInteraction: "navigate",
    claimInteraction: "observe",
    resonanceModifier: "潮汐退去后航线与浅滩逐渐显现，远海仍保留雾。",
    motion: "潮汐、海雾、漂浮灯标与远处缓慢移动的光。",
    visual: {
      planet: "#345f73",
      accent: "#8fd4c9",
      sky: "#0a2230",
      ground: "#38515a",
      road: "#87aaa8",
      mist: "#88aab1",
      fog: "high",
      density: "sparse",
      warmth: "cold",
      roughnessBias: -0.08,
      metalnessBias: -0.04,
      atmosphereBias: 0.1,
    },
  },
  desert: {
    id: "desert",
    meaning: "稀缺、代价、时间侵蚀与残留痕迹：当资源有限时，每个选择都会暴露机会成本。",
    tension: "真正重要的结构常被沙埋住；留下来的痕迹很少，因此每一份证据都需要更谨慎地解释。",
    kanshanLens: "这里缺少的东西，是从来没有存在过，还是已经被时间埋住了？",
    topology: "dunes",
    evidenceInteraction: "restore",
    claimInteraction: "observe",
    resonanceModifier: "风势减弱，埋在沙下的路径与石碑轮廓显露，但远方热雾仍在。",
    motion: "风沙、热浪、长阴影与偶尔露出的旧结构。",
    visual: {
      planet: "#8b6f50",
      accent: "#e3b66f",
      sky: "#251b17",
      ground: "#6d5844",
      road: "#ad8f68",
      mist: "#c6a57d",
      fog: "medium",
      density: "sparse",
      warmth: "warm",
      roughnessBias: 0.12,
      metalnessBias: -0.08,
      atmosphereBias: -0.03,
    },
  },
  forest: {
    id: "forest",
    meaning: "生长、纠缠、适应与长期反馈：今天的状态可能是许多微小关系长期累积的结果。",
    tension: "路径会被生长重新覆盖；看似独立的节点可能通过根系和时间彼此影响。",
    kanshanLens: "你看到的是一个独立原因，还是一整片互相影响的关系？",
    topology: "groves",
    evidenceInteraction: "trace",
    claimInteraction: "listen",
    resonanceModifier: "新的光穿过枝叶，根系关系显现，未探索区域仍保持浓密。",
    motion: "风、叶片、孢子光点、缓慢生长的藤蔓与水面反光。",
    visual: {
      planet: "#365d50",
      accent: "#b4c987",
      sky: "#101d1c",
      ground: "#304b3e",
      road: "#78866a",
      mist: "#83a59c",
      fog: "high",
      density: "balanced",
      warmth: "mixed",
      roughnessBias: 0.16,
      metalnessBias: -0.16,
      atmosphereBias: 0.08,
    },
  },
  city: {
    id: "city",
    meaning: "制度、社会网络、拥挤与公共规则：个人选择会被组织、基础设施和他人的行为共同塑造。",
    tension: "道路很多但规则更多；真正限制行动的可能不是个人意愿，而是城市如何组织资源。",
    kanshanLens: "这是谁的选择，又有多少其实是环境替他做出的选择？",
    topology: "blocks",
    evidenceInteraction: "compare",
    claimInteraction: "observe",
    resonanceModifier: "街区灯光依次点亮，隐藏的通路与规则标记变得可读。",
    motion: "远处交通光、窗灯、风吹纸片与缓慢移动的城市雾。",
    visual: {
      planet: "#52606d",
      accent: "#d5a56a",
      sky: "#111b25",
      ground: "#484d50",
      road: "#8c7b69",
      mist: "#798995",
      fog: "medium",
      density: "dense",
      warmth: "mixed",
      roughnessBias: 0.02,
      metalnessBias: 0.06,
      atmosphereBias: 0.01,
    },
  },
  ruins: {
    id: "ruins",
    meaning: "后果、记忆、失败与残余结构：我们不是从零开始判断，而是在过去留下的结果上继续理解。",
    tension: "破损本身说明曾经发生过什么，但残骸无法自动告诉我们为什么失败。",
    kanshanLens: "你现在看到的是原因，还是只看到了事情发生后的痕迹？",
    topology: "fragments",
    evidenceInteraction: "restore",
    claimInteraction: "observe",
    resonanceModifier: "碎片之间出现可读的连接，部分结构被重新勾勒，但损坏历史不会被抹去。",
    motion: "尘埃、远处坠落的小碎石、穿过裂缝的光与回声。",
    visual: {
      planet: "#665f58",
      accent: "#cfaa78",
      sky: "#16171a",
      ground: "#504a44",
      road: "#877867",
      mist: "#9a9188",
      fog: "medium",
      density: "balanced",
      warmth: "cold",
      roughnessBias: 0.18,
      metalnessBias: -0.02,
      atmosphereBias: 0,
    },
  },
  industrial: {
    id: "industrial",
    meaning: "生产、吞吐、成本与依赖链：任何效率都来自资源流动，也会在某处留下代价。",
    tension: "机器持续运转并不代表系统健康；瓶颈、输入和外部成本可能被藏在看不见的管线里。",
    kanshanLens: "这里看起来一直在运转，但真正被消耗的是什么？",
    topology: "platforms",
    evidenceInteraction: "trace",
    claimInteraction: "experiment",
    resonanceModifier: "停滞的线路重新通电，关键依赖被点亮，非关键区域仍保持暗色。",
    motion: "蒸汽、指示灯、输送带、管线脉冲与低频机械振动。",
    visual: {
      planet: "#40566d",
      accent: "#dd8956",
      sky: "#0d1720",
      ground: "#354654",
      road: "#718493",
      mist: "#7894a3",
      fog: "low",
      density: "dense",
      warmth: "mixed",
      roughnessBias: -0.14,
      metalnessBias: 0.22,
      atmosphereBias: -0.05,
    },
  },
};

type OpinionLike = Pick<
  Opinion,
  "id" | "title" | "summary" | "claim" | "reason" | "conditions" | "evidence" | "camp"
>;

const GRAMMAR_RULES: Array<{ id: SemanticGrammarId; weight: number; pattern: RegExp }> = [
  { id: "theater", weight: 4, pattern: /责任|道德|公平|权利|违法|法律|舆论|立场|角色|归责|争议|正义|moral|legal|responsib|fair|role/i },
  { id: "archive", weight: 4, pattern: /证据|数据|来源|事实|研究|历史|统计|记录|样本|调查|实验结果|evidence|fact|research|data|source|record/i },
  { id: "mechanism", weight: 4, pattern: /机制|系统|算法|效率|模型|因果|流程|自动化|基础设施|工作原理|依赖|瓶颈|mechanism|system|algorithm|automation|causal|pipeline/i },
  { id: "sanctuary", weight: 4, pattern: /心理|焦虑|情绪|关系|家庭|身份|价值|意义|健康|自我|成长|幸福|边界|mental|emotion|identity|meaning|relationship|value/i },
  { id: "crossroads", weight: 4, pattern: /选择|机会|路线|路径|转行|就业|职业|学习|是否|要不要|应该|决策|取舍|风险偏好|choice|career|path|decision|whether/i },
];

const BIOME_RULES: Array<{ id: PlanetBiomeId; weight: number; pattern: RegExp }> = [
  { id: "ocean", weight: 3, pattern: /不确定|远方|机会|流动|迁移|连接|网络|开放|探索|变化快|窗口|跨越|uncertain|opportunity|mobility|network|explore|distance/i },
  { id: "desert", weight: 3, pattern: /稀缺|成本|压力|风险|现金|资源不足|缺失|短缺|长期|代价|耗尽|scarcity|cost|risk|pressure|limited|missing/i },
  { id: "forest", weight: 3, pattern: /成长|学习|适应|关系|长期积累|复杂|生态|反馈|习惯|恢复|growth|learn|adapt|relationship|complex|feedback/i },
  { id: "city", weight: 3, pattern: /职场|公司|组织|学校|社会|制度|法律|公共|就业|行业|平台|城市|company|organization|school|society|institution|job/i },
  { id: "ruins", weight: 3, pattern: /失败|损失|过去|历史|修复|离职|崩溃|后果|遗留|破坏|淘汰|failure|loss|past|repair|collapse|legacy/i },
  { id: "industrial", weight: 3, pattern: /技术|人工智能|AI|自动化|生产|效率|工程|算力|系统|机器|算法|模型|流水线|technology|automation|production|compute|machine|algorithm|model/i },
];

const GRAMMAR_LANDMARKS: Record<SemanticGrammarId, string[]> = {
  crossroads: ["分叉信号塔", "多层换乘桥", "条件门阵", "岔路观景台"],
  archive: ["分层档案塔", "缺页长廊", "来源观测室", "空白索引碑"],
  mechanism: ["核心驱动室", "依赖管线塔", "停转中枢", "反馈控制台"],
  theater: ["多面舞台", "责任席环廊", "换位镜墙", "无观众剧场"],
  sanctuary: ["静默庇护所", "回声庭院", "边界灯塔", "内在观景台"],
};

const BIOME_LANDMARKS: Record<PlanetBiomeId, string[]> = {
  ocean: ["雾海灯塔", "断裂浮桥", "潮汐港", "漂浮航标群"],
  desert: ["半埋石塔", "风蚀门廊", "沙下旧路", "孤立补给站"],
  forest: ["根系拱门", "穿楼巨树", "雾林水镜", "生长观测台"],
  city: ["高架站", "旧城区塔楼", "规则广场", "夜间换乘站"],
  ruins: ["断裂穹顶", "残存纪念塔", "裂缝桥", "废弃观测所"],
  industrial: ["冷却塔群", "中央输送塔", "管线枢纽", "停机平台"],
};

const BIOME_ARTIFACTS: Record<PlanetBiomeId, Record<"claim" | "reason" | "evidence", string>> = {
  ocean: { claim: "航标碑", reason: "潮汐航路台", evidence: "漂流档案舱" },
  desert: { claim: "风蚀石碑", reason: "补给条件盘", evidence: "沙下档案匣" },
  forest: { claim: "回声石", reason: "根系条件台", evidence: "留痕树" },
  city: { claim: "街区标记碑", reason: "规则闸机", evidence: "公共档案柜" },
  ruins: { claim: "残存铭文", reason: "结构复原台", evidence: "遗迹记录箱" },
  industrial: { claim: "核心终端", reason: "运行控制台", evidence: "数据舱" },
};

function stableHash(value: string) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function opinionText(opinion: OpinionLike) {
  return [
    opinion.title,
    opinion.summary,
    opinion.claim,
    opinion.reason,
    opinion.conditions?.join(" "),
    opinion.evidence?.join(" "),
    opinion.camp,
  ].filter(Boolean).join(" ");
}

function chooseByScores<T extends string>(
  ids: readonly T[],
  rules: Array<{ id: T; weight: number; pattern: RegExp }>,
  text: string,
  seed: string,
): T {
  const scores = new Map<T, number>(ids.map((id) => [id, 0]));
  for (const rule of rules) {
    if (rule.pattern.test(text)) scores.set(rule.id, (scores.get(rule.id) ?? 0) + rule.weight);
  }
  let best = -1;
  let tied: T[] = [];
  for (const id of ids) {
    const score = scores.get(id) ?? 0;
    if (score > best) {
      best = score;
      tied = [id];
    } else if (score === best) {
      tied.push(id);
    }
  }
  const pool = best > 0 ? tied : [...ids];
  return pool[stableHash(seed) % pool.length];
}

export function resolveSemanticGrammar(opinion: OpinionLike): SemanticGrammarId {
  const ids = Object.keys(SEMANTIC_GRAMMARS) as SemanticGrammarId[];
  return chooseByScores(ids, GRAMMAR_RULES, opinionText(opinion), `grammar:${opinion.id}`);
}

export function resolvePlanetBiome(opinion: OpinionLike): PlanetBiomeId {
  const ids = Object.keys(PLANET_BIOMES) as PlanetBiomeId[];
  return chooseByScores(ids, BIOME_RULES, opinionText(opinion), `biome:${opinion.id}`);
}

function pick<T>(items: readonly T[], seed: string): T {
  return items[stableHash(seed) % items.length];
}

function grammarReasonIntent(grammar: SemanticGrammarDefinition) {
  switch (grammar.id) {
    case "crossroads": return "改变观点自己的成立条件，观察哪条解释路线因此变得可用。";
    case "archive": return "沿着理由回到可追溯材料，区分已记录内容和解释。";
    case "mechanism": return "改变一个依赖或输入，观察系统中的关系如何变化。";
    case "theater": return "换到另一个角色位置，对照同一事实为何产生不同解释。";
    case "sanctuary": return "通过倾听与停留，找出这条观点真正保护的价值或边界。";
  }
}

function evidenceIntent(biome: PlanetBiomeDefinition) {
  switch (biome.id) {
    case "ocean": return "沿信标追踪来源，把远处的‘声音’和真正可抵达的材料区分开。";
    case "desert": return "从少量残留痕迹中复原来源，同时明确哪些部分已经无法确认。";
    case "forest": return "沿着关系和时间留下的痕迹追到原始材料，避免把相关性误当成单一原因。";
    case "city": return "对照不同公共记录与角色位置，判断材料覆盖的是个人还是制度层面。";
    case "ruins": return "从后果与残骸倒推可确认的记录，但不把结果本身当作原因。";
    case "industrial": return "沿数据流和依赖链回溯原始记录，确认系统描述是否有来源支撑。";
  }
}

function worldChange(grammar: SemanticGrammarDefinition, biome: PlanetBiomeDefinition) {
  const base = {
    reconnect: "被分开的路线重新出现可读连接",
    reveal: "隐藏层次与材料关系逐渐显现",
    awaken: "关键系统重新启动并显示依赖关系",
    illuminate: "不同位置被依次照亮，视角关系变得可读",
    bloom: "被压抑的关系与边界以克制的生长方式显现",
  }[grammar.resonanceVerb];
  return `${base}；${biome.resonanceModifier}`;
}

export function buildPlanetSceneSpec(opinion: OpinionLike): PlanetSceneSpec {
  const semanticGrammar = resolveSemanticGrammar(opinion);
  const biome = resolvePlanetBiome(opinion);
  const grammar = SEMANTIC_GRAMMARS[semanticGrammar];
  const biomeDef = PLANET_BIOMES[biome];
  const signatureLandmark = `${pick(BIOME_LANDMARKS[biome], `${opinion.id}:biome-landmark`)} · ${pick(GRAMMAR_LANDMARKS[semanticGrammar], `${opinion.id}:grammar-landmark`)}`;
  const secondaryLandmark = pick(BIOME_LANDMARKS[biome], `${opinion.id}:secondary`);
  const artifacts = BIOME_ARTIFACTS[biome];
  const claimMode = biomeDef.claimInteraction;
  const reasonMode = grammar.reasonInteraction;
  const evidenceMode = biomeDef.evidenceInteraction;

  const spec: PlanetSceneSpec = {
    version: 1,
    opinionId: opinion.id,
    semanticGrammar,
    biome,
    semanticEquation: `${grammar.meaning} × ${biomeDef.meaning}`,
    signatureLandmark,
    secondaryLandmark,
    coreParadox: `${grammar.tension} 同时，这颗星球的环境提醒我们：${biomeDef.tension}`,
    kanshanOpeningQuestion: `${biomeDef.kanshanLens} ${grammar.kanshanLens}`,
    spatialPattern: `${grammar.layout} logic arranged as ${biomeDef.topology}`,
    fragments: {
      claim: {
        mode: claimMode,
        artifact: artifacts.claim,
        intent: `先从环境中观察这条观点究竟在主张什么。${biomeDef.kanshanLens}`,
      },
      reason: {
        mode: reasonMode,
        artifact: artifacts.reason,
        intent: grammarReasonIntent(grammar),
      },
      evidence: {
        mode: evidenceMode,
        artifact: artifacts.evidence,
        intent: evidenceIntent(biomeDef),
      },
    },
    resonance: {
      verb: grammar.resonanceVerb,
      modifier: biomeDef.resonanceModifier,
      worldChange: worldChange(grammar, biomeDef),
    },
    artDirectionPrompt: [
      "narrative painterly 2.5D exploration world",
      `semantic grammar: ${semanticGrammar} — ${grammar.meaning}`,
      `biome: ${biome} — ${biomeDef.meaning}`,
      `signature landmark: ${signatureLandmark}`,
      `core paradox: ${grammar.tension}`,
      `topology: ${biomeDef.topology}, motion: ${biomeDef.motion}`,
      "quiet exploration, large negative space, distant landmark, no readable text, no UI, no crowds",
      "blue-hour base lighting with restrained warm guidance lights, layered foreground occlusion",
    ].join("; "),
  };
  return spec;
}

export function legacyThemeIdForGrammar(grammar: SemanticGrammarId) {
  switch (grammar) {
    case "crossroads": return "crossroads" as const;
    case "archive": return "archive" as const;
    case "theater": return "theater" as const;
    case "sanctuary": return "forest" as const;
    case "mechanism": return "machine" as const;
  }
}
