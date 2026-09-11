import type { WorldConfig } from "../types";

// 「年轻人该不该裸辞？」灰盒世界配置 —— world-design-v0.2 §6.1 全表落地。
// 世界尺寸 40×24 格；坐标均为网格坐标（1 格 = 48px，渲染层负责缩放）。
// rect 采用 {x, y, w, h}，由规格表的闭区间（如 x2–12）换算为 w = 12 - 2 + 1。
// 立绘灰盒期复用 public/worlds/crossroads/ 下现有 PNG，按角色气质就近分配；
// 没有合适立绘的 NPC（AI 融合观点）sprite 置空串，由渲染层画半透明色块。
export const qLuociWorld: WorldConfig = {
  questionId: "q_luoci",
  worldType: "crossroads",
  name: "分岔之城 · 裸辞",
  tileset: "graybox",
  size: { w: 40, h: 24 },
  spawn: { x: 20, y: 10 }, // 中央车站北侧门口
  zones: [
    {
      id: "z_stoploss",
      rect: { x: 2, y: 2, w: 11, h: 9 }, // x2–12, y2–10
      camp: "止损派",
      terrain: "plaza",
      label: { "zh-CN": "止损区", "en-US": "Stop-loss Quarter" },
    },
    {
      id: "z_steady",
      rect: { x: 28, y: 2, w: 11, h: 9 }, // x28–38, y2–10
      camp: "稳健派",
      terrain: "plaza",
      label: { "zh-CN": "稳健区", "en-US": "Steady Quarter" },
    },
    {
      id: "z_rights",
      rect: { x: 14, y: 14, w: 13, h: 9 }, // x14–26, y14–22
      camp: "维权派",
      terrain: "plaza",
      label: { "zh-CN": "维权区", "en-US": "Rights Quarter" },
    },
    {
      id: "z_station",
      rect: { x: 18, y: 10, w: 5, h: 5 }, // x18–22, y10–14
      terrain: "station",
      label: { "zh-CN": "中央车站", "en-US": "Central Station" },
    },
    {
      id: "z_mist",
      rect: { x: 14, y: 11, w: 13, h: 3 }, // x14–26, y11–13
      terrain: "fog",
      label: { "zh-CN": "长期效果迷雾带", "en-US": "Long-term Fog Belt" },
      stateKey: "fog:z_mist",
    },
  ],
  npcs: [
    {
      id: "npc_stoploss",
      opinionId: "o_stoploss", // 止损派, support 86（全图最高 → 纪念碑原型）
      zoneId: "z_stoploss",
      pos: { x: 7, y: 6 },
      sprite: "/worlds/crossroads/npc-archivist-v1.png",
      role: "车站管理员",
      dialogueId: "dlg_luoci_stoploss",
    },
    {
      id: "npc_cashflow",
      opinionId: "o_cashflow", // 稳健派, 79
      zoneId: "z_steady",
      pos: { x: 33, y: 6 },
      sprite: "/worlds/crossroads/npc-archivist-v1.png",
      role: "账房先生",
      dialogueId: "dlg_luoci_cashflow",
    },
    {
      id: "npc_inwork",
      opinionId: "o_inwork", // 稳健派, 64
      zoneId: "z_steady",
      pos: { x: 30, y: 8 },
      sprite: "/worlds/crossroads/npc-field-observer-v1.png",
      role: "在职工匠",
      dialogueId: "dlg_luoci_inwork",
    },
    {
      id: "npc_transform",
      opinionId: "o_transform", // 止损派, 58
      zoneId: "z_stoploss",
      pos: { x: 4, y: 8 },
      sprite: "/worlds/crossroads/npc-crossroads-traveler-v1.png",
      role: "转行车票贩",
      dialogueId: "dlg_luoci_transform",
    },
    {
      id: "npc_legal",
      opinionId: "o_legal", // 维权派, 52
      zoneId: "z_rights",
      pos: { x: 17, y: 18 },
      sprite: "/worlds/crossroads/npc-archivist-v1.png",
      role: "仲裁书记员",
      dialogueId: "dlg_luoci_legal",
    },
    {
      id: "npc_inner",
      opinionId: "o_inner", // 维权派, 47
      zoneId: "z_rights",
      pos: { x: 23, y: 18 },
      sprite: "/worlds/crossroads/npc-field-observer-v1.png",
      role: "心理咨询摊主",
      dialogueId: "dlg_luoci_inner",
    },
    {
      id: "npc_window",
      opinionId: "o_window", // 止损派, 41
      zoneId: "z_mist", // 迷雾带边缘
      pos: { x: 25, y: 12 },
      sprite: "/worlds/crossroads/npc-crossroads-traveler-v1.png",
      role: "雾中旅人",
      dialogueId: "dlg_luoci_window",
    },
    {
      id: "npc_threshold",
      opinionId: "o_threshold", // AI 融合观点, 60 → 半透明未完成材质
      zoneId: "z_station",
      pos: { x: 20, y: 11 },
      sprite: "", // 无合适立绘：渲染层画半透明色块
      role: "半透明售票员",
      dialogueId: "dlg_luoci_threshold",
      translucent: true,
    },
  ],
  pois: [
    {
      id: "poi_bridge_a",
      kind: "bridge",
      pos: { x: 13, y: 6 }, // x12–14, y5–7，连接止损区与稳健区
      requires: { comparedPair: ["o_stoploss", "o_cashflow"] },
      stateKey: "bridge:o_stoploss:o_cashflow",
      label: { "zh-CN": "条件桥 A", "en-US": "Conditional Bridge A" },
    },
    {
      id: "poi_bridge_b",
      kind: "bridge",
      pos: { x: 27, y: 17 }, // x26–28, y16–18，连接维权区与稳健区方向
      requires: { comparedPair: ["o_legal", "o_inner"] },
      stateKey: "bridge:o_legal:o_inner",
      label: { "zh-CN": "条件桥 B", "en-US": "Conditional Bridge B" },
    },
    {
      id: "poi_fog_mist",
      kind: "fog",
      pos: { x: 20, y: 12 }, // 迷雾带中心
      stateKey: "fog:z_mist",
      label: { "zh-CN": "长期效果迷雾", "en-US": "Long-term Fog" },
    },
    {
      id: "poi_monument",
      kind: "monument",
      pos: { x: 20, y: 3 }, // x19–21, y2–4；展示 support 最高观点（o_stoploss, 86）
      label: { "zh-CN": "高赞纪念碑", "en-US": "Top-voted Monument" },
    },
    {
      id: "poi_observatory",
      kind: "observatory",
      pos: { x: 3, y: 21 }, // x2–4, y20–22；观测站放置推荐位
      label: { "zh-CN": "观测点", "en-US": "Observatory Site" },
    },
    {
      id: "poi_rocket",
      kind: "rocket",
      pos: { x: 37, y: 21 }, // x36–39, y20–23；返回宇宙
      label: { "zh-CN": "火箭坪", "en-US": "Rocket Pad" },
    },
  ],
  triggers: [
    {
      id: "t_first_land",
      on: "first-land",
      guideLineKey: "world.q_luoci.guide.first-land",
      once: true,
    },
    {
      id: "t_enter_mist",
      on: "enter-zone",
      zoneId: "z_mist",
      guideLineKey: "world.q_luoci.guide.enter-mist",
      once: true,
    },
    {
      id: "t_compare_done",
      on: "compare-done",
      guideLineKey: "world.q_luoci.guide.compare-done",
      // 非 once：每次完成比较都触发（§5.4 第 3 步之后的看山点评钩子）。
      once: false,
    },
    {
      id: "t_before_leave",
      on: "before-leave",
      guideLineKey: "world.q_luoci.guide.before-leave",
    },
  ],
};
