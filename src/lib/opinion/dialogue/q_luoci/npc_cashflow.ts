import type { DialogueScript } from "../../types";

// 稳健派 · 账房先生（o_cashflow, support 79）
// 性格：开口先算账，数字挂嘴边；承认对方有理，但坚持"先存钱再撕账本"。
// 台词事实锚点：s3 @半夏（6 个月生活费、议价权断崖）、s4 @老周（空窗压价、在职 offer +18%）。
export const dlgLuociCashflow: DialogueScript = {
  id: "dlg_luoci_cashflow",
  npcId: "npc_cashflow",
  aiPromptId: "world-dialogue-v1",
  lines: [
    {
      speaker: "npc",
      text: "坐，先算笔账再聊天。我账本的扉页就一行：{title}。",
    },
    {
      speaker: "npc",
      text: "财务顾问 {author} 算得最直白：「{excerpt}」——这条有 {upvotes} 人赞同，是城里数得着的硬账。",
      actions: [{ type: "show-source", sourceId: "s3" }],
    },
    {
      speaker: "npc",
      text: "招聘经理老周那页是另一个数：简历一出现长空窗，面试官第一反应就是压价；在职跳槽的 offer，平均高出 18%。",
      actions: [{ type: "show-source", sourceId: "s4" }],
    },
    {
      speaker: "npc",
      text: "所以我的门槛只有一条：现金储备没攒够 6 个月生活费之前，别撕账本。攒够了？那你想去哪边我都不拦。",
    },
    {
      speaker: "npc",
      text: "这张卡你收好。对街止损区那位管理员，跟我对了半年账了——攒够两张卡，你可以让我们当面碰一碰。",
      actions: [
        { type: "collect-opinion", opinionId: "o_cashflow" },
        { type: "open-stance", opinionId: "o_cashflow" },
        { type: "open-compare" },
      ],
    },
  ],
};
