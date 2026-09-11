import { type NextRequest, NextResponse } from "next/server";
import { getOpinionGraph } from "@/lib/opinion/store";
import {
  buildFallbackWorldConfig,
  getWorldConfig,
} from "@/lib/opinion/world-config";

// GET /api/opinion/world/config?questionId=q_luoci
// 世界配置 + 与图谱联动后的运行时视图（world-design-v0.2 §4.1）。
// - world.config 原样下发（显式配置或 fallback 通用布局）；
// - world.npcs[] 把 NPC 配置与其 Opinion 数据合并；
// - world.zones[] 带 camp/opinionCount/terrain/label；
// - 未配置议题（含 q_live_*）：unconfigured:true，config 为 fallback 布局。
// 读接口公开，无需鉴权。
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("questionId");
  if (raw !== null && raw.trim() === "") {
    return NextResponse.json(
      { ok: false, error: "invalid_input" },
      { status: 400 },
    );
  }
  // 缺省与 /api/opinion/graph 保持一致：回落到核心议题 q_luoci。
  const questionId = raw ?? "q_luoci";

  const graph = getOpinionGraph(questionId);
  if (!graph) {
    return NextResponse.json(
      { ok: false, error: "opinion_space_not_found" },
      { status: 404 },
    );
  }

  const configured = getWorldConfig(questionId);
  const config = configured ?? buildFallbackWorldConfig(questionId, graph);

  const opinionById = new Map(graph.opinions.map((o) => [o.id, o]));
  const npcs = config.npcs.flatMap((npc) => {
    const opinion = opinionById.get(npc.opinionId);
    // 配置引用了 graph 中不存在的观点时跳过（validate-world-config.ts
    // 会在开发期拦截；运行期保持健壮不 500）。
    if (!opinion) return [];
    return [
      {
        id: npc.id,
        opinion,
        sourceCount: opinion.sourceIds.length,
        pos: npc.pos,
        sprite: npc.sprite,
        role: npc.role,
        translucent: npc.translucent ?? false,
      },
    ];
  });

  const zones = config.zones.map((zone) => ({
    id: zone.id,
    camp: zone.camp,
    opinionCount: zone.camp
      ? graph.opinions.filter((o) => o.camp === zone.camp).length
      : config.npcs.filter((n) => n.zoneId === zone.id).length,
    terrain: zone.terrain,
    label: zone.label,
  }));

  return NextResponse.json({
    ok: true,
    world: { config, npcs, zones, unconfigured: !configured },
  });
}
