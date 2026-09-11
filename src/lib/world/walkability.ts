// 世界运行时纯逻辑 —— 可行走性判定（world-design-v0.2 §5.2）。
//
// 规则（与 §5.2 对齐，灰盒可玩性补丁见下）：
// - Zone 按 terrain 判定：plaza/road/bridge/station 可走；fog 只做视觉叠加、
//   不阻挡；ruin/monument 阻挡。
// - 不被任何 Zone 覆盖的裸地面默认可走（否则 q_luoci 止损区/纪念碑周围无法
//   到达 —— §5.2 的"其余默认阻挡"指 terrain 白名单之外的地形，而非无区地面）。
// - 重叠区取优先级最高的 Zone 生效：station > bridge > road > plaza > fog
//   > monument > ruin（已知用例：z_station 与 z_mist 在 y11–13 重叠时
//   station 可行走、fog 仅叠加视觉）。
// - Poi 占自身 1 格：fog Poi 不阻挡；bridge/gate 在 requires 未满足时阻挡并
//   给出条件原因，满足后变为可走；monument/observatory/rocket/chest 恒阻挡
//   （交互半径 1.5 格，阻挡不影响触发）。
// - NPC 占自身 1 格（阻挡，落点推导依赖此规则找"邻近空格"）。
//
// 本文件不依赖 React/DOM。

import type { Poi, WorldConfig, Zone } from "@/lib/opinion/types";
import { zonesAt, type GridPos } from "./geometry";

export type BlockReason =
  | { kind: "bounds" }
  | { kind: "terrain"; terrain: Zone["terrain"]; zoneId: string }
  | { kind: "npc"; npcId: string }
  | { kind: "poi"; poiId: string; poiKind: Poi["kind"] }
  | { kind: "requires-sources"; poiId: string; sourceIds: string[]; missing: string[] }
  | { kind: "requires-compare"; poiId: string; pair: [string, string] }
  | { kind: "requires-stance"; poiId: string; count: number };

export interface WalkResult {
  blocked: boolean;
  reason?: BlockReason;
}

/** requires 判定所需的玩家进度快照（M2 内存态，M4 落库后同源）。 */
export interface WalkContext {
  worldState?: Record<string, unknown>;
  foundSourceIds?: readonly string[];
  comparedPairs?: readonly (readonly [string, string])[];
  stanceCount?: number;
}

const WALKABLE_TERRAINS: ReadonlySet<Zone["terrain"]> = new Set([
  "plaza",
  "road",
  "bridge",
  "station",
  "fog", // 视觉叠加，不阻挡
]);

/** 重叠区生效优先级（数字大者胜）。station > fog 是关键用例。 */
const TERRAIN_PRIORITY: Record<Zone["terrain"], number> = {
  station: 7,
  bridge: 6,
  road: 5,
  plaza: 4,
  fog: 3,
  monument: 2,
  ruin: 1,
};

/** requires 未满足时仍恒不阻挡的 Poi 类型。 */
const NON_BLOCKING_POI_KINDS: ReadonlySet<Poi["kind"]> = new Set(["fog"]);

/** requires 满足后可通行的 Poi 类型（未满足时阻挡并提示条件）。 */
const GATED_POI_KINDS: ReadonlySet<Poi["kind"]> = new Set(["bridge", "gate"]);

export function normalizePairKey(a: string, b: string): string {
  return [a, b].sort().join(":");
}

/** Poi 的成立/通行条件是否已满足。 */
export function isPoiRequirementMet(poi: Poi, ctx: WalkContext = {}): boolean {
  if (!poi.requires) return true;
  // stateKey 已被世界动态状态点亮（如 bridge:a:b = "built"）→ 直接放行。
  if (poi.stateKey && ctx.worldState && Boolean(ctx.worldState[poi.stateKey])) {
    return true;
  }
  const { sourceIds, comparedPair, stanceCount } = poi.requires;
  if (sourceIds && sourceIds.length > 0) {
    const found = new Set(ctx.foundSourceIds ?? []);
    if (!sourceIds.every((id) => found.has(id))) return false;
  }
  if (comparedPair) {
    const key = normalizePairKey(comparedPair[0], comparedPair[1]);
    const done = (ctx.comparedPairs ?? []).some(
      ([a, b]) => normalizePairKey(a, b) === key,
    );
    if (!done) return false;
  }
  if (typeof stanceCount === "number") {
    if ((ctx.stanceCount ?? 0) < stanceCount) return false;
  }
  return true;
}

/** requires 未满足时的结构化原因（供 i18n 条件提示）。 */
export function poiRequirementReason(poi: Poi, ctx: WalkContext = {}): BlockReason | null {
  const req = poi.requires;
  if (!req) return null;
  if (req.sourceIds && req.sourceIds.length > 0) {
    const found = new Set(ctx.foundSourceIds ?? []);
    const missing = req.sourceIds.filter((id) => !found.has(id));
    if (missing.length > 0) {
      return { kind: "requires-sources", poiId: poi.id, sourceIds: req.sourceIds, missing };
    }
  }
  if (req.comparedPair) {
    const key = normalizePairKey(req.comparedPair[0], req.comparedPair[1]);
    const done = (ctx.comparedPairs ?? []).some(
      ([a, b]) => normalizePairKey(a, b) === key,
    );
    const built = poi.stateKey && ctx.worldState && Boolean(ctx.worldState[poi.stateKey]);
    if (!done && !built) {
      return { kind: "requires-compare", poiId: poi.id, pair: req.comparedPair };
    }
  }
  if (typeof req.stanceCount === "number" && (ctx.stanceCount ?? 0) < req.stanceCount) {
    return { kind: "requires-stance", poiId: poi.id, count: req.stanceCount };
  }
  return null;
}

/** 覆盖某点的生效 Zone（重叠取优先级最高）；无覆盖返回 null（裸地面）。 */
export function effectiveZoneAt(config: WorldConfig, pos: GridPos): Zone | null {
  const covering = zonesAt(config.zones, pos);
  if (covering.length === 0) return null;
  return covering.reduce((best, zone) =>
    TERRAIN_PRIORITY[zone.terrain] > TERRAIN_PRIORITY[best.terrain] ? zone : best,
  );
}

/** 某格上的 Poi / NPC（占格判定用格心取整）。 */
export function poiAt(config: WorldConfig, pos: GridPos): Poi | null {
  const cell = { x: Math.floor(pos.x + 0.5), y: Math.floor(pos.y + 0.5) };
  return config.pois.find((p) => p.pos.x === cell.x && p.pos.y === cell.y) ?? null;
}

export function npcAt(config: WorldConfig, pos: GridPos) {
  const cell = { x: Math.floor(pos.x + 0.5), y: Math.floor(pos.y + 0.5) };
  return config.npcs.find((n) => n.pos.x === cell.x && n.pos.y === cell.y) ?? null;
}

/** 主判定：点 pos（格坐标，浮点）是否可行走。 */
export function isWalkable(
  config: WorldConfig,
  ctx: WalkContext,
  pos: GridPos,
): WalkResult {
  // 1. 世界边界
  if (pos.x < 0 || pos.y < 0 || pos.x >= config.size.w || pos.y >= config.size.h) {
    return { blocked: true, reason: { kind: "bounds" } };
  }

  // 2. Zone 地形（重叠取优先级）
  const zone = effectiveZoneAt(config, pos);
  if (zone && !WALKABLE_TERRAINS.has(zone.terrain)) {
    return {
      blocked: true,
      reason: { kind: "terrain", terrain: zone.terrain, zoneId: zone.id },
    };
  }

  // 3. Poi 占格
  const poi = poiAt(config, pos);
  if (poi && !NON_BLOCKING_POI_KINDS.has(poi.kind)) {
    if (GATED_POI_KINDS.has(poi.kind)) {
      if (!isPoiRequirementMet(poi, ctx)) {
        const reason =
          poiRequirementReason(poi, ctx) ??
          ({ kind: "poi", poiId: poi.id, poiKind: poi.kind } as BlockReason);
        return { blocked: true, reason };
      }
      // 条件已满足的 bridge/gate：可通行。
    } else {
      return {
        blocked: true,
        reason: { kind: "poi", poiId: poi.id, poiKind: poi.kind },
      };
    }
  }

  // 4. NPC 占格
  const npc = npcAt(config, pos);
  if (npc) {
    return { blocked: true, reason: { kind: "npc", npcId: npc.id } };
  }

  return { blocked: false };
}
