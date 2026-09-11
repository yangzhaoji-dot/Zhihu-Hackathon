import type { DialogueScript } from "../../types";

// 止损派 · 车站管理员（o_stoploss, support 86 —— 全图最高赞，纪念碑原型）
// 性格：报站员式干脆，三句话不离"发车/到站"，但会主动提醒条件边界。
// 台词事实锚点：s1 @林小满（焦虑量表、离职后睡眠恢复）、s2 @阿柴（HR 离职面谈）。
export const dlgLuociStoploss: DialogueScript = {
  id: "dlg_luoci_stoploss",
  npcId: "npc_stoploss",
  aiPromptId: "world-dialogue-v1",
  lines: [
    {
      speaker: "npc",
      text: "欢迎进站。我这班车的方向就一句话：{title}。这站台上它最响——当前材料里 {support} 的赞同度，全城最高。",
    },
    {
      speaker: "npc",
      text: "产品经理 {author} 留过一张病历式的记录：「{excerpt}」（{upvotes} 人赞同）",
      actions: [{ type: "show-source", sourceId: "s1" }],
    },
    {
      speaker: "npc",
      text: "做 HR 的阿柴说得更直：硬扛出病来，公司不会替你买单。这不是吓唬人，是离职面谈里一年年看出来的。",
      actions: [{ type: "show-source", sourceId: "s2" }],
    },
    {
      speaker: "npc",
      text: "但我得提醒一句：我这班车只发给'真的已经崩了'的人。只是累了、只是想歇，那是另一趟车，别上错。",
    },
    {
      speaker: "npc",
      text: "认同的话，收下这张观点卡当车票；拿不准，就先标个态度，车不等人但站台一直在。",
      actions: [
        { type: "collect-opinion", opinionId: "o_stoploss" },
        { type: "open-stance", opinionId: "o_stoploss" },
      ],
    },
  ],
};
