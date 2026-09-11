import type { DialogueScript } from "../../types";

// 维权派 · 仲裁书记员（o_legal, support 52）
// 性格：公事公办的卷宗腔，但会在括号里补一句人话；强调"辞职不是唯一解法"。
// 台词事实锚点：s7 @沈墨（保留证据、协商或仲裁，《劳动合同法》第 38 条）。
export const dlgLuociLegal: DialogueScript = {
  id: "dlg_luoci_legal",
  npcId: "npc_legal",
  aiPromptId: "world-dialogue-v1",
  lines: [
    {
      speaker: "npc",
      text: "卷宗编号 o_legal……咳，职业习惯。我的立场写在卷首：{title}。",
    },
    {
      speaker: "npc",
      text: "劳动法观察者 {author} 的笔录很锋利：「{excerpt}」（{upvotes} 人赞同）",
      actions: [{ type: "show-source", sourceId: "s7" }],
    },
    {
      speaker: "npc",
      text: "证据袋里躺着《劳动合同法》第 38 条：强制加班、克扣工资，劳动者可以主动解除合同并要补偿。自己辞职走人，等于把主动权让给对方。",
    },
    {
      speaker: "npc",
      text: "但我也得如实记录：仲裁要时间、要证据，不是人人都耗得起。这是这条路的收费站，卷宗里写得明明白白。",
    },
    {
      speaker: "npc",
      text: "这份卷宗卡你收好。认同与否，先在本子上标个态度——书记员最见不得没归档的判断。",
      actions: [
        { type: "collect-opinion", opinionId: "o_legal" },
        { type: "open-stance", opinionId: "o_legal" },
      ],
    },
  ],
};
