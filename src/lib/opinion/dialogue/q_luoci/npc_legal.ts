import type { DialogueScript } from "../../types";

// v0.3：仲裁档案柜承载“辞职之外还有取证/协商/仲裁”的路径。
export const dlgLuociLegal: DialogueScript = {
  id: "dlg_luoci_legal",
  npcId: "npc_legal",
  aiPromptId: "world-dialogue-v1",
  lines: [
    {
      speaker: "guide",
      text: "这个档案柜没有被搬走，因为有一类回答认为，“离开”不是问题的唯一出口：{title}。",
    },
    {
      speaker: "guide",
      text: "劳动法观察者 {author} 留下的原文是：「{excerpt}」（{upvotes} 人赞同）。你可以打开来源核对它引用的条件。",
      actions: [{ type: "show-source", sourceId: "s7" }],
    },
    {
      speaker: "guide",
      text: "这条路线强调保留证据、协商或仲裁，同时也有现实成本：需要时间，也依赖证据是否完整。档案柜只是提醒你“还有另一种行动空间”。",
    },
    {
      speaker: "guide",
      text: "把这张观点卡收下吧。等你和其他观点比较时，可以看看双方到底是在争“要不要走”，还是在争“走之前还有没有别的选择”。",
      actions: [
        { type: "collect-opinion", opinionId: "o_legal" },
        { type: "open-stance", opinionId: "o_legal" },
      ],
    },
  ],
};
