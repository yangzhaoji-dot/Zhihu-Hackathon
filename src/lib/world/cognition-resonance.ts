import type { Opinion, OpinionSource } from "@/lib/opinion/types";
import type { CognitionFragmentSpec } from "@/lib/world/cognition-fragment-plan";
import type { ResonanceChapter } from "@/lib/world/resonance";

function compact(value: string | undefined | null) {
  return value?.trim() ?? "";
}

export function buildCognitionResonanceChapters(
  opinion: Opinion,
  sources: readonly OpinionSource[],
  foundSourceIds: readonly string[],
  plan: readonly CognitionFragmentSpec[],
): ResonanceChapter[] {
  const found = sources.filter(
    (source) => opinion.sourceIds.includes(source.id) && foundSourceIds.includes(source.id),
  );
  const claim = compact(opinion.claim) || compact(opinion.title);
  const reason = compact(opinion.reason);
  const conditions = opinion.conditions?.filter(Boolean) ?? [];
  const chapters: ResonanceChapter[] = [];

  for (const fragment of plan) {
    switch (fragment.role) {
      case "claim":
        chapters.push({
          id: fragment.id,
          kicker: "主张",
          title: claim,
          body: opinion.summary && opinion.summary !== claim
            ? opinion.summary
            : "这是这颗星球一直围绕的核心判断。",
        });
        break;
      case "reason":
        chapters.push({
          id: fragment.id,
          kicker: "理由",
          title: reason || "理由没有完整留下",
          body: reason
            ? "你已经从载体中恢复了这条判断背后的解释。"
            : "这里恢复出的恰好是一个缺口：理解不能替代缺失的理由。",
          unresolved: !reason,
        });
        break;
      case "condition":
        chapters.push({
          id: fragment.id,
          kicker: "条件",
          title: conditions.length ? `在 ${conditions.length} 个前提下讨论` : "条件仍然未知",
          body: conditions.length
            ? conditions.join("；")
            : "没有被明确写下的条件，不会因为共鸣而自动出现。",
          unresolved: conditions.length === 0,
        });
        break;
      case "evidence":
        chapters.push({
          id: fragment.id,
          kicker: "依据",
          title: found.length ? `已核对 ${found.length} 条来源` : "可追溯材料仍然不足",
          body: found.length
            ? found.slice(0, 2).map((source) => `「${source.excerpt}」`).join("\n")
            : "没有被亲自查看的原文，不会因为共鸣而自动成为证据。",
          unresolved: found.length === 0,
        });
        break;
      case "boundary":
        chapters.push({
          id: fragment.id,
          kicker: "边界",
          title: "你已经看见这条观点停在哪里",
          body: conditions.length
            ? `它依赖的条件包括：${conditions.join("；")}。条件之外的情况仍然需要新的材料。`
            : "哪些人、时间范围、反例和新证据仍然没有覆盖，应继续留在雾里。",
          unresolved: true,
        });
        break;
    }
  }

  chapters.push({
    id: "unknown",
    kicker: "仍然未知",
    title: "理解到这里，并不等于结论已经被证明",
    body: "共鸣只说明这些认知碎片已经重新连成一条可理解的思路；没有恢复出来的部分仍然保持未知。",
    unresolved: true,
  });
  return chapters;
}
