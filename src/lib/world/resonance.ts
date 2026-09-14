import type { Opinion, OpinionSource } from "@/lib/opinion/types";

export type ResonanceFragmentKind = "claim" | "reason" | "evidence";

export type ResonanceChapter = {
  id: string;
  kicker: string;
  title: string;
  body: string;
  unresolved?: boolean;
};

export const CORE_RESONANCE_FRAGMENTS: readonly ResonanceFragmentKind[] = [
  "claim",
  "reason",
  "evidence",
];

export function resonanceFragmentKey(opinionId: string, kind: ResonanceFragmentKind) {
  return `fragment:${opinionId}:${kind}`;
}

export function resonanceCompleteKey(opinionId: string) {
  return `resonance:${opinionId}`;
}

export function collectedResonanceFragments(
  worldState: Record<string, unknown>,
  opinionId: string,
): ResonanceFragmentKind[] {
  return CORE_RESONANCE_FRAGMENTS.filter((kind) =>
    Boolean(worldState[resonanceFragmentKey(opinionId, kind)]),
  );
}

export function isResonanceReady(worldState: Record<string, unknown>, opinionId: string) {
  return CORE_RESONANCE_FRAGMENTS.every((kind) =>
    Boolean(worldState[resonanceFragmentKey(opinionId, kind)]),
  );
}

export function hasResonated(worldState: Record<string, unknown>, opinionId: string) {
  return Boolean(worldState[resonanceCompleteKey(opinionId)]);
}

function compact(value: string | undefined | null) {
  return value?.trim() ?? "";
}

export function buildResonanceChapters(
  opinion: Opinion,
  sources: OpinionSource[],
  foundSourceIds: readonly string[],
): ResonanceChapter[] {
  const chapters: ResonanceChapter[] = [];
  const claim = compact(opinion.claim) || compact(opinion.title);
  const summary = compact(opinion.summary);
  const reason = compact(opinion.reason);
  const conditions = opinion.conditions?.filter(Boolean) ?? [];
  const found = sources.filter(
    (source) => opinion.sourceIds.includes(source.id) && foundSourceIds.includes(source.id),
  );

  chapters.push({
    id: "claim",
    kicker: "主张",
    title: claim || "这一观点正在说什么",
    body: summary && summary !== claim ? summary : "这是你在这颗星球上持续追踪的核心判断。",
  });

  chapters.push({
    id: "reason",
    kicker: "为什么有人这样判断",
    title: reason || "理由仍需要继续寻找",
    body: conditions.length
      ? `它至少依赖这些条件：${conditions.join("；")}。`
      : "当前材料没有给出完整的适用条件；理解不能替代缺失的论证。",
    unresolved: !reason,
  });

  chapters.push({
    id: "evidence",
    kicker: "你真正看过的材料",
    title: found.length ? `已核对 ${found.length} 条来源` : "来源仍未被照亮",
    body: found.length
      ? found
          .slice(0, 2)
          .map((source) => `「${source.excerpt}」`)
          .join("\n")
      : "没有被亲自查看的原文，不会因为共鸣而自动变成证据。",
    unresolved: found.length === 0,
  });

  chapters.push({
    id: "unknown",
    kicker: "仍然未知",
    title: "理解到这里，并不等于结论已经被证明",
    body:
      "没有覆盖到的人群、时间范围、反例和新证据仍然留在雾里。共鸣只意味着你终于看清这条观点是怎样成立的。",
    unresolved: true,
  });

  return chapters;
}
