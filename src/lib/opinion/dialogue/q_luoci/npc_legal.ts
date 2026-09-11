import type { DialogueScript } from "../../types";

// 维权派 · 仲裁书记员（o_legal, support 52）
export const dlgLuociLegal: DialogueScript = {
  id: "dlg_luoci_legal",
  npcId: "npc_legal",
  lines: [
    { speaker: "npc", text: "卷宗我都整理好了：{title}。" },
    {
      speaker: "npc",
      text: "{author} 的记录：「{excerpt}」",
      actions: [{ type: "show-source", sourceId: "s7" }],
    },
    {
      speaker: "npc",
      text: "辞职是一种解法，但不是唯一的一种。这张卡你收好。",
      actions: [
        { type: "collect-opinion", opinionId: "o_legal" },
        { type: "open-stance", opinionId: "o_legal" },
      ],
    },
  ],
};
