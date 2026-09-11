// 世界运行时纯逻辑 —— 比较结果 → 场景反馈规则（world-design-v0.2 §5.4 规则表，M3）。
//
// 输入：一次 /collide 的 CollisionAnalysis + 双方 Opinion（+ 可选区域/位置上下文）。
// 输出：待写入 WorldState（§3.4）的键值项列表（乱序归一化键）+ 结构化说明。
//
// 规则表（§5.4）：
// | consensus 非空            | bridge:<a>:<b> = "built"（两区间点亮桥梁）      |
// | missing 非空              | fog_rt:<a>:<b> = {x,y}（两区之间放迷雾带运行时标记）|
// | evidence 一方明显不足      | ruin:<较弱方 zoneId> = "marked"（停工建筑标记）   |
//
// evidence 强弱判定（保守、可测试）：
// 1. 先看 verdict 文本是否显式指认（"A 更充分"/"B 的证据更……"）；
// 2. 否则用 §6.4 的停工建筑规则兜底：一方 sourceIds 为空（AI 推演、无真人
//    来源）而另一方有来源 → 无来源方为较弱方；双方同等则不标记；
// 3. 无法判定 → 不产生 ruin 项（宁可不标，不误标）。
//
// 本文件不依赖 React/DOM/server-only，可被页面、路由与校验脚本共用。

import type { CollisionAnalysis, Opinion } from "@/lib/opinion/types";
import type { GridPos } from "./geometry";
import { normalizePairKey } from "./walkability";

export interface SceneFeedbackContext {
  /** 双方观点所属区域 id（用于 ruin 标记落点）。 */
  zoneIds?: { a?: string; b?: string };
  /** 双方观点在世界内的格坐标（用于迷雾带中点）；缺省时迷雾项不带坐标。 */
  positions?: { a: GridPos; b: GridPos };
}

export interface SceneFeedbackResult {
  /** 乱序归一化后的比较对（a/b 排序后），供 walkCtx.comparedPairs 使用。 */
  comparedPair: [string, string];
  /** 待合并进 worldStateRef + POST progress setWorldState 的键值项。 */
  worldState: Record<string, unknown>;
  /** 命中的规则标签（"bridge" | "fog" | "ruin:<zoneId>"），供 toast / 日志。 */
  applied: string[];
}

/** verdict 文本显式指认哪方证据更充分；无法判定返回 null。 */
export function verdictStrongerSide(verdict: string): "a" | "b" | null {
  if (!verdict) return null;
  // 允许"侧/方/的证据/数据"等中间词（≤8 个非句读字符），如 "B方数据更扎实"。
  // 句读边界截断，降低"A 不如 B 的证据更充分"类反转句的误判（仍属启发式，
  // 判不清时返回 null，由调用方走来源数兜底或放弃标记——宁可不标，不误标）。
  const mention = (side: "A" | "B") =>
    new RegExp(
      `${side}\\s*(?:方|侧)?[^，。；;]{0,8}?(?:更|较|相对)\\s*(?:充分|强|扎实|占优|可信|有力)`,
    ).test(verdict);
  const aStronger = mention("A");
  const bStronger = mention("B");
  if (aStronger && !bStronger) return "a";
  if (bStronger && !aStronger) return "b";
  return null; // 双方都提或都没提 → 保守不判
}

/** 证据较弱的一方；无法判定返回 null（§6.4：有结论但证据/来源为空 = 停工建筑）。 */
export function weakerSide(
  analysis: CollisionAnalysis,
  a: Opinion,
  b: Opinion,
): "a" | "b" | null {
  const stronger = verdictStrongerSide(analysis.evidence?.verdict ?? "");
  if (stronger) return stronger === "a" ? "b" : "a";
  const aSources = a.sourceIds.length;
  const bSources = b.sourceIds.length;
  if (aSources === 0 && bSources > 0) return "a";
  if (bSources === 0 && aSources > 0) return "b";
  return null;
}

export function deriveSceneFeedback(
  analysis: CollisionAnalysis,
  a: Opinion,
  b: Opinion,
  ctx: SceneFeedbackContext = {},
): SceneFeedbackResult {
  const key = normalizePairKey(a.id, b.id); // 乱序归一化
  const comparedPair = key.split(":") as [string, string];
  const worldState: Record<string, unknown> = {};
  const applied: string[] = [];

  // 1. 共识非空 → 桥点亮
  if (typeof analysis.consensus === "string" && analysis.consensus.trim().length > 0) {
    worldState[`bridge:${key}`] = "built";
    applied.push("bridge");
  }

  // 2. missing 非空 → 两区之间的迷雾带运行时标记
  const missing = (analysis.missing ?? []).filter(
    (m) => typeof m === "string" && m.trim().length > 0,
  );
  if (missing.length > 0) {
    const positions = ctx.positions;
    worldState[`fog_rt:${key}`] = positions
      ? {
          x: Math.round((positions.a.x + positions.b.x) / 2),
          y: Math.round((positions.a.y + positions.b.y) / 2),
        }
      : true;
    applied.push("fog");
  }

  // 3. evidence 一方明显不足 → 较弱方区域 ruin 标记
  const weak = weakerSide(analysis, a, b);
  const weakZoneId = weak === "a" ? ctx.zoneIds?.a : weak === "b" ? ctx.zoneIds?.b : undefined;
  if (weak && weakZoneId) {
    worldState[`ruin:${weakZoneId}`] = "marked";
    applied.push(`ruin:${weakZoneId}`);
  }

  return { comparedPair, worldState, applied };
}
