import type { DialogueScript } from "../../types";

// 止损派 · 转行车票贩（o_transform, support 58）
// 性格：票贩子式热情 + 反复强调票根小字（条件）；卖票但劝人想清楚。
// 台词事实锚点：s6 @许愿（裸辞 5 个月转码上岸，前提是目标可拆解、每周复盘）。
export const dlgLuociTransform: DialogueScript = {
  id: "dlg_luoci_transform",
  npcId: "npc_transform",
  aiPromptId: "world-dialogue-v1",
  lines: [
    {
      speaker: "npc",
      text: "买车票吗？去'新世界'的那种。先听我念票面：{title}。",
    },
    {
      speaker: "npc",
      text: "{author} 是真到过站的人：「{excerpt}」（{upvotes} 人赞同）",
      actions: [{ type: "show-source", sourceId: "s6" }],
    },
    {
      speaker: "npc",
      text: "再看票根上的小字：目标得可拆解、每周要有复盘。缺了这两条，这趟车就叫'无限拖延号'，开到哪算哪。",
    },
    {
      speaker: "npc",
      text: "所以我不见人就卖票。需要整块时间做深度转型的人，这张卡才配得上你——收下，想清楚再上车。",
      actions: [
        { type: "collect-opinion", opinionId: "o_transform" },
        { type: "open-stance", opinionId: "o_transform" },
      ],
    },
  ],
};
