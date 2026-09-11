// 世界运行时纯逻辑 —— 落点推导（world-design-v0.2 §5.1 / D1）。
//
// resolveSpawn 优先级：
// 1. opinionId 对应 NPC 的 pos 邻近空格（8 邻域 BFS 找最近可行走格）；
// 2. 该观点 camp 对应 zone 的中心（找最近可行走格）；
// 3. config.spawn 兜底（仍不可走则 BFS 到最近可行走格，最终返回原值）。
//
// 本文件不依赖 React/DOM。

import type { WorldConfig } from "@/lib/opinion/types";
import { rectCenter, type GridPos } from "./geometry";
import { isWalkable, type WalkContext } from "./walkability";

/** 从 origin 向外 BFS 找最近的可行走格（含 origin 自身）。找不到返回 null。 */
export function nearestWalkable(
  config: WorldConfig,
  ctx: WalkContext,
  origin: GridPos,
): GridPos | null {
  const start = { x: Math.round(origin.x), y: Math.round(origin.y) };
  const key = (p: GridPos) => `${p.x},${p.y}`;
  const seen = new Set<string>([key(start)]);
  const queue: GridPos[] = [start];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (!isWalkable(config, ctx, current).blocked) return current;
    for (const [dx, dy] of [
      [1, 0], [-1, 0], [0, 1], [0, -1],
      [1, 1], [1, -1], [-1, 1], [-1, -1],
    ] as const) {
      const next = { x: current.x + dx, y: current.y + dy };
      if (
        next.x < 0 || next.y < 0 ||
        next.x >= config.size.w || next.y >= config.size.h ||
        seen.has(key(next))
      ) {
        continue;
      }
      seen.add(key(next));
      queue.push(next);
    }
  }
  return null;
}

export interface ResolveSpawnOptions {
  /** 观点阵营（entry.opinion.camp），用于无 NPC 时的阵营区落点。 */
  camp?: string;
  /** 行走性上下文（世界动态状态可能影响桥/门可走性）。 */
  ctx?: WalkContext;
}

export function resolveSpawn(
  config: WorldConfig,
  opinionId: string,
  options: ResolveSpawnOptions = {},
): GridPos {
  const ctx = options.ctx ?? {};

  // 1. 观点对应 NPC 的邻近空格
  const npc = config.npcs.find((n) => n.opinionId === opinionId);
  if (npc) {
    const near = nearestWalkable(config, ctx, npc.pos);
    // NPC 占格本身不可走，BFS 结果天然落在邻近空格。
    if (near) return near;
  }

  // 2. 阵营区中心
  if (options.camp) {
    const zone = config.zones.find((z) => z.camp === options.camp);
    if (zone) {
      const near = nearestWalkable(config, ctx, rectCenter(zone.rect));
      if (near) return near;
    }
  }

  // 3. 默认落点兜底
  return nearestWalkable(config, ctx, config.spawn) ?? config.spawn;
}
