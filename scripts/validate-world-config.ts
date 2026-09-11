/**
 * 世界配置校验脚本（world-design-v0.2 §9 M1 验收）。
 *
 * 运行：npx bun scripts/validate-world-config.ts
 *
 * 校验内容：
 * 1. q_luoci 灰盒配置：每个 NPC 的 opinionId 都能在 getOpinionGraph("q_luoci")
 *    中找到；每个 zoneId 引用存在；所有坐标在 40×24 范围内；Poi 的 stateKey
 *    与其引用的 Zone / Opinion 一致；非空 sprite 路径在 public/ 下真实存在。
 * 2. buildFallbackWorldConfig() 单测：对未配置的 q_live_* 风格议题产出
 *    可渲染的通用布局（sprite 空串、坐标越界为零、rocket 坪与 spawn 存在）。
 *
 * 注意：store.ts 顶部有 `import "server-only"`，该包未装进 node_modules
 * （Next 构建期内部解析）。这里用 Bun 运行时插件把它 stub 成空模块，
 * 再用动态 import 拿到真实的 getOpinionGraph，保证校验的就是线上数据。
 */

// "bun" 模块的类型声明在 scripts/bun-runtime.d.ts（项目未装 bun-types）。
import { plugin } from "bun";
import { existsSync } from "node:fs";
import path from "node:path";

plugin({
  name: "stub-server-only",
  setup(build) {
    build.module("server-only", () => ({ exports: {}, loader: "object" }));
  },
});

import { buildFallbackWorldConfig, getWorldConfig } from "../src/lib/opinion/world-config";
import type { OpinionGraph, WorldConfig } from "../src/lib/opinion/types";

const { getOpinionGraph } = await import("../src/lib/opinion/store");

const ROOT = process.cwd();
let failures = 0;

function ok(message: string) {
  console.log(`OK   ${message}`);
}
function fail(message: string) {
  failures += 1;
  console.error(`FAIL ${message}`);
}
function check(condition: boolean, message: string) {
  if (condition) ok(message);
  else fail(message);
}

function inBounds(pos: { x: number; y: number }, size: { w: number; h: number }) {
  return pos.x >= 0 && pos.y >= 0 && pos.x < size.w && pos.y < size.h;
}

function validateWorldConfig(config: WorldConfig, graph: OpinionGraph, tag: string) {
  const opinionIds = new Set(graph.opinions.map((o) => o.id));
  const zoneIds = new Set(config.zones.map((z) => z.id));

  check(
    inBounds(config.spawn, config.size),
    `${tag} spawn (${config.spawn.x},${config.spawn.y}) 在 ${config.size.w}×${config.size.h} 范围内`,
  );

  for (const zone of config.zones) {
    const { x, y, w, h } = zone.rect;
    check(
      x >= 0 && y >= 0 && w > 0 && h > 0 && x + w <= config.size.w && y + h <= config.size.h,
      `${tag} zone ${zone.id} rect 在界内 (x${x}..${x + w - 1}, y${y}..${y + h - 1})`,
    );
  }

  const npcIds = new Set<string>();
  for (const npc of config.npcs) {
    check(!npcIds.has(npc.id), `${tag} npc id 唯一: ${npc.id}`);
    npcIds.add(npc.id);
    check(
      opinionIds.has(npc.opinionId),
      `${tag} ${npc.id} 绑定的 opinionId ${npc.opinionId} 存在于 graph`,
    );
    check(zoneIds.has(npc.zoneId), `${tag} ${npc.id} 的 zoneId ${npc.zoneId} 存在`);
    check(inBounds(npc.pos, config.size), `${tag} ${npc.id} 坐标 (${npc.pos.x},${npc.pos.y}) 在界内`);
    const opinion = graph.opinions.find((o) => o.id === npc.opinionId);
    if (npc.translucent) {
      check(
        opinion?.kind === "ai",
        `${tag} ${npc.id} translucent=true → 观点 kind 为 ai（实际: ${opinion?.kind}）`,
      );
    }
    if (npc.sprite !== "") {
      const spritePath = path.join(ROOT, "public", npc.sprite.replace(/^\//, ""));
      check(existsSync(spritePath), `${tag} ${npc.id} sprite 文件存在: ${npc.sprite}`);
    }
  }

  for (const poi of config.pois) {
    check(inBounds(poi.pos, config.size), `${tag} poi ${poi.id} 坐标 (${poi.pos.x},${poi.pos.y}) 在界内`);
    if (poi.stateKey) {
      const [prefix, ...rest] = poi.stateKey.split(":");
      if (prefix === "fog" || prefix === "ruin") {
        check(
          zoneIds.has(rest.join(":")),
          `${tag} poi ${poi.id} stateKey "${poi.stateKey}" 引用的 zone 存在`,
        );
      } else if (prefix === "bridge") {
        check(
          rest.length === 2 && opinionIds.has(rest[0]) && opinionIds.has(rest[1]),
          `${tag} poi ${poi.id} stateKey "${poi.stateKey}" 引用的两个观点存在`,
        );
      } else {
        ok(`${tag} poi ${poi.id} stateKey "${poi.stateKey}" 无需引用校验`);
      }
    }
    if (poi.requires?.comparedPair) {
      const [a, b] = poi.requires.comparedPair;
      check(
        opinionIds.has(a) && opinionIds.has(b),
        `${tag} poi ${poi.id} requires.comparedPair (${a} × ${b}) 双方观点存在`,
      );
    }
  }

  for (const trigger of config.triggers) {
    if (trigger.on === "enter-zone") {
      check(
        Boolean(trigger.zoneId) && zoneIds.has(trigger.zoneId!),
        `${tag} trigger ${trigger.id} (enter-zone) zoneId ${trigger.zoneId} 存在`,
      );
    }
  }
}

// ── 1. q_luoci 灰盒配置 ─────────────────────────────────────────────────────
const graph = getOpinionGraph("q_luoci");
if (!graph) {
  fail('getOpinionGraph("q_luoci") 返回 null');
} else {
  ok(`graph q_luoci 加载：${graph.opinions.length} 观点 / ${graph.sources.length} 来源`);
  const config = getWorldConfig("q_luoci");
  if (!config) {
    fail('getWorldConfig("q_luoci") 返回 null（应命中 worlds/q_luoci.ts）');
  } else {
    check(config.size.w === 40 && config.size.h === 24, "q_luoci 世界尺寸 40×24");
    check(config.tileset === "graybox", 'q_luoci tileset 为 "graybox"');
    check(config.npcs.length === 8, `q_luoci NPC 数量 = 8（实际 ${config.npcs.length}）`);
    check(
      config.triggers.some((t) => t.on === "first-land") &&
        config.triggers.some((t) => t.on === "enter-zone" && t.zoneId === "z_mist" && t.once) &&
        config.triggers.some((t) => t.on === "before-leave"),
      "q_luoci 触发器含 first-land / enter-zone(z_mist, once) / before-leave",
    );
    validateWorldConfig(config, graph, "[q_luoci]");
  }
}

// ── 2. 未配置议题：getWorldConfig 返回 null，fallback 可渲染 ────────────────
check(
  getWorldConfig("q_live_999") === null,
  'getWorldConfig("q_live_999") 未配置议题返回 null',
);

const fakeGraph: OpinionGraph = {
  questionId: "q_live_999",
  questionTitle: "年轻人该不该在大城市买房？",
  opinions: [
    { id: "o_live_a", questionId: "q_live_999", title: "早上车早安心", summary: "", kind: "human", support: 70, x: 0.3, y: 0.3, sourceIds: ["s_live_1"], camp: "上车派" },
    { id: "o_live_b", questionId: "q_live_999", title: "租购同权再等一等", summary: "", kind: "human", support: 55, x: 0.7, y: 0.3, sourceIds: ["s_live_2"], camp: "观望派" },
    { id: "o_live_c", questionId: "q_live_999", title: "关键看现金流安全边际", summary: "", kind: "ai", support: 60, x: 0.5, y: 0.6, sourceIds: [], derivedFrom: ["o_live_a", "o_live_b"] },
  ],
  relations: [],
  authors: [],
  sources: [],
};

const fallback = buildFallbackWorldConfig("q_live_999", fakeGraph);
check(fallback.worldType.length > 0, `fallback 主题推导结果: ${fallback.worldType}`);
check(fallback.tileset === "graybox", 'fallback tileset 为 "graybox"');
check(
  fallback.zones.filter((z) => z.camp).length === 3,
  `fallback 按 camp 聚类分区 = 3（上车派/观望派/无阵营 AI 归入「其他」；实际 ${fallback.zones.filter((z) => z.camp).length}）`,
);
check(
  fallback.npcs.length === fakeGraph.opinions.length,
  `fallback 每观点一个 NPC（${fallback.npcs.length}/${fakeGraph.opinions.length}）`,
);
check(
  fallback.npcs.every((n) => n.sprite === ""),
  "fallback NPC sprite 均为空串（渲染层画色块）",
);
check(
  fallback.npcs.find((n) => n.opinionId === "o_live_c")?.translucent === true,
  "fallback AI 观点 NPC translucent=true",
);
check(
  fallback.pois.some((p) => p.kind === "rocket"),
  "fallback 含火箭坪 Poi",
);
validateWorldConfig(fallback, fakeGraph, "[fallback]");

// ── 汇总 ────────────────────────────────────────────────────────────────────
if (failures > 0) {
  console.error(`\n${failures} 项校验失败`);
  process.exit(1);
}
console.log("\n全部校验通过");
