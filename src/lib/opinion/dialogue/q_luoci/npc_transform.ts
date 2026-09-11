import type { DialogueScript } from "../../types";

// 止损派 · 转行车票贩（o_transform, support 58）
export const dlgLuociTransform: DialogueScript = {
  id: "dlg_luoci_transform",
  npcId: "npc_transform",
  lines: [
    { speaker: "npc", text: "裸辞这张车票，不是谁都该买。{title}。" },
    {
      speaker: "npc",
      text: "一位成功转行的人写道：「{excerpt}」",
      actions: [{ type: "show-source", sourceId: "s6" }],
    },
    {
      speaker: "npc",
      text: "记住后半句：{summary}。想清楚再上车。",
      actions: [
        { type: "collect-opinion", opinionId: "o_transform" },
        { type: "open-stance", opinionId: "o_transform" },
      ],
    },
  ],
};
