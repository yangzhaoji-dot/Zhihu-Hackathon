import type { WorldConfig } from "../types";
import { qLuociWorld } from "./q_luoci";

// 世界配置注册表：questionId → WorldConfig。
// 每议题一个文件 worlds/<questionId>.ts；未登记的议题由
// world-config.ts 的 buildFallbackWorldConfig() 生成通用布局（D2 兜底）。
export const WORLD_CONFIGS: Record<string, WorldConfig> = {
  q_luoci: qLuociWorld,
};
