import type { WorldConfig } from "../types";

// 「年轻人该不该裸辞？」环境叙事验证版。
//
// v0.3 的关键变化：
// - 场景不再把“观点 = 站在地图上的人”作为默认表达；
// - 观点仍沿用 NpcConfig 这条成熟的数据/交互管线，但视觉上改为可调查的环境物件；
// - role 统一使用「看山 · 物件名」，让静态/AI 对话都由看山承担解释者角色；
// - sprite 留空，由 WorldScene 根据 npc id 渲染 CSS 微缩物件；
// - tileset = diorama-v1，渲染层会隐藏灰盒网格与区域标签，转为微缩景观语言。
//
// 这是“无人环境探索”路线的第一版验证，不代表最终美术资产。
export const qLuociWorld: WorldConfig = {
  questionId: "q_luoci",
  worldType: "crossroads",
  name: "分岔之城 · 裸辞",
  tileset: "diorama-v1",
  size: { w: 40, h: 24 },
  spawn: { x: 20, y: 10 },
  zones: [
    {
      id: "z_stoploss",
      rect: { x: 2, y: 2, w: 11, h: 9 },
      camp: "止损派",
      terrain: "plaza",
      label: { "zh-CN": "离场街区", "en-US": "Exit Quarter" },
    },
    {
      id: "z_steady",
      rect: { x: 28, y: 2, w: 11, h: 9 },
      camp: "稳健派",
      terrain: "plaza",
      label: { "zh-CN": "缓冲街区", "en-US": "Buffer Quarter" },
    },
    {
      id: "z_rights",
      rect: { x: 14, y: 14, w: 13, h: 9 },
      camp: "维权派",
      terrain: "plaza",
      label: { "zh-CN": "取证街区", "en-US": "Evidence Quarter" },
    },
    {
      id: "z_station",
      rect: { x: 18, y: 10, w: 5, h: 5 },
      terrain: "station",
      label: { "zh-CN": "中央换乘站", "en-US": "Central Interchange" },
    },
    {
      id: "z_mist",
      rect: { x: 14, y: 11, w: 13, h: 3 },
      terrain: "fog",
      label: { "zh-CN": "长期结果未知区", "en-US": "Long-term Unknown" },
      stateKey: "fog:z_mist",
    },
  ],

  // 兼容层：这些条目仍叫 npcs，因为现有来源追溯、观点卡、比较和 AI 对话都依赖它。
  // 但在 diorama-v1 中它们不会渲染成人，而会渲染成环境物件。
  npcs: [
    {
      id: "npc_stoploss",
      opinionId: "o_stoploss",
      zoneId: "z_stoploss",
      pos: { x: 7, y: 6 },
      sprite: "",
      role: "看山 · 离职申请箱",
      dialogueId: "dlg_luoci_stoploss",
    },
    {
      id: "npc_cashflow",
      opinionId: "o_cashflow",
      zoneId: "z_steady",
      pos: { x: 33, y: 6 },
      sprite: "",
      role: "看山 · 现金流账本台",
      dialogueId: "dlg_luoci_cashflow",
    },
    {
      id: "npc_inwork",
      opinionId: "o_inwork",
      zoneId: "z_steady",
      pos: { x: 30, y: 8 },
      sprite: "",
      role: "看山 · 在职试验工坊",
      dialogueId: "dlg_luoci_inwork",
    },
    {
      id: "npc_transform",
      opinionId: "o_transform",
      zoneId: "z_stoploss",
      pos: { x: 4, y: 8 },
      sprite: "",
      role: "看山 · 转行售票机",
      dialogueId: "dlg_luoci_transform",
    },
    {
      id: "npc_legal",
      opinionId: "o_legal",
      zoneId: "z_rights",
      pos: { x: 17, y: 18 },
      sprite: "",
      role: "看山 · 仲裁档案柜",
      dialogueId: "dlg_luoci_legal",
    },
    {
      id: "npc_inner",
      opinionId: "o_inner",
      zoneId: "z_rights",
      pos: { x: 23, y: 18 },
      sprite: "",
      role: "看山 · 无人休息长椅",
      dialogueId: "dlg_luoci_inner",
    },
    {
      id: "npc_window",
      opinionId: "o_window",
      zoneId: "z_mist",
      pos: { x: 25, y: 12 },
      sprite: "",
      role: "看山 · 机会时刻表",
      dialogueId: "dlg_luoci_window",
    },
    {
      id: "npc_threshold",
      opinionId: "o_threshold",
      zoneId: "z_station",
      pos: { x: 20, y: 11 },
      sprite: "",
      role: "看山 · 条件闸机",
      dialogueId: "dlg_luoci_threshold",
      translucent: true,
    },
  ],
  pois: [
    {
      id: "poi_bridge_a",
      kind: "bridge",
      pos: { x: 13, y: 6 },
      requires: { comparedPair: ["o_stoploss", "o_cashflow"] },
      stateKey: "bridge:o_stoploss:o_cashflow",
      label: { "zh-CN": "尚未连通的条件桥", "en-US": "Unresolved Conditional Bridge" },
    },
    {
      id: "poi_bridge_b",
      kind: "bridge",
      pos: { x: 27, y: 17 },
      requires: { comparedPair: ["o_legal", "o_inner"] },
      stateKey: "bridge:o_legal:o_inner",
      label: { "zh-CN": "尚未连通的解释桥", "en-US": "Unresolved Interpretation Bridge" },
    },
    {
      id: "poi_fog_mist",
      kind: "fog",
      pos: { x: 20, y: 12 },
      stateKey: "fog:z_mist",
      label: { "zh-CN": "长期结果迷雾", "en-US": "Long-term Fog" },
    },
    {
      id: "poi_monument",
      kind: "monument",
      pos: { x: 20, y: 3 },
      label: { "zh-CN": "高赞扩音塔", "en-US": "Top-voted Signal Tower" },
    },
    {
      id: "poi_observatory",
      kind: "observatory",
      pos: { x: 3, y: 21 },
      label: { "zh-CN": "认知观测点", "en-US": "Cognition Observatory" },
    },
    {
      id: "poi_rocket",
      kind: "rocket",
      pos: { x: 37, y: 21 },
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
      once: false,
    },
    {
      id: "t_before_leave",
      on: "before-leave",
      guideLineKey: "world.q_luoci.guide.before-leave",
    },
  ],
};
