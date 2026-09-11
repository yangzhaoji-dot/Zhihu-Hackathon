import type { DialogueScript } from "../../types";

// 中央车站 · 半透明售票员（o_threshold, AI 融合观点, support 60, translucent）
export const dlgLuociThreshold: DialogueScript = {
  id: "dlg_luoci_threshold",
  npcId: "npc_threshold",
  lines: [
    {
      speaker: "npc",
      text: "……你能看见我？我是被「融合」出来的影子：{title}。",
    },
    {
      speaker: "npc",
      text: "我是由止损派和稳健派的争论推演出来的候选答案，还没有真人原文撑腰。",
    },
    {
      speaker: "npc",
      text: "如果你觉得我有道理，可以收下我——但请把我当成待验证的推演，而不是谁的真事。",
      actions: [
        { type: "collect-opinion", opinionId: "o_threshold" },
        { type: "open-stance", opinionId: "o_threshold" },
      ],
    },
  ],
};
