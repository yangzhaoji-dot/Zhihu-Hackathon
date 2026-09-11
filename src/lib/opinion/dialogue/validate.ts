// 对话回复白名单校验器（world-design-v0.2 §4.2 红线，M3）。
//
// 红线：AI 只允许改写表达，不允许新增事实；actions 中的 sourceId/opinionId
// 必须落在注入给模型的白名单集合内。任何越界、结构非法、超长按整段作废处理
// （返回 null），由调用方回退到该 NPC 的静态 DialogueScript——绝不放行
// "半条合法"的回复，避免 AI 虚构来源卡。
//
// 本文件不依赖 React/DOM/server-only，可被路由、ai.ts 与校验脚本共用。

import type { DialogueAction, DialogueLine } from "../types";

export interface DialogueWhitelist {
  /** 允许 show-source 引用的来源 id 集合（= 注入给模型的来源）。 */
  sourceIds: ReadonlySet<string>;
  /** 允许 collect-opinion / open-stance 引用的观点 id 集合。 */
  opinionIds: ReadonlySet<string>;
  /** 台词行数上限（含下限 1）；默认 6（§5.6 要求单次 ≤4 行，AI 留宽限）。 */
  maxLines?: number;
  /** 单行文本长度上限，默认 300 字。 */
  maxTextLength?: number;
  /** 单行动作数上限，默认 3。 */
  maxActionsPerLine?: number;
}

const SPEAKERS: ReadonlySet<string> = new Set(["npc", "guide", "player"]);

function sanitizeAction(value: unknown, wl: DialogueWhitelist): DialogueAction | null {
  if (!value || typeof value !== "object") return null;
  const action = value as Record<string, unknown>;
  switch (action.type) {
    case "show-source": {
      const sourceId = action.sourceId;
      if (typeof sourceId !== "string" || !wl.sourceIds.has(sourceId)) return null;
      return { type: "show-source", sourceId };
    }
    case "collect-opinion": {
      const opinionId = action.opinionId;
      if (typeof opinionId !== "string" || !wl.opinionIds.has(opinionId)) return null;
      return { type: "collect-opinion", opinionId };
    }
    case "open-stance": {
      const opinionId = action.opinionId;
      if (typeof opinionId !== "string" || !wl.opinionIds.has(opinionId)) return null;
      return { type: "open-stance", opinionId };
    }
    case "open-compare":
      return { type: "open-compare" };
    default:
      return null;
  }
}

/**
 * 校验并清洗模型输出的 {lines:[...]}。
 * 通过时返回仅含白名单字段的新数组（丢弃多余字段）；任一违规返回 null。
 */
export function validateDialogueLines(
  value: unknown,
  wl: DialogueWhitelist,
): DialogueLine[] | null {
  if (!value || typeof value !== "object") return null;
  const lines = (value as { lines?: unknown }).lines;
  if (!Array.isArray(lines)) return null;
  const maxLines = wl.maxLines ?? 6;
  const maxText = wl.maxTextLength ?? 300;
  const maxActions = wl.maxActionsPerLine ?? 3;
  if (lines.length < 1 || lines.length > maxLines) return null;

  const clean: DialogueLine[] = [];
  for (const raw of lines) {
    if (!raw || typeof raw !== "object") return null;
    const line = raw as Record<string, unknown>;
    if (typeof line.speaker !== "string" || !SPEAKERS.has(line.speaker)) return null;
    if (
      typeof line.text !== "string" ||
      line.text.trim().length === 0 ||
      line.text.length > maxText
    ) {
      return null;
    }

    let actions: DialogueAction[] | undefined;
    if (line.actions !== undefined) {
      if (!Array.isArray(line.actions) || line.actions.length > maxActions) return null;
      actions = [];
      for (const rawAction of line.actions) {
        const action = sanitizeAction(rawAction, wl);
        if (!action) return null; // 越界 sourceId / 未知类型 → 整段作废
        actions.push(action);
      }
      if (actions.length === 0) actions = undefined;
    }

    clean.push({
      speaker: line.speaker as DialogueLine["speaker"],
      text: line.text.trim(),
      ...(actions ? { actions } : {}),
    });
  }
  return clean;
}
