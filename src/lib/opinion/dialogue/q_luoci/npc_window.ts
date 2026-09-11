import type { DialogueScript } from "../../types";

// v0.3：雾里的机会时刻表承载“裸辞存在窄窗口”的条件性观点。
export const dlgLuociWindow: DialogueScript = {
  id: "dlg_luoci_window",
  npcId: "npc_window",
  aiPromptId: "world-dialogue-v1",
  lines: [
    {
      speaker: "guide",
      text: "雾里只有几班车的时间还能看清。它对应一个适用范围很窄的观点：{title}。",
    },
    {
      speaker: "guide",
      text: "HR {author} 的原话是：「{excerpt}」（{upvotes} 人赞同）。先注意它谈的是特定招聘窗口，而不是一般情况。",
      actions: [{ type: "show-source", sourceId: "s10" }],
    },
    {
      speaker: "guide",
      text: "这条观点依赖的条件包括手里已有 near-offer，或者行业正处在扩招阶段。条件不存在时，前面的路仍然应该保持成雾。",
    },
    {
      speaker: "guide",
      text: "它的支持度是 {support}。支持度低不等于错误，也可能只是适用人群更窄。收下它，再拿去和现金流路线比较。",
      actions: [
        { type: "collect-opinion", opinionId: "o_window" },
        { type: "open-stance", opinionId: "o_window" },
        { type: "open-compare" },
      ],
    },
  ],
};
