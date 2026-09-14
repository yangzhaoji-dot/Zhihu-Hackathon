import type { Opinion, OpinionGraph } from "../opinion/types";

export const DIMENSIONS = ["health", "resources", "growth", "values", "context", "reasoning", "other"] as const;
export type Dimension = (typeof DIMENSIONS)[number];
export type Viewport = { x: number; y: number; width: number; height: number };
export const OVERVIEW: Viewport = { x: 0, y: 0, width: 1440, height: 900 };
export type GalaxyNode = { opinion: Opinion; x: number; y: number; radius: number; sourceCount: number };
export type GalaxyCluster = { id: Dimension; x: number; y: number; nodes: GalaxyNode[]; bounds: Viewport };
export type Galaxy = { graph: OpinionGraph; clusters: GalaxyCluster[]; count: number; excludedCount: number; demo: boolean };

const KEYWORDS: Record<Dimension, readonly string[]> = {
  health: ["健康", "身心", "心理", "焦虑", "压力", "情绪", "消耗", "痛苦", "health", "stress", "wellbeing"],
  resources: ["存款", "现金", "成本", "收入", "经济", "家庭", "风险", "费用", "资源", "income", "cost", "money", "risk"],
  growth: ["职业", "成长", "能力", "技能", "学习", "机会", "转型", "教育", "career", "skill", "learning"],
  values: ["自由", "意义", "价值", "尊严", "选择权", "认同", "人生", "公平", "伦理", "value", "freedom", "ethic"],
  context: ["行业", "环境", "制度", "公司", "市场", "周期", "技术", "法律", "组织", "system", "market", "industry", "technology"],
  reasoning: ["证据", "数据", "调查", "判断", "信息", "前提", "因果", "比较", "样本", "evidence", "data", "assumption"],
  other: [],
};

/** Stable positions survive rerenders, navigation and different API ordering. */
export function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) h = Math.imul(h ^ value.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function classify(opinion: Opinion): Dimension {
  // Explicitly a keyword fallback, not AI clustering or a support/oppose camp.
  const text = `${opinion.title} ${opinion.summary} ${opinion.reason ?? ""}`.toLowerCase();
  let best: Dimension = "other";
  let score = 0;
  for (const id of DIMENSIONS) {
    const next = KEYWORDS[id].reduce((sum, word) => sum + (text.includes(word) ? 1 : 0), 0);
    if (next > score) { best = id; score = next; }
  }
  return best;
}

export function fitBounds(nodes: readonly { x: number; y: number }[], padding = 70): Viewport {
  if (!nodes.length) return OVERVIEW;
  const xs = nodes.map((node) => node.x), ys = nodes.map((node) => node.y);
  const width = Math.max(260, Math.max(...xs) - Math.min(...xs) + padding * 2);
  const height = Math.max(190, Math.max(...ys) - Math.min(...ys) + padding * 2);
  return { x: (Math.max(...xs) + Math.min(...xs) - width) / 2, y: (Math.max(...ys) + Math.min(...ys) - height) / 2, width, height };
}

export function buildGalaxy(graph: OpinionGraph, assignments: Record<string, Dimension> = {}): Galaxy {
  const demo = graph.sourceScope === "demo";
  const sourceIds = new Set(graph.sources.map((source) => source.id));
  const unique = new Map<string, Opinion>();
  for (const opinion of graph.opinions) {
    if (opinion.kind === "ai" || opinion.origin === "ai-derived" || ["station", "topic", "user"].includes(opinion.nodeType ?? "")) continue;
    if (!unique.has(opinion.id)) unique.set(opinion.id, opinion);
  }
  const groups = new Map<Dimension, Opinion[]>();
  for (const opinion of unique.values()) {
    const id = assignments[opinion.id] ?? classify(opinion);
    groups.set(id, [...(groups.get(id) ?? []), opinion]);
  }
  const ids = DIMENSIONS.filter((id) => groups.has(id));
  const clusters = ids.map((id, index): GalaxyCluster => {
    const angle = -1.92 + index * Math.PI * 2 / Math.max(1, ids.length);
    const x = 720 + Math.cos(angle) * (450 + (index % 2) * 28);
    const y = 450 + Math.sin(angle) * (277 + (index % 2) * 18);
    const opinions = [...groups.get(id)!].sort((a, b) => a.id.localeCompare(b.id, "en"));
    const nodes = opinions.map((opinion, i): GalaxyNode => {
      const seed = hash(opinion.id);
      const theta = i * 2.399963 + (seed % 100) / 200;
      const reach = 17 + Math.sqrt((i + .5) / opinions.length) * 102;
      const sourceCount = new Set(opinion.sourceIds.filter((sourceId) => sourceIds.has(sourceId))).size;
      return {
        opinion, x: x + Math.cos(theta) * reach, y: y + Math.sin(theta) * reach * .77,
        radius: demo ? 5 + seed % 9 : 5 + Math.sqrt(Math.min(20, sourceCount)) * 1.8,
        sourceCount,
      };
    });
    // Deterministic, bounded collision relaxation; preserves the cloud instead of a menu grid.
    for (let iteration = 0; iteration < 45; iteration++) {
      for (let a = 0; a < nodes.length; a++) for (let b = a + 1; b < nodes.length; b++) {
        const left = nodes[a], right = nodes[b];
        let dx = right.x - left.x, dy = right.y - left.y;
        const distance = Math.hypot(dx, dy), minimum = left.radius + right.radius + 17;
        if (distance >= minimum) continue;
        if (distance < .001) { dx = 1; dy = .5; }
        const norm = Math.hypot(dx, dy), step = (minimum - distance) * .51;
        left.x -= dx / norm * step; left.y -= dy / norm * step;
        right.x += dx / norm * step; right.y += dy / norm * step;
      }
    }
    return { id, x, y, nodes, bounds: fitBounds(nodes) };
  });
  return { graph, clusters, count: unique.size, excludedCount: graph.opinions.length - unique.size, demo };
}

export function viewportString(view: Viewport): string { return `${view.x} ${view.y} ${view.width} ${view.height}`; }
export function safeSourceUrl(value: string): string | null {
  try { const url = new URL(value); return url.protocol === "https:" && (url.hostname === "zhihu.com" || url.hostname.endsWith(".zhihu.com")) && !/question\/0+\//.test(url.pathname) ? url.href : null; } catch { return null; }
}
