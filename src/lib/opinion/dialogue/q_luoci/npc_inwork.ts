import type { DialogueScript } from "../../types";

// 稳健派 · 在职工匠（o_inwork, support 64）
export const dlgLuociInwork: DialogueScript = {
  id: "dlg_luoci_inwork",
  npcId: "npc_inwork",
  lines: [
    { speaker: "npc", text: "别急着二选一。{title}——{summary}" },
    {
      speaker: "npc",
      text: "有人把这话写得很实在：「{excerpt}」（{upvotes} 人赞同）",
      actions: [{ type: "show-source", sourceId: "s5" }],
    },
    {
      speaker: "npc",
      text: "收下这张卡吧，面试反馈比想象更能校准判断。",
      actions: [{ type: "collect-opinion", opinionId: "o_inwork" }],
    },
  ],
};
