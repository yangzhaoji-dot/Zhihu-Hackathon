import type { DialogueScript } from "../../types";

// 迷雾带 · 雾中旅人（o_window, support 41 —— 止损派观点，人却在迷雾带）
export const dlgLuociWindow: DialogueScript = {
  id: "dlg_luoci_window",
  npcId: "npc_window",
  lines: [
    { speaker: "npc", text: "雾大，别迷路。我是止损派的人，只是恰好走到这儿。{title}。" },
    {
      speaker: "npc",
      text: "有位创业者说：「{excerpt}」（{upvotes} 人赞同）",
      actions: [{ type: "show-source", sourceId: "s10" }],
    },
    {
      speaker: "npc",
      text: "这句话成立的条件很苛刻——行业在扩招，或者你已经握着意向。收下卡，去对面稳健区对对账。",
      actions: [
        { type: "collect-opinion", opinionId: "o_window" },
        { type: "open-compare" },
      ],
    },
  ],
};
