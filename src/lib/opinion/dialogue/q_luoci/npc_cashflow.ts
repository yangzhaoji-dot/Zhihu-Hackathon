import type { DialogueScript } from "../../types";

// v0.3：玩家调查现金流账本台，看山解释稳健派的成本模型。
export const dlgLuociCashflow: DialogueScript = {
  id: "dlg_luoci_cashflow",
  npcId: "npc_cashflow",
  aiPromptId: "world-dialogue-v1",
  lines: [
    {
      speaker: "guide",
      text: "这本账一直摊在这里，因为另一批回答把问题看成了现金流风险：{title}。",
    },
    {
      speaker: "guide",
      text: "财务顾问 {author} 给出的原话是：「{excerpt}」（{upvotes} 人赞同）。这里最关键的条件是生活费缓冲，而不是单纯“敢不敢走”。",
      actions: [{ type: "show-source", sourceId: "s3" }],
    },
    {
      speaker: "guide",
      text: "另一份招聘侧的材料还提到空窗期与议价能力的关系；在职拿 offer 的结果可能更有利。你可以打开原文核对它的适用范围。",
      actions: [{ type: "show-source", sourceId: "s4" }],
    },
    {
      speaker: "guide",
      text: "所以这张桌子代表的不是“永远别辞”，而是先把退出成本算清楚。收下它，再和离职申请箱那条路线碰一碰会更有意思。",
      actions: [
        { type: "collect-opinion", opinionId: "o_cashflow" },
        { type: "open-stance", opinionId: "o_cashflow" },
        { type: "open-compare" },
      ],
    },
  ],
};
