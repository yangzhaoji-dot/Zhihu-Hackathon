import type { DialogueScript } from "../../types";

// v0.3：观点不再由“车站管理员”本人陈述。
// 玩家调查离职申请箱后，由看山把环境现象还原成可核验的观点与来源。
export const dlgLuociStoploss: DialogueScript = {
  id: "dlg_luoci_stoploss",
  npcId: "npc_stoploss",
  aiPromptId: "world-dialogue-v1",
  lines: [
    {
      speaker: "guide",
      text: "你看到这个塞满纸张的申请箱了吗？它对应当前材料里最强的一种声音：{title}。这组观点的支持度是 {support}。",
    },
    {
      speaker: "guide",
      text: "其中一份记录来自 {author}：「{excerpt}」（{upvotes} 人赞同）。先把它当作具体经历，而不是对所有人的结论。",
      actions: [{ type: "show-source", sourceId: "s1" }],
    },
    {
      speaker: "guide",
      text: "另一条材料来自 HR 的离职面谈观察：当身心状态已经明显恶化时，继续硬扛的代价可能比离开更高。它强调的是“已经到临界点”的情况。",
      actions: [{ type: "show-source", sourceId: "s2" }],
    },
    {
      speaker: "guide",
      text: "所以这个箱子不是“所有人都该辞职”的出口，而是一条有条件的止损路线。你可以收下这张观点卡，之后和别的路线比较。",
      actions: [
        { type: "collect-opinion", opinionId: "o_stoploss" },
        { type: "open-stance", opinionId: "o_stoploss" },
      ],
    },
  ],
};
