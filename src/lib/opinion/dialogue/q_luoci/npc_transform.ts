import type { DialogueScript } from "../../types";

// v0.3：转行售票机承载“需要整块时间做深度转型”的条件性观点。
export const dlgLuociTransform: DialogueScript = {
  id: "dlg_luoci_transform",
  npcId: "npc_transform",
  aiPromptId: "world-dialogue-v1",
  lines: [
    {
      speaker: "guide",
      text: "这台售票机只卖一种票：把整块时间换成转型窗口。它对应的观点是：{title}。",
    },
    {
      speaker: "guide",
      text: "{author} 的经历写在票面上：「{excerpt}」（{upvotes} 人赞同）。这是一个成功案例，不是成功率保证。",
      actions: [{ type: "show-source", sourceId: "s6" }],
    },
    {
      speaker: "guide",
      text: "原材料里还明确给了条件：目标要能拆解，而且需要持续复盘。少了这些条件，“整块时间”也可能只变成更大的不确定性。",
    },
    {
      speaker: "guide",
      text: "如果你想保留这条可能性，就收下这张观点卡。它真正值得比较的不是“敢不敢”，而是你是否满足这张票的使用条件。",
      actions: [
        { type: "collect-opinion", opinionId: "o_transform" },
        { type: "open-stance", opinionId: "o_transform" },
      ],
    },
  ],
};
