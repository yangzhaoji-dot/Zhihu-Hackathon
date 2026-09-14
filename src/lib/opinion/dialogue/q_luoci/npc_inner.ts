import type { DialogueScript } from "../../types";

// v0.3：无人的长椅承载“先分清选择与逃离”的心理视角。
export const dlgLuociInner: DialogueScript = {
  id: "dlg_luoci_inner",
  npcId: "npc_inner",
  aiPromptId: "world-dialogue-v1",
  lines: [
    {
      speaker: "guide",
      text: "这里故意没有坐人。因为这一类回答关心的不是“谁来劝你”，而是你离开之后，原来的焦虑会不会换个地方继续出现：{title}。",
    },
    {
      speaker: "guide",
      text: "{author} 的随访记录里写道：「{excerpt}」（{upvotes} 人赞同）。它追踪的是离开之后的情绪变化。",
      actions: [{ type: "show-source", sourceId: "s8" }],
    },
    {
      speaker: "guide",
      text: "这个场景表达的是一种解释，不是诊断：有些问题来自环境，有些可能会随人一起离开。真正需要判断的是，你是在主动选择，还是只想尽快逃离当下。",
    },
    {
      speaker: "guide",
      text: "这张观点卡可以先收着。它和其他路线不一定冲突，但会改变你判断“什么条件下离开才有意义”的方式。",
      actions: [
        { type: "collect-opinion", opinionId: "o_inner" },
        { type: "open-stance", opinionId: "o_inner" },
      ],
    },
  ],
};
