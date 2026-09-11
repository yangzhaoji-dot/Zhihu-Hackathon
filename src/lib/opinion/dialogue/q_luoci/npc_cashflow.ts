import type { DialogueScript } from "../../types";

// 稳健派 · 账房先生（o_cashflow, support 79）
export const dlgLuociCashflow: DialogueScript = {
  id: "dlg_luoci_cashflow",
  npcId: "npc_cashflow",
  lines: [
    { speaker: "npc", text: "账要算清楚了再走。我的看法是：{title}。" },
    {
      speaker: "npc",
      text: "{author} 的原话：「{excerpt}」",
      actions: [{ type: "show-source", sourceId: "s3" }],
    },
    {
      speaker: "npc",
      text: "对面止损区的人跟我吵了很久。你要不要收下这张卡，回头把我们俩的观点碰一碰？",
      actions: [
        { type: "collect-opinion", opinionId: "o_cashflow" },
        { type: "open-compare" },
      ],
    },
  ],
};
