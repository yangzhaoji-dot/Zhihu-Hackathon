// 世界运行时纯逻辑 —— 对话文本插值（world-design-v0.2 §3.2）。
// 模板占位：{title} {summary} {excerpt} {condition} {upvotes} {author} {support} {camp}
// 渲染时用该 NPC 的 Opinion / OpinionSource / Author 数据填充；缺数据时占位
// 替换为空串而非保留花括号，避免把模板泄漏给玩家。
// 本文件不依赖 React/DOM。

import type { Author, Opinion, OpinionSource } from "@/lib/opinion/types";

export interface DialogueInterpolateContext {
  opinion?: Opinion | null;
  source?: OpinionSource | null;
  author?: Author | null;
}

export function interpolateDialogueText(
  text: string,
  ctx: DialogueInterpolateContext,
): string {
  const { opinion, source, author } = ctx;
  const values: Record<string, string> = {
    title: opinion?.title ?? "",
    summary: opinion?.summary ?? "",
    excerpt: source?.excerpt ?? "",
    condition: opinion?.conditions?.[0] ?? "",
    upvotes: source ? source.upvotes.toLocaleString("zh-CN") : "",
    author: author?.name ?? "",
    support: opinion ? String(opinion.support) : "",
    camp: opinion?.camp ?? "",
  };
  return text.replace(/\{(\w+)\}/g, (raw, key: string) =>
    key in values ? values[key] : raw,
  );
}
