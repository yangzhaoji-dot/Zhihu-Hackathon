// 世界运行时纯逻辑 —— 运行时状态机。
//
// loading → landing → explore（自由移动）
//             ⇄ dialogue（刘看山 / 场景交互，锁定移动）
//             ⇄ compare（旧版比较面板，逐步迁往宇宙层）
//             ⇄ judgement（观测站面板）
//             → resonance（碎片覆盖完成后的画卷 / 世界蜕变仪式）→ explore
//         → leaving（火箭返回动画）→ router.back() 回宇宙
//
// error：加载失败终态。leaving 为终态；resonance 不是“观点被证明”，
// 它只表示用户完成了这一轮核心理解，随后回到仍可继续探索的世界。

export type WorldPhase =
  | "loading"
  | "landing"
  | "explore"
  | "dialogue"
  | "compare"
  | "judgement"
  | "resonance"
  | "leaving"
  | "error";

/** 合法迁移表。 */
export const WORLD_PHASE_TRANSITIONS: Readonly<Record<WorldPhase, readonly WorldPhase[]>> = {
  loading: ["landing", "error"],
  landing: ["explore", "error"],
  explore: ["dialogue", "compare", "judgement", "resonance", "leaving"],
  dialogue: ["explore"],
  compare: ["explore"],
  judgement: ["explore"],
  resonance: ["explore"],
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
