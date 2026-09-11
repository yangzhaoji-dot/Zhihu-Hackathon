import type {
  NpcConfig,
  OpinionGraph,
  Poi,
  WorldConfig,
  WorldTrigger,
  Zone,
} from "./types";
import { getOpinionWorldTheme } from "./world-theme";
import { WORLD_CONFIGS } from "./worlds";

// 世界配置层（world-design-v0.2 §3.1 / D2）。
// 显式配置优先；未配置议题（含 q_live_* 动态议题）回退到
// buildFallbackWorldConfig() 生成的通用布局，保证任何议题都能降落。

/** 查找议题的手工世界配置；未配置返回 null（由调用方走 fallback）。 */
export function getWorldConfig(questionId: string): WorldConfig | null {
  return WORLD_CONFIGS[questionId] ?? null;
}

// ── 未配置议题的通用布局 ────────────────────────────────────────────────────

const FALLBACK_SIZE = { w: 40, h: 24 };
const MARGIN = 2; // 世界边缘留白（格）
const ZONE_TOP = 3; // 阵营区顶边
const ZONE_HEIGHT = 12; // 阵营区高度
const ZONE_GAP = 1; // 相邻阵营区之间的间隔
const ROAD_Y = 16; // 主干道顶边（阵营区下方）
const ROAD_HEIGHT = 2;

/**
 * 未配置议题的通用世界布局：
 * - 主题用 world-theme.ts 的关键词推导（hash 兜底），保证同议题稳定；
 * - 按 graph 的 camp 聚类自动分区，阵营区在顶部横向均分（plaza）；
 * - 每个观点生成一个 NPC（sprite 置空串，渲染层 M2 画色块），
 *   AI 观点（kind==="ai"）标 translucent；
 * - 阵营区下方一条主干道（road），底部为默认 spawn 与火箭坪。
 */
export function buildFallbackWorldConfig(
  questionId: string,
  graph: OpinionGraph,
): WorldConfig {
  const theme = getOpinionWorldTheme({
    id: questionId,
    title: graph.questionTitle,
    summary: "",
  });

  // 按 camp 聚类（无阵营归入「其他」），阵营间按总 support 降序，保证布局稳定。
  const camps = new Map<string, typeof graph.opinions>();
  for (const opinion of graph.opinions) {
    const camp = opinion.camp ?? "其他";
    const list = camps.get(camp);
    if (list) list.push(opinion);
    else camps.set(camp, [opinion]);
  }
  const orderedCamps = [...camps.entries()].sort(
    (a, b) =>
      b[1].reduce((sum, o) => sum + o.support, 0) -
      a[1].reduce((sum, o) => sum + o.support, 0),
  );

  const { w: W } = FALLBACK_SIZE;
  const usableWidth = W - MARGIN * 2 - ZONE_GAP * Math.max(orderedCamps.length - 1, 0);
  const zoneWidth =
    orderedCamps.length > 0 ? Math.floor(usableWidth / orderedCamps.length) : 0;

  const zones: Zone[] = [];
  const npcs: NpcConfig[] = [];

  orderedCamps.forEach(([camp, opinions], index) => {
    const zone: Zone = {
      id: `z_camp_${index}`,
      rect: {
        x: MARGIN + index * (zoneWidth + ZONE_GAP),
        y: ZONE_TOP,
        w: zoneWidth,
        h: ZONE_HEIGHT,
      },
      camp,
      terrain: "plaza",
      label: { "zh-CN": camp, "en-US": `Camp ${index + 1}` },
    };
    zones.push(zone);

    // 区内网格摆位：从左下角内缩 1 格起，横向步进 3 格，换行纵向步进 3 格；
    // 超出区高时钳制在区内底行（灰盒可容忍拥挤，正式议题应手写配置）。
    const innerW = zoneWidth - 2;
    const cols = Math.max(1, Math.floor((innerW + 1) / 3));
    const maxRow = Math.max(0, Math.floor((ZONE_HEIGHT - 3) / 3));
    opinions.forEach((opinion, opinionIndex) => {
      const col = opinionIndex % cols;
      const row = Math.min(Math.floor(opinionIndex / cols), maxRow);
      npcs.push({
        id: `npc_${opinion.id}`,
        opinionId: opinion.id,
        zoneId: zone.id,
        pos: {
          x: zone.rect.x + 1 + col * 3,
          y: zone.rect.y + 1 + row * 3,
        },
        sprite: "", // 通用布局无立绘：渲染层画色块
        role: opinion.kind === "ai" ? "推演幻影" : "观点持有者",
        dialogueId: `dlg_${questionId}_${opinion.id}`,
        ...(opinion.kind === "ai" ? { translucent: true } : {}),
      });
    });
  });

  // 主干道：阵营区下方横贯世界，保证各区与火箭坪连通。
  zones.push({
    id: "z_road",
    rect: { x: MARGIN, y: ROAD_Y, w: W - MARGIN * 2, h: ROAD_HEIGHT },
    terrain: "road",
    label: { "zh-CN": "主干道", "en-US": "Main Road" },
  });

  const pois: Poi[] = [
    {
      id: "poi_rocket",
      kind: "rocket",
      pos: { x: W - MARGIN - 2, y: FALLBACK_SIZE.h - MARGIN - 2 },
      label: { "zh-CN": "火箭坪", "en-US": "Rocket Pad" },
    },
  ];

  const triggers: WorldTrigger[] = [
    {
      id: "t_first_land",
      on: "first-land",
      guideLineKey: "world.fallback.guide.first-land",
      once: true,
    },
    {
      id: "t_before_leave",
      on: "before-leave",
      guideLineKey: "world.fallback.guide.before-leave",
    },
  ];

  return {
    questionId,
    worldType: theme.id,
    name: `${graph.questionTitle} · 灰盒`,
    tileset: "graybox",
    size: { ...FALLBACK_SIZE },
    spawn: { x: Math.floor(W / 2), y: FALLBACK_SIZE.h - MARGIN - 2 }, // 底部中央，主干道旁
    zones,
    npcs,
    pois,
    triggers,
  };
}
