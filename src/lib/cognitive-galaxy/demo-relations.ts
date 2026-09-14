import type { OpinionGraph, Relation, RelationType } from "../opinion/types";

const CAMPS = ["health", "resources", "growth", "values", "context", "reasoning"] as const;
const LOCAL_TYPES: RelationType[] = ["support", "add", "cond"];

export function withDemoRelations(graph: OpinionGraph): OpinionGraph {
  if (graph.sourceScope !== "demo" || graph.relations.length) return graph;
  const relations: Relation[] = [];
  const groups = new Map<string, typeof graph.opinions>();
  for (const opinion of graph.opinions) {
    const key = opinion.camp ?? "other";
    groups.set(key, [...(groups.get(key) ?? []), opinion]);
  }

  for (const camp of CAMPS) {
    const nodes = [...(groups.get(camp) ?? [])].sort((a, b) => a.id.localeCompare(b.id, "en"));
    for (let i = 1; i < nodes.length; i += 1) {
      const type = LOCAL_TYPES[(i - 1) % LOCAL_TYPES.length];
      relations.push({
        from: nodes[i - 1].id,
        to: nodes[i].id,
        type,
        rationale: type === "support"
          ? "同一思考方向中的两个判断共享核心关切。"
          : type === "cond"
            ? "后一个判断补充了前一个判断成立时需要考虑的条件。"
            : "后一个判断为同一方向增加了新的观察维度。",
      });
    }
  }

  const head = (camp: string) => [...(groups.get(camp) ?? [])].sort((a, b) => a.id.localeCompare(b.id, "en"))[0];
  const cross: Array<[string, string, RelationType, string]> = [
    ["health", "resources", "cond", "身心边界与资源缓冲共同决定一个选择是否可承受。"],
    ["resources", "growth", "cond", "资源约束会改变长期路径可以承受的试错空间。"],
    ["growth", "values", "add", "长期路径最终仍需要回到个人真正想优化的目标。"],
    ["context", "growth", "cond", "环境与制度会改变相同个人能力能够换来的机会。"],
    ["reasoning", "context", "add", "判断外部环境之前，需要先检查样本、证据与前提。"],
    ["reasoning", "values", "oppose", "事实证据能够约束判断，但不能独自决定价值排序。"],
  ];
  for (const [fromCamp, toCamp, type, rationale] of cross) {
    const from = head(fromCamp), to = head(toCamp);
    if (from && to) relations.push({ from: from.id, to: to.id, type, rationale });
  }

  return { ...graph, relations };
}
