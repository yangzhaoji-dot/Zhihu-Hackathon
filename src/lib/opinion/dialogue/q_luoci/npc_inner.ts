import type { DialogueScript } from "../../types";

// 维权派 · 心理咨询摊主（o_inner, support 47）
// 性格：温柔、只问不答；把"逃离还是选择"的分辨当作摊位上唯一的货。
// 台词事实锚点：s8 @柒柒（来访者随访：裸辞后 6 个月情绪追踪，焦虑换形式回来）。
export const dlgLuociInner: DialogueScript = {
  id: "dlg_luoci_inner",
  npcId: "npc_inner",
  aiPromptId: "world-dialogue-v1",
  lines: [
    {
      speaker: "npc",
      text: "来，坐。我这摊位不卖答案，只递问题。今天的问题是：{title}。",
    },
    {
      speaker: "npc",
      text: "同行 {author} 随访过很多来访者，记录是这么写的：「{excerpt}」（{upvotes} 人赞同）",
      actions: [{ type: "show-source", sourceId: "s8" }],
    },
    {
      speaker: "npc",
      text: "那份随访追了裸辞后 6 个月的情绪。把辞职当逃离的人，焦虑只是换了件衣服，又跟到了新环境。",
    },
    {
      speaker: "npc",
      text: "这话不否定离开的价值——只是请你先分清：你是在'选择'，还是在'逃'。这两笔账，利率完全不一样。",
    },
    {
      speaker: "npc",
      text: "这张卡很轻，但值得收。态度不用急着标，想明白再落笔也不迟。",
      actions: [
        { type: "collect-opinion", opinionId: "o_inner" },
        { type: "open-stance", opinionId: "o_inner" },
      ],
    },
  ],
};
