import type { DialogueScript } from "../../types";

// 稳健派 · 在职工匠（o_inwork, support 64）
// 性格：手艺人思维，"先打样再量产"；不反对离开，反对裸奔式离开。
// 台词事实锚点：s5 @Kira（在职窗口先跑投递/面试/作品集，4 周冲刺方法论）。
export const dlgLuociInwork: DialogueScript = {
  id: "dlg_luoci_inwork",
  npcId: "npc_inwork",
  aiPromptId: "world-dialogue-v1",
  lines: [
    {
      speaker: "npc",
      text: "我手艺人的规矩：新活儿没打样验收，旧台子先别拆。我的主张是——{title}。",
    },
    {
      speaker: "npc",
      text: "咨询顾问 {author} 跟我想一块去了：「{excerpt}」（{upvotes} 人赞同）",
      actions: [{ type: "show-source", sourceId: "s5" }],
    },
    {
      speaker: "npc",
      text: "投递、面试、作品集，这三件家伙什先转起来。市场给不给你反馈、给什么价位的反馈，比自己关在屋里猜准得多。",
    },
    {
      speaker: "npc",
      text: "我这法子适合还没想清楚的人：先拿真实反馈校准，再决定退不退。卡收下吧，态度可以慢慢标，不急。",
      actions: [
        { type: "collect-opinion", opinionId: "o_inwork" },
        { type: "open-stance", opinionId: "o_inwork" },
      ],
    },
  ],
};
