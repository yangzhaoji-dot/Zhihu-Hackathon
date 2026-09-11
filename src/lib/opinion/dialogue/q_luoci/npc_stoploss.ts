import type { DialogueScript } from "../../types";

// 止损派 · 车站管理员（o_stoploss, support 86 —— 全图最高赞）
export const dlgLuociStoploss: DialogueScript = {
  id: "dlg_luoci_stoploss",
  npcId: "npc_stoploss",
  lines: [
    {
      speaker: "npc",
      text: "我是这么看的：{title}。这不是冲动，是 {support} 个人用经历投出来的判断。",
    },
    {
      speaker: "npc",
      text: "有位 {author} 写道：「{excerpt}」",
      actions: [{ type: "show-source", sourceId: "s1" }],
    },
    {
      speaker: "npc",
      text: "如果你也这么想过，可以把这张观点卡收下，或者先标记你的态度。",
      actions: [
        { type: "collect-opinion", opinionId: "o_stoploss" },
        { type: "open-stance", opinionId: "o_stoploss" },
      ],
    },
  ],
};
