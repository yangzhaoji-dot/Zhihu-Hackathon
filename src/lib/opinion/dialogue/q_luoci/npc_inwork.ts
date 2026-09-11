import type { DialogueScript } from "../../types";

// v0.3：亮着的在职试验工坊承载“先用真实反馈校准，再决定退出”的观点。
export const dlgLuociInwork: DialogueScript = {
  id: "dlg_luoci_inwork",
  npcId: "npc_inwork",
  aiPromptId: "world-dialogue-v1",
  lines: [
    {
      speaker: "guide",
      text: "这间工坊一直亮着灯，因为有些回答并不反对离开，而是主张先在旧环境里测试下一步：{title}。",
    },
    {
      speaker: "guide",
      text: "咨询顾问 {author} 留下的做法是：「{excerpt}」（{upvotes} 人赞同）。它把投递、面试和作品集当成现实反馈。",
      actions: [{ type: "show-source", sourceId: "s5" }],
    },
    {
      speaker: "guide",
      text: "这里的隐喻只是系统解释：工作台还没拆，新的样品已经在做。可验证的是原回答提出了“先试再退”的路径。",
    },
    {
      speaker: "guide",
      text: "如果你觉得这种路径值得保留，就把观点卡收下。之后可以拿它和“直接止损”或“整块时间转型”比较。",
      actions: [
        { type: "collect-opinion", opinionId: "o_inwork" },
        { type: "open-stance", opinionId: "o_inwork" },
      ],
    },
  ],
};
