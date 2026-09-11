import type { DialogueScript } from "../../types";

// 维权派 · 心理咨询摊主（o_inner, support 47）
export const dlgLuociInner: DialogueScript = {
  id: "dlg_luoci_inner",
  npcId: "npc_inner",
  lines: [
    { speaker: "npc", text: "坐下聊聊？我的摊位上只有一个观点：{title}。" },
    {
      speaker: "npc",
      text: "一位咨询师写道：「{excerpt}」",
      actions: [{ type: "show-source", sourceId: "s8" }],
    },
    {
      speaker: "npc",
      text: "这不否定换环境的价值，只是提醒你分清逃离和选择。",
      actions: [{ type: "collect-opinion", opinionId: "o_inner" }],
    },
  ],
};
