import type { DialogueScript } from "../../types";

// 中央车站 · 半透明售票员（o_threshold, AI 融合观点, support 60, translucent）
// 性格：自知是推演出来的"影子"，说话带省略号；诚实是它的角色核心——
// 反复强调"我是候选答案，不是事实"。
// 台词事实锚点：s9 @大饼（退出成本阈值：健康风险、现金储备、行业周期）。
export const dlgLuociThreshold: DialogueScript = {
  id: "dlg_luoci_threshold",
  npcId: "npc_threshold",
  aiPromptId: "world-dialogue-v1",
  lines: [
    {
      speaker: "npc",
      text: "……你看得见我？我是被'融合'推演出来的影子：{title}。",
    },
    {
      speaker: "npc",
      text: "我没有真人履历撑腰。最接近我的一句话，来自创业者 {author}：「{excerpt}」（{upvotes} 人赞同）",
      actions: [{ type: "show-source", sourceId: "s9" }],
    },
    {
      speaker: "npc",
      text: "我的配方写在票面上：把身心风险、现金储备、行业周期，折算成一个'退出阈值'。过了阈值，走；没过，留。",
    },
    {
      speaker: "npc",
      text: "但请记住：我是止损派和稳健派争论推出来的候选答案，不是谁的真实经历。半透明，就是我的免责声明。",
    },
    {
      speaker: "npc",
      text: "愿意的话收下我，拿去和任何一张真人观点卡碰一碰——让我也接受一次检验。",
      actions: [
        { type: "collect-opinion", opinionId: "o_threshold" },
        { type: "open-stance", opinionId: "o_threshold" },
      ],
    },
  ],
};
