import type { DialogueScript } from "../../types";

// 迷雾带 · 雾中旅人（o_window, support 41 —— 止损派观点，人站在迷雾带边缘）
// 性格：神秘但坦白，主动报出自己赞同数低的事实；反复强调"适用窗口"很窄。
// 台词事实锚点：s10 @阿柴（手握 near-offer 或行业扩招时，裸辞窗口风险很小）。
export const dlgLuociWindow: DialogueScript = {
  id: "dlg_luoci_window",
  npcId: "npc_window",
  aiPromptId: "world-dialogue-v1",
  lines: [
    {
      speaker: "npc",
      text: "雾这么大，你也找过来了。我长话短说：{title}。",
    },
    {
      speaker: "npc",
      text: "做 HR 的 {author} 在雾里喊过一句：「{excerpt}」（{upvotes} 人赞同）",
      actions: [{ type: "show-source", sourceId: "s10" }],
    },
    {
      speaker: "npc",
      text: "听清条件再动身：手里已经握着 near-offer，或者行业正在扩招。两条都不占的话，这句话对你来说就是雾本身。",
    },
    {
      speaker: "npc",
      text: "我的赞同度只有 {support}——不是这话错了，是适用范围窄。收下这张卡，去稳健区找账房先生对一对账就明白了。",
      actions: [
        { type: "collect-opinion", opinionId: "o_window" },
        { type: "open-stance", opinionId: "o_window" },
        { type: "open-compare" },
      ],
    },
  ],
};
