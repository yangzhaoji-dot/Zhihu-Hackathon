// 世界运行时纯逻辑 —— 几何工具（world-design-v0.2 §5.2）。
// 世界坐标 = 网格坐标（浮点允许，玩家平滑移动）；渲染时 ×TILE_SIZE 换算像素。
// 本文件不依赖 React/DOM，可被脚本与组件共用。

import type { Zone } from "@/lib/opinion/types";

/** 1 格 = 48px（§7.1 定稿）。 */
export const TILE_SIZE = 48;

export interface GridPos {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** AABB 相交（闭区间格语义：rect 覆盖 x..x+w-1 列）。 */
export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/** 点（格坐标，浮点）是否落在 rect 覆盖的格范围内。 */
export function pointInRect(p: GridPos, r: Rect): boolean {
  return p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h;
}

/** 网格 → 像素（格左上角）。 */
export function gridToPixel(p: GridPos): { x: number; y: number } {
  return { x: p.x * TILE_SIZE, y: p.y * TILE_SIZE };
}

/** 像素 → 网格（浮点）。 */
export function pixelToGrid(p: { x: number; y: number }): GridPos {
  return { x: p.x / TILE_SIZE, y: p.y / TILE_SIZE };
}

/** 欧氏距离（格）。 */
export function distance(a: GridPos, b: GridPos): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** rect 中心点（格坐标）。 */
export function rectCenter(r: Rect): GridPos {
  return { x: r.x + (r.w - 1) / 2, y: r.y + (r.h - 1) / 2 };
}

/** 点所在的 zone 列表（可能重叠，如 z_station 与 z_mist 在 y11–13 重叠）。 */
export function zonesAt(zones: Zone[], pos: GridPos): Zone[] {
  return zones.filter((z) => pointInRect(pos, z.rect));
}

/** 钳制到世界边界内。 */
export function clampToSize(pos: GridPos, size: { w: number; h: number }): GridPos {
  return {
    x: Math.max(0, Math.min(size.w - 1, pos.x)),
    y: Math.max(0, Math.min(size.h - 1, pos.y)),
  };
}
