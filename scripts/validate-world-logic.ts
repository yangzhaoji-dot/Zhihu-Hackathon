/**
 * 世界运行时纯逻辑校验脚本（world-design-v0.2 §9 M2 验收）。
 *
 * 运行：npx bun scripts/validate-world-logic.ts
 *
 * 只 import src/lib/world/* 纯逻辑层 + 世界配置（type-only 依赖 types.ts，
 * 不碰 store.ts 的 server-only，因此无需 Bun 插件 stub）。
 *
 * 覆盖：
 * 1. 碰撞边界：世界边缘 / monument·ruin 地形阻挡 / NPC·Poi 占格 / 裸地面可走；
 * 2. 阻挡条件：条件桥 requires 未满足 → blocked + 结构化 reason；
 *    comparedPairs 满足 / worldState stateKey 点亮后放行；fog Poi 从不阻挡；
 * 3. 落点推导三种情况：NPC 邻近空格 / 阵营区中心 / config.spawn 兜底；
 * 4. fog/station 重叠优先级：z_station ∩ z_mist（y11–13）取 station 可行走，
 *    纯雾区同样可走（fog 只做视觉叠加）。
 */

import { qLuociWorld as config } from "../src/lib/opinion/worlds/q_luoci";
import { pointInRect, rectCenter, TILE_SIZE } from "../src/lib/world/geometry";
import { resolveSpawn } from "../src/lib/world/spawn";
import { canTransition, transition, movementLocked } from "../src/lib/world/state-machine";
import {
  effectiveZoneAt,
  isPoiRequirementMet,
  isWalkable,
  poiRequirementReason,
  type WalkContext,
} from "../src/lib/world/walkability";

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

const EMPTY: WalkContext = {};

// ── 0. 常量与几何 ────────────────────────────────────────────────────────────
check(TILE_SIZE === 48, "1 格 = 48px 常量");
check(
  pointInRect({ x: 2, y: 2 }, { x: 2, y: 2, w: 11, h: 9 }) &&
    !pointInRect({ x: 13, y: 2 }, { x: 2, y: 2, w: 11, h: 9 }),
  "pointInRect 格语义（右边界开区间）",
);

// ── 1. 状态机迁移表（§5.1） ─────────────────────────────────────────────────
check(canTransition("loading", "landing"), "loading → landing 合法");
check(canTransition("explore", "dialogue") && canTransition("dialogue", "explore"), "explore ⇄ dialogue 合法");
check(canTransition("explore", "compare") && canTransition("compare", "explore"), "compare 占位迁移存在（M3）");
check(canTransition("explore", "judgement") && canTransition("judgement", "explore"), "judgement 占位迁移存在（M4）");
check(canTransition("explore", "leaving"), "explore → leaving 合法");
check(
  !canTransition("leaving", "explore") && !canTransition("loading", "explore") && !canTransition("dialogue", "leaving"),
  "非法迁移被拒（leaving 终态 / loading 不可直达 explore / dialogue 不可直接 leaving）",
);
let threw = false;
try {
  transition("loading", "explore");
} catch {
  threw = true;
}
check(threw, "transition() 非法迁移抛异常");
check(movementLocked("dialogue") && !movementLocked("explore"), "对话锁定移动、探索不锁定");

// ── 2. 碰撞边界 ─────────────────────────────────────────────────────────────
check(isWalkable(config, EMPTY, { x: -1, y: 5 }).blocked, "世界左边界外阻挡");
check(isWalkable(config, EMPTY, { x: 40, y: 5 }).blocked, "世界右边界外阻挡（x=40 越界）");
check(isWalkable(config, EMPTY, { x: 20, y: 24 }).blocked, "世界下边界外阻挡（y=24 越界）");
check(
  isWalkable(config, EMPTY, { x: -1, y: 5 }).reason?.kind === "bounds",
  "越界 reason.kind = bounds",
);

// 裸地面（无 zone 覆盖）默认可走 —— 否则止损区与车站之间无法通行
check(!isWalkable(config, EMPTY, { x: 15, y: 6 }).blocked, "无 zone 覆盖的裸地面可走 (15,6)");

// plaza 可走
check(!isWalkable(config, EMPTY, { x: 3, y: 3 }).blocked, "止损区 plaza 可走 (3,3)");

// NPC 占格阻挡
const npcStop = config.npcs.find((n) => n.id === "npc_stoploss")!;
const npcBlock = isWalkable(config, EMPTY, npcStop.pos);
check(npcBlock.blocked && npcBlock.reason?.kind === "npc", `NPC 占格阻挡 (${npcStop.pos.x},${npcStop.pos.y})`);

// 纪念碑 / 观测点 / 火箭坪 Poi 恒阻挡（交互半径 1.5 格，不影响触发）
for (const id of ["poi_monument", "poi_observatory", "poi_rocket"] as const) {
  const poi = config.pois.find((p) => p.id === id)!;
  const res = isWalkable(config, EMPTY, poi.pos);
  check(res.blocked && res.reason?.kind === "poi", `${id} (${poi.kind}) 占格阻挡`);
}

// ── 3. 阻挡条件 ─────────────────────────────────────────────────────────────
const bridgeA = config.pois.find((p) => p.id === "poi_bridge_a")!;
const bridgeBlocked = isWalkable(config, EMPTY, bridgeA.pos);
check(bridgeBlocked.blocked, "条件桥 A 未满足 requires 时阻挡");
check(
  bridgeBlocked.reason?.kind === "requires-compare",
  "条件桥 A reason.kind = requires-compare",
);
if (bridgeBlocked.reason?.kind === "requires-compare") {
  const [a, b] = bridgeBlocked.reason.pair;
  check(a === "o_stoploss" && b === "o_cashflow", "条件桥 A reason.pair = o_stoploss × o_cashflow");
}

// comparedPairs 满足后放行
const ctxCompared: WalkContext = { comparedPairs: [["o_cashflow", "o_stoploss"]] }; // 乱序也应命中
check(isPoiRequirementMet(bridgeA, ctxCompared), "comparedPairs（乱序）满足后桥可走");
check(!isWalkable(config, ctxCompared, bridgeA.pos).blocked, "桥满足条件后 isWalkable 不阻挡");

// worldState stateKey 点亮后放行（§3.4：bridge:a:b = "built"）
const ctxBuilt: WalkContext = { worldState: { "bridge:o_stoploss:o_cashflow": "built" } };
check(isPoiRequirementMet(bridgeA, ctxBuilt), "worldState bridge built 点亮后桥可走");

// 合成 requires-sources 场景：sourceIds 部分发现 → blocked + missing；全部发现 → 放行
const synthetic = {
  ...bridgeA,
  requires: { sourceIds: ["s1", "s2"] },
  stateKey: undefined,
};
const halfFound = poiRequirementReason(synthetic, { foundSourceIds: ["s1"] });
check(
  halfFound?.kind === "requires-sources" && halfFound.missing.length === 1 && halfFound.missing[0] === "s2",
  "requires-sources 未满足时 missing = [s2]",
);
check(
  isPoiRequirementMet(synthetic, { foundSourceIds: ["s1", "s2"] }),
  "sourceIds 全部发现后放行",
);

// 合成 requires-stance 场景
const syntheticStance = { ...bridgeA, requires: { stanceCount: 2 }, stateKey: undefined };
check(
  poiRequirementReason(syntheticStance, { stanceCount: 1 })?.kind === "requires-stance",
  "requires-stance 未满足时给出原因",
);
check(isPoiRequirementMet(syntheticStance, { stanceCount: 2 }), "stanceCount 达标后放行");

// fog Poi 从不阻挡（迷雾只做视觉叠加）
const fogPoi = config.pois.find((p) => p.id === "poi_fog_mist")!;
check(!isWalkable(config, EMPTY, fogPoi.pos).blocked, "fog Poi 不阻挡");

// ── 4. 落点推导三种情况 ─────────────────────────────────────────────────────
// 4.1 观点有 NPC：落在 NPC 邻近空格（不是 NPC 占格本身，且可行走）
const spawnNpc = resolveSpawn(config, "o_stoploss");
check(
  !isWalkable(config, EMPTY, spawnNpc).blocked,
  `o_stoploss 落点 (${spawnNpc.x},${spawnNpc.y}) 可行走`,
);
check(
  !(spawnNpc.x === npcStop.pos.x && spawnNpc.y === npcStop.pos.y),
  "o_stoploss 落点不在 NPC 占格上",
);
check(
  Math.max(Math.abs(spawnNpc.x - npcStop.pos.x), Math.abs(spawnNpc.y - npcStop.pos.y)) === 1,
  "o_stoploss 落点为 NPC 8 邻域最近格",
);

// 4.2 无 NPC 的观点 + camp：落在阵营区内（维权区中心附近）
const spawnCamp = resolveSpawn(config, "o_unknown_x", { camp: "维权派" });
const rightsZone = config.zones.find((z) => z.id === "z_rights")!;
check(
  pointInRect(spawnCamp, rightsZone.rect),
  `未知观点 + camp=维权派 → 落点 (${spawnCamp.x},${spawnCamp.y}) 在 z_rights 内`,
);
check(
  Math.hypot(spawnCamp.x - rectCenter(rightsZone.rect).x, spawnCamp.y - rectCenter(rightsZone.rect).y) <= 2,
  "阵营落点贴近 zone 中心",
);

// 4.3 无 NPC 无 camp：兜底 config.spawn
const spawnDefault = resolveSpawn(config, "o_unknown_y");
check(
  spawnDefault.x === config.spawn.x && spawnDefault.y === config.spawn.y,
  "未知观点无 camp → 兜底 config.spawn (20,10)",
);

// AI 融合观点（npc_threshold 在中央车站）落点邻近售票员且不与 Poi/NPC 冲突
const spawnAi = resolveSpawn(config, "o_threshold");
check(!isWalkable(config, EMPTY, spawnAi).blocked, `o_threshold 落点 (${spawnAi.x},${spawnAi.y}) 可行走`);

// ── 5. fog / station 重叠优先级 ─────────────────────────────────────────────
// (20,12)：z_station (x18–22, y10–14) ∩ z_mist (x14–26, y11–13)
const overlap = effectiveZoneAt(config, { x: 20, y: 12 });
check(overlap?.id === "z_station", "重叠区 (20,12) 生效 zone = z_station（station > fog）");
check(
  effectiveZoneAt(config, { x: 19, y: 13 })?.terrain === "station",
  "重叠区下缘 (19,13) 仍取 station",
);
// 纯雾区（车站西侧）：生效 zone 为 fog，且 fog 不阻挡
const pureFog = effectiveZoneAt(config, { x: 15, y: 12 });
check(pureFog?.id === "z_mist" && pureFog.terrain === "fog", "纯雾区 (15,12) 生效 zone = z_mist(fog)");
check(!isWalkable(config, EMPTY, { x: 15, y: 12 }).blocked, "fog 只做视觉叠加，不阻挡行走");

// ── 汇总 ────────────────────────────────────────────────────────────────────
if (failures > 0) {
  console.error(`\n${failures} 项校验失败`);
  process.exit(1);
}
console.log("\n全部校验通过");
