import type { DialogueScript } from "../../types";

// v0.3：AI 融合观点不再拟人成“半透明售票员”，而表现成一台尚未定型的条件闸机。
export const dlgLuociThreshold: DialogueScript = {
  id: "dlg_luoci_threshold",
  npcId: "npc_threshold",
  aiPromptId: "world-dialogue-v1",
  lines: [
    {
      speaker: "guide",
      text: "这台闸机不是某个答主留下的。它是系统把几条路线叠在一起后推演出的候选规则：{title}。",
    },
    {
      speaker: "guide",
      text: "最接近这条规则的真人材料来自 {author}：「{excerpt}」（{upvotes} 人赞同）。你可以查看原文，但不要把真人材料和系统推演混成一件事。",
      actions: [{ type: "show-source", sourceId: "s9" }],
    },
    {
      speaker: "guide",
      text: "它尝试把身心风险、现金储备和行业周期放进同一个“退出阈值”里。半透明表示：这个结构可以帮助思考，但它不是已经被证明的事实。",
    },
    {
      speaker: "guide",
      text: "如果你愿意，可以把这个候选观点收下，再用真人观点去检验它。这里的目标不是给答案，而是把一个可能的判断规则摆到你面前。",
      actions: [
        { type: "collect-opinion", opinionId: "o_threshold" },
        { type: "open-stance", opinionId: "o_threshold" },
      ],
    },
  ],
};
