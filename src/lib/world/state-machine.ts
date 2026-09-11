// 世界运行时纯逻辑 —— 运行时状态机（world-design-v0.2 §5.1）。
//
// loading → landing（降落下落动画，≤1.2s，可跳过）
//         → explore（自由移动）
//             ⇄ dialogue（NPC/看山对话，锁定移动）
//             ⇄ compare（比较面板，锁定移动）   —— M2 占位，M3 实现
//             ⇄ judgement（观测站面板，锁定移动）—— M2 占位，M4 实现
//         → leaving（火箭返回动画）→ router.back() 回宇宙
//
// error：加载失败终态（entry / config 任一下发失败）。leaving 为终态，
// 动画结束后由页面执行 router.back()。
// 本文件不依赖 React/DOM。

export type WorldPhase =
  | "loading"
  | "landing"
  | "explore"
  | "dialogue"
  | "compare"    // M2 占位（M3 实现面板）
  | "judgement"  // M2 占位（M4 实现面板）
  | "leaving"
  | "error";

/** 合法迁移表。 */
export const WORLD_PHASE_TRANSITIONS: Readonly<Record<WorldPhase, readonly WorldPhase[]>> = {
  loading: ["landing", "error"],
  landing: ["explore", "error"],
  explore: ["dialogue", "compare", "judgement", "leaving"],
  dialogue: ["explore"],
  compare: ["explore"],
  judgement: ["explore"],
  leaving: [],
  error: [],
};

export function canTransition(from: WorldPhase, to: WorldPhase): boolean {
  return WORLD_PHASE_TRANSITIONS[from].includes(to);
}

/** 迁移校验，非法迁移抛出异常（开发期尽早暴露状态错乱）。 */
export function transition(from: WorldPhase, to: WorldPhase): WorldPhase {
  if (!canTransition(from, to)) {
    throw new Error(`illegal world phase transition: ${from} → ${to}`);
  }
  return to;
}

/** 该状态下是否锁定移动。 */
export function movementLocked(phase: WorldPhase): boolean {
  return phase !== "explore";
}
