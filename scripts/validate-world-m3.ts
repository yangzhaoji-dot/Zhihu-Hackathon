/**
 * M3 对话与比较 —— 纯逻辑校验脚本（world-design-v0.2 §9 M3 验收）。
 *
 * 运行：npx bun scripts/validate-world-m3.ts
 *
 * 只 import 纯逻辑层（scene-feedback / progress-merge / dialogue/validate +
 * 种子与配置数据），不碰 server-only / db / React，无需 Bun 插件 stub。
 *
 * 覆盖：
 * 1. 场景反馈规则表全组合（§5.4）：consensus/missing/evidence 三轴 +
 *    乱序归一化键 + 无 zone 上下文时不产生 ruin；
 * 2. progress 增量合并语义（§4.4）：数组并集去重、worldState 浅合并覆盖、
 *    空 patch 不变、emptyProgress 空对象结构；
 * 3. dialogue 响应校验器（§4.2 红线）：越界 sourceId/opinionId 整段回退、
 *    未知动作类型、行数/文本/动作数上限、合法输出剥离多余字段。
 */

import { OPINIONS } from "../src/lib/opinion/seed";
import { qLuociWorld as config } from "../src/lib/opinion/worlds/q_luoci";
import type { CollisionAnalysis, Opinion } from "../src/lib/opinion/types";
import { validateDialogueLines } from "../src/lib/opinion/dialogue/validate";
import { emptyProgress, mergeProgressPatch } from "../src/lib/world/progress-merge";
import {
  deriveSceneFeedback,
  verdictStrongerSide,
  weakerSide,
} from "../src/lib/world/scene-feedback";

let failures = 0;
function ok(message: string) {
  console.log(`OK   ${message}`);
}
function fail(message: string) {
  failures += 1;
  console.error(`FAIL ${message}`);
}
function check(condition: boolean, message: string) {
  if (condition) ok(message);
  else fail(message);
}

const op = (id: string): Opinion => OPINIONS.find((o) => o.id === id)!;
const zoneOf = (opinionId: string) =>
  config.npcs.find((n) => n.opinionId === opinionId)?.zoneId;

function makeAnalysis(partial: Partial<CollisionAnalysis> = {}): CollisionAnalysis {
  return {
    consensus: "",
    coreDisagreement: "分歧",
    conditions: { a: "条件A", b: "条件B" },
    evidence: { a: "证据A", b: "证据B", verdict: "双方证据相当" },
    missing: [],
    candidate: { title: "候选", summary: "说明" },
    source: "ai",
    ...partial,
  };
}

// ══════════════════════════════════════════════════════════════════════════
// 1. 场景反馈规则表（§5.4）
// ══════════════════════════════════════════════════════════════════════════
const A = op("o_stoploss"); // zone z_stoploss, sources 2
const B = op("o_cashflow"); // zone z_steady, sources 2
const CTX = {
  zoneIds: { a: zoneOf("o_stoploss"), b: zoneOf("o_cashflow") },
  positions: { a: { x: 7, y: 6 }, b: { x: 33, y: 6 } },
};

// 1.1 三条全空 → 无写入
{
  const r = deriveSceneFeedback(makeAnalysis(), A, B, CTX);
  check(
    Object.keys(r.worldState).length === 0 && r.applied.length === 0,
    "规则表：共识空 + missing 空 + 证据相当 → 无任何场景写入",
  );
}

// 1.2 仅共识非空 → bridge built，键乱序归一化
{
  const r1 = deriveSceneFeedback(makeAnalysis({ consensus: "都要先评估退出成本" }), A, B, CTX);
  check(
    r1.worldState["bridge:o_cashflow:o_stoploss"] === "built" &&
      r1.applied.includes("bridge"),
    "规则表：共识非空 → bridge:<排序后a>:<b> = built",
  );
  const r2 = deriveSceneFeedback(makeAnalysis({ consensus: "都要先评估退出成本" }), B, A, {
    zoneIds: { a: zoneOf("o_cashflow"), b: zoneOf("o_stoploss") },
    positions: { a: { x: 33, y: 6 }, b: { x: 7, y: 6 } },
  });
  check(
    Object.keys(r2.worldState).join() === Object.keys(r1.worldState).join() &&
      r2.comparedPair.join(":") === r1.comparedPair.join(":"),
    "规则表：乱序入参产生相同归一化键与 comparedPair",
  );
}

// 1.3 共识为空白字符 → 不算非空
{
  const r = deriveSceneFeedback(makeAnalysis({ consensus: "   " }), A, B, CTX);
  check(!Object.keys(r.worldState).some((k) => k.startsWith("bridge:")), "规则表：共识为空白字符 → 不点亮桥");
}

// 1.4 仅 missing 非空 → 迷雾标记（带两区中点坐标）
{
  const r = deriveSceneFeedback(makeAnalysis({ missing: ["缺长期追踪"] }), A, B, CTX);
  const marker = r.worldState["fog_rt:o_cashflow:o_stoploss"] as { x: number; y: number };
  check(
    marker && marker.x === 20 && marker.y === 6 && r.applied.includes("fog"),
    "规则表：missing 非空 → fog_rt 迷雾标记落于两观点中点 (20,6)",
  );
}

// 1.5 missing 非空但无位置上下文 → 标记存在但不带坐标
{
  const r = deriveSceneFeedback(makeAnalysis({ missing: ["缺长期追踪"] }), A, B);
  check(
    r.worldState["fog_rt:o_cashflow:o_stoploss"] === true,
    "规则表：无位置上下文时迷雾标记退化为布尔占位",
  );
}

// 1.6 verdict 显式指认 A 更充分 → B 方区域 ruin
{
  const r = deriveSceneFeedback(
    makeAnalysis({ evidence: { a: "x", b: "y", verdict: "A 的证据更充分，B 偏主观" } }),
    A,
    B,
    CTX,
  );
  check(
    r.worldState["ruin:z_steady"] === "marked" && !r.worldState["ruin:z_stoploss"],
    "规则表：verdict 指认 A 更充分 → B 方区域（z_steady）ruin 标记",
  );
}

// 1.7 verdict 指认 B 更充分 → A 方区域 ruin
{
  const r = deriveSceneFeedback(
    makeAnalysis({ evidence: { a: "x", b: "y", verdict: "B方数据更扎实" } }),
    A,
    B,
    CTX,
  );
  check(
    r.worldState["ruin:z_stoploss"] === "marked",
    "规则表：verdict 指认 B 更充分 → A 方区域（z_stoploss）ruin 标记",
  );
}

// 1.8 verdict 模糊 → 无 ruin（且双方都有来源，兜底规则不触发）
{
  const r = deriveSceneFeedback(makeAnalysis(), A, B, CTX);
  check(
    !Object.keys(r.worldState).some((k) => k.startsWith("ruin:")),
    "规则表：verdict 模糊 + 双方均有来源 → 无 ruin（宁可不标）",
  );
}

// 1.9 §6.4 兜底：一方 sourceIds 为空（AI 推演）→ 该方区域 ruin
{
  const AI = op("o_threshold"); // sourceIds: ["s9"]？—— threshold 有 s9；构造无来源变体
  const aiNoSource: Opinion = { ...AI, sourceIds: [] };
  const r = deriveSceneFeedback(
    makeAnalysis(),
    aiNoSource,
    A,
    { zoneIds: { a: "z_station", b: "z_stoploss" } },
  );
  check(
    r.worldState["ruin:z_station"] === "marked",
    "规则表：AI 方无来源 + 对方有来源 → AI 方区域 ruin（§6.4 停工建筑）",
  );
  check(weakerSide(makeAnalysis(), aiNoSource, A) === "a", "weakerSide 兜底：无来源方为较弱方");
}

// 1.10 双方都无来源 → 无 ruin
{
  const noSrcA: Opinion = { ...A, sourceIds: [] };
  const noSrcB: Opinion = { ...B, sourceIds: [] };
  check(
    weakerSide(makeAnalysis(), noSrcA, noSrcB) === null,
    "规则表：双方都无来源 → 无法判定，无 ruin",
  );
}

// 1.11 verdict 指认优先于来源数兜底
{
  const aiNoSource: Opinion = { ...op("o_threshold"), sourceIds: [] };
  const r = deriveSceneFeedback(
    makeAnalysis({ evidence: { a: "x", b: "y", verdict: "B 更充分" } }),
    aiNoSource, // a 无来源，但 verdict 说 B 更强 → 较弱方仍是 a
    A,
    { zoneIds: { a: "z_station", b: "z_stoploss" } },
  );
  check(
    r.worldState["ruin:z_station"] === "marked",
    "规则表：verdict 显式指认优先于来源数兜底",
  );
  check(
    verdictStrongerSide("B 更充分") === "b" && verdictStrongerSide("双方证据相当") === null,
    "verdictStrongerSide：指认与模糊两种形态",
  );
}

// 1.12 无 zone 上下文 → 不产生 ruin
{
  const r = deriveSceneFeedback(
    makeAnalysis({ evidence: { a: "x", b: "y", verdict: "A 更充分" } }),
    A,
    B,
  );
  check(
    !Object.keys(r.worldState).some((k) => k.startsWith("ruin:")),
    "规则表：缺 zoneIds 上下文 → 不产生 ruin 标记",
  );
}

// 1.13 三条同时命中 → 桥 + 迷雾 + ruin 同时写入
{
  const r = deriveSceneFeedback(
    makeAnalysis({
      consensus: "都承认身心与现金流是变量",
      missing: ["缺五年后追踪"],
      evidence: { a: "x", b: "y", verdict: "A 的证据更充分" },
    }),
    A,
    B,
    CTX,
  );
  check(
    r.worldState["bridge:o_cashflow:o_stoploss"] === "built" &&
      Boolean(r.worldState["fog_rt:o_cashflow:o_stoploss"]) &&
      r.worldState["ruin:z_steady"] === "marked" &&
      r.applied.length === 3,
    "规则表：共识+missing+证据强弱同时命中 → 桥/迷雾/ruin 三项齐写",
  );
}

// ══════════════════════════════════════════════════════════════════════════
// 2. progress 增量合并语义（§4.4）
// ══════════════════════════════════════════════════════════════════════════
{
  const empty = emptyProgress("q_luoci");
  check(
    empty.questionId === "q_luoci" &&
      empty.visitedNpcIds.length === 0 &&
      empty.collectedOpinionIds.length === 0 &&
      empty.foundSourceIds.length === 0 &&
      empty.firedTriggerIds.length === 0 &&
      Object.keys(empty.worldState).length === 0,
    "progress：emptyProgress 返回空对象结构（ok:true 空数组字段契约的底层）",
  );

  const step1 = mergeProgressPatch(empty, {
    addVisitedNpc: ["npc_stoploss"],
    addCollectedOpinion: ["o_stoploss"],
    addFoundSource: ["s1"],
    addFiredTrigger: ["t_first_land"],
    setWorldState: { "bridge:o_cashflow:o_stoploss": "built" },
  });
  const step2 = mergeProgressPatch(step1, {
    addVisitedNpc: ["npc_stoploss", "npc_cashflow"], // 含重复
    addCollectedOpinion: ["o_cashflow"],
    setWorldState: { "fog:z_mist": "lifted" },
  });
  check(
    step2.visitedNpcIds.join(",") === "npc_stoploss,npc_cashflow" &&
      step2.collectedOpinionIds.join(",") === "o_stoploss,o_cashflow" &&
      step2.foundSourceIds.join(",") === "s1" &&
      step2.firedTriggerIds.join(",") === "t_first_land",
    "progress：数组字段并集去重且保序",
  );
  check(
    step2.worldState["bridge:o_cashflow:o_stoploss"] === "built" &&
      step2.worldState["fog:z_mist"] === "lifted",
    "progress：worldState 浅合并（不同键共存）",
  );

  const step3 = mergeProgressPatch(step2, {
    setWorldState: { "fog:z_mist": "marked-again" },
  });
  check(
    step3.worldState["fog:z_mist"] === "marked-again",
    "progress：worldState 同键后写覆盖",
  );

  const identity = mergeProgressPatch(step2, {});
  check(
    JSON.stringify({ ...identity, updatedAt: undefined }) ===
      JSON.stringify({ ...step2, updatedAt: undefined }),
    "progress：空 patch 不改变内容",
  );
  check(
    step2 !== step1 && step1.visitedNpcIds.length === 1,
    "progress：合并不可变（不修改入参）",
  );
}

// ══════════════════════════════════════════════════════════════════════════
// 3. dialogue 响应校验器（§4.2 红线）
// ══════════════════════════════════════════════════════════════════════════
const WL = {
  sourceIds: new Set(["s1", "s2"]),
  opinionIds: new Set(["o_stoploss"]),
};

{
  const valid = validateDialogueLines(
    {
      lines: [
        { speaker: "npc", text: "你好", extra: "stripped" },
        {
          speaker: "npc",
          text: "看原文",
          actions: [
            { type: "show-source", sourceId: "s1", hack: true },
            { type: "collect-opinion", opinionId: "o_stoploss" },
            { type: "open-compare" },
            { type: "open-stance", opinionId: "o_stoploss" },
          ].slice(0, 3),
        },
      ],
    },
    WL,
  );
  check(
    valid !== null &&
      valid.length === 2 &&
      !("extra" in valid[0]) &&
      valid[1].actions?.length === 3 &&
      !("hack" in (valid[1].actions?.[0] ?? {})),
    "校验器：合法回复通过，且剥离多余字段（防注入）",
  );
}

{
  const outOfRange = validateDialogueLines(
    {
      lines: [
        { speaker: "npc", text: "第一行合法" },
        {
          speaker: "npc",
          text: "这行引用了没注入过的来源",
          actions: [{ type: "show-source", sourceId: "s99" }],
        },
      ],
    },
    WL,
  );
  check(outOfRange === null, "校验器红线：越界 sourceId → 整段作废回退模板");
}

{
  const badOpinion = validateDialogueLines(
    {
      lines: [
        {
          speaker: "npc",
          text: "收卡",
          actions: [{ type: "collect-opinion", opinionId: "o_cashflow" }], // 不在白名单
        },
      ],
    },
    WL,
  );
  check(badOpinion === null, "校验器红线：越界 opinionId（collect-opinion）→ 整段作废");

  const badStance = validateDialogueLines(
    {
      lines: [
        {
          speaker: "npc",
          text: "标态度",
          actions: [{ type: "open-stance", opinionId: "o_window" }],
        },
      ],
    },
    WL,
  );
  check(badStance === null, "校验器红线：越界 opinionId（open-stance）→ 整段作废");
}

{
  check(
    validateDialogueLines(
      { lines: [{ speaker: "npc", text: "x", actions: [{ type: "teleport", to: "0,0" }] }] },
      WL,
    ) === null,
    "校验器：未知动作类型 → 作废",
  );
  check(
    validateDialogueLines({ lines: [] }, WL) === null &&
      validateDialogueLines({}, WL) === null &&
      validateDialogueLines("not json", WL) === null &&
      validateDialogueLines(null, WL) === null,
    "校验器：空 lines / 缺 lines / 非对象 → 作废",
  );
  check(
    validateDialogueLines(
      {
        lines: Array.from({ length: 7 }, (_, i) => ({ speaker: "npc", text: `第${i}行` })),
      },
      WL,
    ) === null,
    "校验器：超过 6 行上限 → 作废",
  );
  check(
    validateDialogueLines({ lines: [{ speaker: "npc", text: "  " }] }, WL) === null &&
      validateDialogueLines({ lines: [{ speaker: "npc", text: "x".repeat(301) }] }, WL) === null &&
      validateDialogueLines({ lines: [{ speaker: "bot", text: "hi" }] }, WL) === null,
    "校验器：空白文本 / 超长文本 / 非法 speaker → 作废",
  );
  check(
    validateDialogueLines(
      {
        lines: [
          {
            speaker: "npc",
            text: "动作过多",
            actions: [
              { type: "show-source", sourceId: "s1" },
              { type: "show-source", sourceId: "s2" },
              { type: "collect-opinion", opinionId: "o_stoploss" },
              { type: "open-compare" },
            ],
          },
        ],
      },
      WL,
    ) === null,
    "校验器：单行超过 3 个动作 → 作废",
  );
  check(
    validateDialogueLines(
      { lines: [{ speaker: "npc", text: "纯文本无动作" }] },
      WL,
    )?.length === 1,
    "校验器：无 actions 的纯文本行合法",
  );
}

// ── 汇总 ────────────────────────────────────────────────────────────────────
if (failures > 0) {
  console.error(`\n${failures} 项校验失败`);
  process.exit(1);
}
console.log("\n全部 M3 校验通过");
