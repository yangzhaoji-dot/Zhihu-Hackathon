import type { DialogueScript } from "../types";
import { dlgLuociStoploss } from "./q_luoci/npc_stoploss";
import { dlgLuociCashflow } from "./q_luoci/npc_cashflow";
import { dlgLuociInwork } from "./q_luoci/npc_inwork";
import { dlgLuociTransform } from "./q_luoci/npc_transform";
import { dlgLuociLegal } from "./q_luoci/npc_legal";
import { dlgLuociInner } from "./q_luoci/npc_inner";
import { dlgLuociWindow } from "./q_luoci/npc_window";
import { dlgLuociThreshold } from "./q_luoci/npc_threshold";

// 对话脚本注册表（world-design-v0.2 §3.2 / D4：模板优先、AI 增强在 M3）。
// key = NpcConfig.dialogueId。

const SCRIPTS: Record<string, DialogueScript> = {
  dlg_luoci_stoploss: dlgLuociStoploss,
  dlg_luoci_cashflow: dlgLuociCashflow,
  dlg_luoci_inwork: dlgLuociInwork,
  dlg_luoci_transform: dlgLuociTransform,
  dlg_luoci_legal: dlgLuociLegal,
  dlg_luoci_inner: dlgLuociInner,
  dlg_luoci_window: dlgLuociWindow,
  dlg_luoci_threshold: dlgLuociThreshold,
};

export function getDialogueScript(dialogueId: string): DialogueScript | null {
  return SCRIPTS[dialogueId] ?? null;
}

/**
 * 无静态脚本时的通用兜底（未配置议题的 fallback 世界、未来议题）。
 * 文本走插值，渲染层用 NPC 的 Opinion/OpinionSource 填充。
 */
export function buildGenericDialogue(npcId: string, opinionId: string): DialogueScript {
  return {
    id: `dlg_generic_${npcId}`,
    npcId,
    lines: [
      { speaker: "npc", text: "我的看法是：{title}。{summary}" },
      {
        speaker: "npc",
        text: "原文是这么写的：「{excerpt}」",
        // sourceId 由渲染层替换为该观点的第一条来源；无来源时动作被忽略。
        actions: [{ type: "show-source", sourceId: "__first__" }],
      },
      {
        speaker: "npc",
        text: "收下这张观点卡，回去慢慢想。",
        actions: [{ type: "collect-opinion", opinionId }],
      },
    ],
  };
}
