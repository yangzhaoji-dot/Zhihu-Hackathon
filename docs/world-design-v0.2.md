# OpinionSpace 世界与引导角色设计 v0.2

> 状态：实现就绪版（implementation-ready）。
> 本文在 v0.1（产品与视觉方向提案）基础上，补充数据模型、API 契约、系统规格、内容剧本与任务拆分，目标是**任何一名工程师拿到即可开工**。
> 基线：当前 `main` 分支（Next.js 16 App Router + React 19 + Bun + Three.js + Drizzle 就绪；观点域为内存 store；AI 经 Eazo 托管 `appAi`）。
> v0.1 的方向与章节全部保留；本文与之冲突处以本文为准，并在 §2 说明修正理由。

---

## 1. 现状对齐（v0.2 调研结果）

下表是 v0.1 设计对照当前代码的真实差距，后续所有规格都建立在这张表上。

| 模块 | 现状 | 与 v0.1 的差距 |
| --- | --- | --- |
| 3D 双层宇宙 | ✅ 已实现。`cosmos-app.tsx`：`questions`（问题星系，WebGL 不可用时降级 2D）→ `views`（单问题观点宇宙） | 无 |
| 火箭过渡 | ✅ 已实现。`focusStage: orbit → launching → surface`，发射前把 `OpinionWorldEntry` 写入 sessionStorage，随后 `router.push('/world/[opinionId]')` | 飞行途中无"认知预告"内容（材料范围/分歧类型/世界名），见 §5.7 |
| 二维世界 | ⚠️ `/world/[opinionId]` 已有 v1 骨架：CSS 渐变场景 + WASD/方向键移动 + E 交互 + 5 个固定热点（guide / archive / barren / crossroads / rocket） | 世界是"一个观点一个场景"的装饰页，不是 v0.1 的"一个议题一个可探索世界"；无区域、无碰撞、无状态 |
| 世界主题 | ⚠️ `world-theme.ts`：5 主题（crossroads/archive/theater/forest/machine）色板 + 关键词正则推导 + hash 兜底 | 需升级为显式 `WorldConfig` 数据；正则推导降级为兜底 |
| NPC | ⚠️ 3 张 NPC 立绘 + 1 张引导狐狸立绘（`/worlds/crossroads/*.png`）；台词为静态 i18n 模板 | 无 NPC 数据模型、无观点绑定、无动态对话 |
| 观点比较 | ⚠️ 宇宙层已有 collision 面板：`/api/opinion/collide`（AI 分析）→ `/api/opinion/fuse`（融合落地） | 世界内没有比较环节；比较结果不改变场景 |
| 判断 / 立场 | ⚠️ `/api/opinion/stance` 可用，但立场存于 `store.ts` 内存 `Map`，**刷新即失** | 无持久化、无"认知坐标 / 观测站"概念 |
| 持久化 | ⚠️ Drizzle + PostgreSQL 管线就绪（`db:generate/migrate/push` 脚本齐全），但目前只有模板自带的 `users` 表 | 观点域零落库 |
| 议题种子 | ⚠️ 仅「年轻人该不该裸辞？」（`q_luoci`：8 观点 / 3 阵营（止损派、稳健派、维权派）/ 10 来源 / 9 作者 / 6 探索者）；另有搜索框走知乎直答实时构建（`q_live_*`） | 无 v0.1 §9 的「大学生 AI 学编程」议题种子 |

**关键结论**：世界页不是空白，已有"主题推导 + 会话传递 + 热点 + 可走动"骨架可直接复用。最大的四个空缺是：① 世界/NPC 的配置化数据模型；② NPC 动态对话；③ 世界内的比较与判断环节；④ 用户状态（立场/判断/进度）的数据库持久化。

---

## 2. 关键设计决策（v0.1 未定事项，本文定稿）

| # | 决策 | 理由 |
| --- | --- | --- |
| D1 | **世界粒度 = 一个问题一个世界**。`/world/[opinionId]` 路由保留不动，进入后由 `opinionId → opinion.questionId` 推导世界；`opinionId` 只决定落点区域（spawn override） | 对齐 v0.1 §1"问题决定星球"；避免为每个观点生成一张地图的产能爆炸；兼容现有路由与火箭过渡 |
| D2 | **世界配置 = 显式数据 `WorldConfig`**（§3.1），不再依赖关键词正则。`world-theme.ts` 保留为新议题的默认推断器与未配置议题的兜底 | 场景必须"对应认知变化"（v0.1 §4），只有显式数据才能承载区域/桥梁/迷雾语义 |
| D3 | **NPC 即观点**：每个 NPC 绑定一个 `opinionId`（human 观点）；AI 推演观点以"半透明未完成 NPC"呈现（复用 `Opinion.kind` 与预留的 `nodeType`） | v0.1 §4"单个观点由 NPC 承载"的直接落地 |
| D4 | **对话 = 模板优先、AI 增强**：每条对话必须有可独立工作的静态模板（fallback）；AI 走 `appAi` 并返回受控 JSON；**来源展示永不依赖 AI**（直接读 `OpinionSource`） | 防止 AI 虚构来源；与现有 `source:"ai"|"fallback"` 降级策略一致 |
| D5 | **世界内比较 = 收集–碰撞**：NPC 对话后可"收下观点卡"进入背包；选两张卡调现有 `/api/opinion/collide`；结果按规则驱动场景变化（桥/裂缝/迷雾），可选 `fuse` 落地 | 复用已稳定的签名交互，零新 AI 逻辑 |
| D6 | **判断 = 观测站**：用户在世界内放置"观测站"（一条 judgement 记录：自由陈述 + 阵营倾向快照 + 世界内认知坐标），落库持久化；返回宇宙时星球轨道显示观测站标记 | v0.1 §2 阶段 7 的具体形态 |
| D7 | **持久化两步走**：第一步只落 3 张用户状态表（stances / judgements / exploration_progress），`store.ts` 接口签名不变、内部换实现；观点图数据（opinions/sources）维持内存 + 种子，接知乎管线是赛事后事项 | Drizzle 管线已就绪，小步快跑；不阻塞世界开发 |
| D8 | **首个验证议题双轨**：机制灰盒用现有「裸辞」种子（零成本，§6.1）；最终演示内容用新建「大学生 AI 学编程」种子（§6.2 给出完整种子规格） | v0.1 §9 的议题更贴题，但现有种子能让灰盒验证提前 1–2 周开始 |

---

## 3. 数据模型扩展（可直接编码）

### 3.1 世界配置 `WorldConfig`

新文件 `src/lib/opinion/world-config.ts`；类型并入 `src/lib/opinion/types.ts`（保持"types.ts 是唯一真源"的约定）。

```ts
export type WorldType = "crossroads" | "archive" | "theater" | "forest" | "machine";

/** 一个议题 = 一个世界配置 */
export interface WorldConfig {
  questionId: string;
  worldType: WorldType;
  name: string;                       // 世界名，如「分岔之城 · 裸辞」
  tileset: string;                    // 素材包标识，灰盒期用 "graybox"
  size: { w: number; h: number };     // 网格单位（1 格 = 48px，见 §7.1）
  spawn: { x: number; y: number };    // 默认落点
  zones: Zone[];                      // 区域（观点群 = 城区）
  npcs: NpcConfig[];                  // NPC（单个观点的承载者）
  pois: Poi[];                        // 兴趣点：桥/门/迷雾/纪念碑/观测点/火箭坪
  triggers: WorldTrigger[];           // 环境叙事触发器（看山台词钩子）
}

export interface Zone {
  id: string;
  rect: { x: number; y: number; w: number; h: number };
  camp?: string;                      // 绑定观点阵营：止损派/稳健派/维权派…
  terrain: "plaza" | "road" | "fog" | "ruin" | "monument" | "bridge" | "station";
  label: { "zh-CN": string; "en-US": string };   // 名称由界面动态渲染，不写进图片
  stateKey?: string;                  // 动态状态键（见 §3.4），静态区域省略
}

export interface NpcConfig {
  id: string;
  opinionId: string;                  // 该 NPC 承载的观点（对应 types.ts Opinion.id）
  zoneId: string;
  pos: { x: number; y: number };
  sprite: string;                     // 立绘路径，如 /worlds/crossroads/npc-archivist-v1.png
  role: string;                       // 世界内身份：车站管理员/档案管理员…
  dialogueId: string;                 // 对话脚本 id（§3.2）
  translucent?: boolean;              // true = AI 推演观点，半透明未完成材质
}

export interface Poi {
  id: string;
  kind: "bridge" | "gate" | "fog" | "monument" | "observatory" | "rocket" | "chest";
  pos: { x: number; y: number };
  /** 成立条件 = 通行条件：需先发现某些来源 / 完成某些动作才开放 */
  requires?: { sourceIds?: string[]; comparedPair?: [string, string]; stanceCount?: number };
  stateKey?: string;
  label?: { "zh-CN": string; "en-US": string };
}

export interface WorldTrigger {
  id: string;
  on: "first-land" | "enter-zone" | "npc-done" | "compare-done" | "judgement-done" | "before-leave";
  zoneId?: string;                    // on=enter-zone 时必填
  guideLineKey: string;               // 看山台词：i18n 键或 AI 提示模板 id（§5.6）
  once?: boolean;                     // true = 触发一次后写入 progress.firedTriggerIds
}
```

配置存放：每议题一个文件 `src/lib/opinion/worlds/<questionId>.ts`，导出 `WorldConfig`；`world-config.ts` 提供 `getWorldConfig(questionId): WorldConfig | null`（未配置时返回 `null`，前端回退到现行主题推导 + 通用布局，保证 `q_live_*` 动态议题永远可玩）。

### 3.2 对话脚本 `DialogueScript`

新目录 `src/lib/opinion/dialogue/`。

```ts
export interface DialogueScript {
  id: string;                         // 与 NpcConfig.dialogueId 对应
  npcId: string;
  lines: DialogueLine[];              // 静态模板，fallback 必用、AI 不可用时的完整体验
  aiPromptId?: string;                // AI 增强提示词 id（§5.6），无 AI 时整段忽略
}

export interface DialogueLine {
  speaker: "npc" | "guide" | "player";
  /** 支持插值：{title} {summary} {excerpt} {condition} {upvotes} {author} */
  text: string;
  actions?: DialogueAction[];
}

export type DialogueAction =
  | { type: "show-source"; sourceId: string }       // 弹出原文卡（直接读 OpinionSource，不经 AI）
  | { type: "collect-opinion"; opinionId: string }  // 收下观点卡进背包
  | { type: "open-compare" }                        // 打开比较面板
  | { type: "open-stance"; opinionId: string };     // 对该观点标记态度
```

### 3.3 持久化 schema（Drizzle）

新文件：`src/lib/db/schema/stances.ts`、`judgements.ts`、`exploration-progress.ts`，在 `src/lib/db/schema/index.ts` re-export。`userId` 一律存"登录用户 id 或匿名 `x-viewer-id`"（沿用 `viewer.ts` 的解析逻辑，匿名可体验）。

```ts
// stances —— 替换 store.ts 内存 Map，setStance/getStances/getStanceProfile 签名不变
export const stances = pgTable("stances", {
  userId: text("user_id").notNull(),
  opinionId: text("opinion_id").notNull(),      // 含 o_live_* 动态观点
  stance: text("stance", { enum: ["agree", "disagree", "neutral"] }).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [primaryKey({ columns: [t.userId, t.opinionId] })]);

// judgements —— 判断记录 / 认知坐标（D6 观测站）
export const judgements = pgTable("judgements", {
  id: text("id").primaryKey(),                  // j_<nanoid>
  userId: text("user_id").notNull(),
  questionId: text("question_id").notNull(),
  statement: text("statement").notNull(),       // 用户当前看法（≤140 字）
  leaning: text("leaning"),                     // 阵营倾向快照，如「止损派」
  agreeIds: text("agree_ids").array().notNull().default([]),
  disagreeIds: text("disagree_ids").array().notNull().default([]),
  x: real("x").notNull(), y: real("y").notNull(),  // 认知坐标（世界内归一化 0–1）
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// exploration_progress —— 探索进度 + 世界动态状态
export const explorationProgress = pgTable("exploration_progress", {
  userId: text("user_id").notNull(),
  questionId: text("question_id").notNull(),
  visitedNpcIds: text("visited_npc_ids").array().notNull().default([]),
  collectedOpinionIds: text("collected_opinion_ids").array().notNull().default([]),
  foundSourceIds: text("found_source_ids").array().notNull().default([]),
  firedTriggerIds: text("fired_trigger_ids").array().notNull().default([]),
  worldState: jsonb("world_state").notNull().default({}),  // 见 §3.4
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [primaryKey({ columns: [t.userId, t.questionId] })]);
```

迁移命令沿用现有脚本：`bun run db:generate && bun run db:migrate`。匿名用户数据保留即可，不做清理（量级小）；登录后是否合并匿名进度：MVP 不合并，仅按当前身份读取（赛后事项，见 §11）。

### 3.4 世界动态状态 `WorldState`

`exploration_progress.worldState` 的键值约定（全部可选，缺省即初始态）：

| 键 | 类型 | 含义 | 写入时机 |
| --- | --- | --- | --- |
| `bridge:<opinionA>:<opinionB>` | `"built"` | 两观点间出现桥梁（发现共同前提） | 比较结果显示存在共识且用户完成该组比较 |
| `fog:<zoneId>` | `"lifted"` | 区域迷雾消散 | 该区域内所有 NPC 的来源都被查看过 |
| `ruin:<zoneId>` | `"visited"` | 停工建筑已被调查 | 进入区域并触发看山解释 |
| `observatory` | `{ judgementId }` | 观测站已放置 | 保存 judgement 成功 |

渲染规则：Zone/Poi 的 `stateKey` 指向上述键；`WorldState` 变化只改变表现层（桥可通行/迷雾透明度），**不改变 WorldConfig 本身**。

---

## 4. API 契约增补

沿用 `docs/opinion-api.md` 的全部约定（同源 `/api/opinion` 前缀、`{ok:true,...}` / `{ok:false,error}` 包裹、`x-eazo-session` / `x-viewer-id` 身份、AI 端点带 `source:"ai"|"fallback"`、额度耗尽返回 HTTP 402 `{"code":"app_ai_unavailable"}`）。本节只列**新增端点**与**已有端点的新用法**。

### 4.1 GET `/api/opinion/world/config?questionId=<id>`

取世界配置 + 与图谱联动后的运行时视图。

**响应**

```json
{
  "ok": true,
  "world": {
    "config": "WorldConfig（§3.1 原样下发）",
    "npcs": [
      {
        "id": "npc_stoploss",
        "opinion": "Opinion（含 title/summary/camp/support/kind）",
        "sourceCount": 2,
        "pos": { "x": 12, "y": 8 },
        "sprite": "/worlds/crossroads/npc-archivist-v1.png",
        "role": "车站管理员",
        "translucent": false
      }
    ],
    "zones": [ { "id": "z_stoploss", "camp": "止损派", "opinionCount": 3, "terrain": "plaza", "label": { "zh-CN": "止损区", "en-US": "Stop-loss Quarter" } } ],
    "unconfigured": false
  }
}
```

- 未配置议题（含 `q_live_*`）：`unconfigured: true`，`config` 为按 `world-theme.ts` 推导主题生成的**通用布局**（服务端按 graph 的 camp 聚类自动摆放 NPC），保证任何议题都能降落。
- 错误：`404 opinion_space_not_found`。

### 4.2 POST `/api/opinion/world/dialogue` · AI

NPC / 看山动态对话。**契约红线：AI 只允许改写表达，不允许新增事实；来源卡永远由前端按 `sourceId` 直接渲染。**

**请求**

```json
{
  "npcId": "npc_stoploss",
  "trigger": "talk",
  "locale": "zh-CN",
  "history": [ { "speaker": "player", "text": "为什么这里这么荒凉？" } ]
}
```

**响应**

```json
{
  "ok": true,
  "reply": {
    "lines": [
      { "speaker": "npc", "text": "……", "actions": [ { "type": "show-source", "sourceId": "s_01" } ] }
    ],
    "source": "ai"
  }
}
```

- 服务端 prompt 注入：该 NPC 的 Opinion 全文（title/summary/claim/reason/conditions）、其 `OpinionSource.excerpt`、当前 `WorldState` 摘要；要求模型输出**严格 JSON**（`{lines:[...]}`），且 `actions` 中只允许引用注入过的 `sourceId`。
- 解析失败 / 模型不可用：整段回退到该 NPC 的静态 `DialogueScript`（§3.2），`source:"fallback"`。前端无需区分两者之外的状态。
- `trigger` 取值：`talk`（玩家主动对话）| `guide-*`（看山触发器，值为 §3.1 `WorldTrigger.on`）。
- 错误：`400 invalid_input`；`404 npc_not_found`；`402 app_ai_unavailable`（兜底存在，正常不会到达前端）。

### 4.3 POST `/api/opinion/judgement` · GET `/api/opinion/judgement?questionId=<id>`

保存 / 读取"观测站"判断（D6）。

**POST 请求**

```json
{ "questionId": "q_luoci", "statement": "先存够 6 个月现金流再考虑裸辞", "x": 0.62, "y": 0.41 }
```

- 服务端从 stance 表计算 `leaning / agreeIds / disagreeIds` 快照一并写入（§3.3），客户端无需传。
- **响应**：`{ "ok": true, "judgement": Judgement }`；同用户同问题重复保存 = 新增一条记录（历史即认知轨迹，前端只展示最新一条 + 计数）。
- **GET 响应**：`{ "ok": true, "judgements": [Judgement, ...] }`（按时间倒序）。
- 错误：`400 invalid_input`（statement 为空或 >140 字、坐标越界）。

### 4.4 POST `/api/opinion/world/progress` · GET `/api/opinion/world/progress?questionId=<id>`

探索进度与 `WorldState` 读写。POST 为**增量合并**语义：

```json
{
  "questionId": "q_luoci",
  "addVisitedNpc": ["npc_stoploss"],
  "addCollectedOpinion": ["o_stoploss"],
  "addFoundSource": ["s_01"],
  "addFiredTrigger": ["t_first_land"],
  "setWorldState": { "bridge:o_stoploss:o_cashflow": "built" }
}
```

- 响应均为合并后的完整 `progress` 对象。未登录匿名身份同样可用（`x-viewer-id`）。
- 前端写入时机：NPC 对话完成、收下观点卡、查看来源、触发器触发、比较完成、judgement 保存成功。

### 4.5 已有端点的新用法（不改动契约）

| 端点 | 世界内新用法 |
| --- | --- |
| `POST /collide` | 世界内比较面板（§5.4）；请求不变，结果同时驱动 `WorldState` |
| `POST /fuse` | 融合观点落地为世界内半透明 NPC：请求体 `x/y` 改用世界内归一化坐标，落点由玩家在当前场景点选 |
| `GET /opinions/{id}/source` | NPC 对话中的"看看原文"动作；`related` 字段用于对话尾部推荐"附近的不同声音" |
| `GET /stance` · `POST /stance` | 对话后可对当前观点标记态度；实现改为读写 stances 表（D7），前端零感知 |
| `GET /gaps` | 迷雾区看山台词与"盲区清单"面板的数据源 |
| `GET /navigate` | 看山"推荐探索路径"功能（火箭降落前预告 + 世界内随时可问） |

---

## 5. 世界内系统规格

### 5.1 运行时状态机（改造 `src/app/world/[opinionId]/page.tsx`）

```
loading → landing（降落下落动画，≤1.2s，可跳过）
        → explore（自由移动）
            ⇄ dialogue（NPC/看山对话，锁定移动）
            ⇄ compare（比较面板，锁定移动）
            ⇄ judgement（观测站面板，锁定移动）
        → leaving（火箭返回动画）→ router.back() 回宇宙
```

加载顺序（`explore` 进入前必须完成 1–3，4 可异步）：

1. 读 sessionStorage `OpinionWorldEntry`（现有 `world-session.ts`），缺失则按 `opinionId` 回退 `fetchSourceTrace`；
2. `GET /world/config?questionId=`；
3. `GET /world/progress?questionId=`；
4. 预取 `GET /gaps`（迷雾区台词用，失败静默）。

### 5.2 移动、碰撞与交互

- 网格：1 格 = 48px（§7.1）；世界坐标 = 网格坐标，渲染时 ×48 缩放。
- 碰撞：Zone `terrain: "road"/"plaza"/"bridge"` 可行走；其余默认阻挡；Poi `requires` 未满足时阻挡并弹出条件提示（"需要先看 2 份原文"）。
- 输入：WASD / 方向键移动；E / 空格与 1.5 格内最近可交互对象交互；Esc 关闭任何面板。
- 移动端：MVP 只做"点按目的地寻路（直线 + 阻挡绕行即可）+ 点按 NPC 对话"，虚拟摇杆列入 §11 延后项。
- 相机：跟随玩家，边缘 20% 死区；世界小于视口时居中不滚动。

### 5.3 观点卡背包

- 入口：屏幕右下常驻背包按钮，显示已收集数。
- 卡片字段：`title` / `camp` / `support` / 来源数 / `kind`（AI 观点卡带半透明描边）。
- 操作：单卡可"查看原文"（跳 source 面板）；勾选两张卡出现"碰撞比较"按钮（§5.4）。
- 数据：`progress.collectedOpinionIds` 持久化，重进世界不丢。

### 5.4 世界内比较流程

1. 背包选 2 卡 → `POST /collide`（现有契约）；
2. 结果面板四段式：共识 / 核心分歧 / 各自成立条件 / 证据缺口（`missing` 渲染为"待调查"标签，点击写入玩家备注，仅本地）；
3. **场景反馈规则**（渲染层根据结果 + `WorldState` 执行）：

| 比较结果 | 场景变化 |
| --- | --- |
| `consensus` 非空（存在共同前提） | 两观点所属区域间生成/点亮桥梁（写 `bridge:<a>:<b>="built"`） |
| `coreDisagreement` 指向目标不同 | 两区域各延伸出一条方向相反的道路贴图 |
| `missing` 非空 | 在两区域之间放置迷雾带（新 Poi `kind:"fog"`） |
| `evidence.verdict` 一方明显不足 | 较弱方区域出现"停工建筑"贴图（`terrain:"ruin"`） |

4. 面板底部"融合为新观点"按钮 → `POST /fuse`（`x/y` = 玩家点选的世界内坐标）→ 生成半透明 NPC 站立该处（`translucent: true`），可继续对话。

### 5.5 判断与观测站

- 入口：① 看山触发器 `judgement-done` 前的引导对话；② 屏幕右上"建立观测站"常驻按钮。
- 面板字段：`statement` 一句话输入（≤140 字）+ 当前 stance 画像摘要（自动拉 `GET /stance`）+ 世界内点选坐标（默认玩家当前位置）。
- 成功后：该坐标生成 `kind:"observatory"` Poi + 旗帜动画；写 `worldState.observatory`。
- 返回宇宙时（leaving）：宇宙层在该星球轨道上渲染观测站微标记；星球简介卡新增"我的判断"一行（读 `GET /judgement` 最新一条）。

### 5.6 引导角色（看山）对话系统

- 触发点与 §3.1 `WorldTrigger.on` 一一对应；`once:true` 的触发器触发后写入 `progress.firedTriggerIds`，重进不重复。
- **对话四步结构**（v0.1 §7 落地为硬约束，AI prompt 与静态模板都必须遵守）：① 呼应玩家观察 → ② 给出当前材料中的可验证事实（必须带数字，如"18 条回答里只有 1 位提到"）→ ③ 区分事实 / 系统解释 / 未知 → ④ 给出可选行动（看原文 / 继续探索 / 标记待调查 / 前往他处）。
- AI 增强（`POST /world/dialogue`，`trigger="guide-*"`）：prompt 注入议题标题、graph 统计（观点数/阵营/来源数）、当前 `WorldState`、玩家进度；输出同样走严格 JSON + 静态模板兜底。
- 文案红线：环境隐喻不得直接当事实（v0.1 §7）；每条解释台词必须同时包含观察、证据范围、不确定性三要素；对话短而可跳过（单次 ≤4 行，任意键快进）。
- 形象：IP 授权确认前一律使用非品牌化"白色狐狸导航员"占位（v0.1 §5 IP 边界）；现有 `guide-fox-v1.png` 继续作为占位立绘，文件名与 i18n 键不含"刘看山"字样。

### 5.7 火箭飞行预告（补齐 v0.1 §2 的"认知预告"）

`launching` 阶段（宇宙层现有动画期间）叠加信息条，数据来自已加载的 graph + `world/config` 预取：

- 本次纳入材料：N 条回答 / M 位答主；
- 主要分歧：阵营列表（camp + 观点数）；
- 目的地：世界名 + 世界类型；
- 尚未确认：`gaps` 预取结果的前 2 条（失败则显示通用文案）。

全部为纯前端拼装，无新端点。

---

## 6. 分岔之城 MVP 落地剧本

### 6.1 灰盒版：「年轻人该不该裸辞？」（复用现有种子，零内容成本）

世界尺寸 40×24 格。区域与 NPC 绑定（观点 id 均为现有种子数据）：

| 区域 / POI | 位置（格） | 绑定 | terrain / kind |
| --- | --- | --- | --- |
| 止损区（plaza） | x2–12, y2–10 | camp=止损派 | plaza |
| 稳健区（plaza） | x28–38, y2–10 | camp=稳健派 | plaza |
| 维权区（plaza） | x14–26, y14–22 | camp=维权派 | plaza |
| 中央车站（出生点旁） | x18–22, y10–14 | — | station |
| 条件桥 A | x12–14, y5–7 | requires: 比较 o_stoploss×o_cashflow | bridge |
| 条件桥 B | x26–28, y16–18 | requires: 比较 o_legal×o_inner | bridge |
| 长期效果迷雾带 | x14–26, y11–13 | stateKey `fog:z_mist` | fog |
| 高赞纪念碑 | x19–21, y2–4 | 展示 support 最高观点（o_stoploss, 86） | monument |
| 观测点 | x2–4, y20–22 | 观测站放置推荐位 | observatory |
| 火箭坪 | x36–39, y20–23 | 返回宇宙 | rocket |

NPC 布置（立绘灰盒期复用现有 4 张 PNG + 纯色块占位）：

| NPC | 绑定观点 | 区域 | 角色 |
| --- | --- | --- | --- |
| npc_stoploss | o_stoploss（止损派, 86） | 止损区 | 车站管理员 |
| npc_cashflow | o_cashflow（稳健派, 79） | 稳健区 | 账房先生 |
| npc_inwork | o_inwork（稳健派, 64） | 稳健区 | 在职工匠 |
| npc_transform | o_transform（止损派, 58） | 止损区 | 转行车票贩 |
| npc_legal | o_legal（维权派, 52） | 维权区 | 仲裁书记员 |
| npc_inner | o_inner（维权派, 47） | 维权区 | 心理咨询摊主 |
| npc_window | o_window（止损派, 41） | 迷雾带边缘 | 雾中旅人 |
| npc_threshold | o_threshold（AI 融合, 60） | 中央车站 | 半透明售票员（translucent） |

### 6.2 终验版：「大学生应该尽早使用 AI 学习编程，还是先独立掌握基础？」

新建种子 `q_ai_coding`，结构完全仿照现有 `seed.ts` / `seed-sources.ts`（8 观点 / 3 阵营 / ≥10 来源 / 每条来源含知乎风格化名、摘录、赞同数、证据）。内容规格：

| 观点 id | 阵营 | title（陈述方向） | support | 来源数 |
| --- | --- | --- | --- | --- |
| o_speed | 自动工坊派 | AI 让项目从 idea 到上线的速度量级提升，早用早建立作品感 | 82 | 2 |
| o_real | 自动工坊派 | 职场真实开发已离不开 AI，学校教育应提前对齐 | 74 | 2 |
| o_prompt | 自动工坊派 | 提问与拆解能力本身就是新的基本功，只能在用 AI 中习得 | 61 | 1 |
| o_foundation | 基础训练区派 | 不理解原理时无法判断 AI 输出的对错，先打基础 | 88 | 2 |
| o_debug | 基础训练区派 | 调试与读源码能力必须独立训练，AI 代劳会造成能力空洞 | 70 | 1 |
| o_interview | 基础训练区派 | 面试与考试场景不允许 AI，独立能力是硬门槛 | 55 | 1 |
| o_stage | 阶段条件派 | 低年级独立打基础、高年级 AI 做项目，按阶段切换 | 77 | 2 |
| o_teacher | 阶段条件派 | 关键变量是有没有会审阅 AI 产出的导师，而非用不用 | 48 | 1 |

关系（≥12 条）：o_stage `cond` o_speed / o_stage `cond` o_foundation / o_debug `refute` o_speed / o_foundation `oppose` o_real / o_prompt `add` o_speed / o_teacher `cond` o_stage / o_interview `support` o_foundation / o_real `refute` o_interview / o_debug `add` o_foundation / o_stage `support` o_prompt / o_speed `oppose` o_foundation / o_teacher `refute` o_speed。

世界分区（v0.1 §9 原样落地）：自动工坊（x2–12, y2–10）/ 基础训练区（x28–38, y2–10）/ 阶段派"条件桥工坊"（x14–26, y14–22）/ 条件桥（o_stage 解锁后点亮）/ 长期效果迷雾区（"AI 时代基础教育长期影响"写入 gaps）/ 机会市场（中央 plaza，看山驻点）。

### 6.3 对话脚本示例（静态模板，可直接抄进 `dialogue/` 文件）

**示例 1：NPC 对话（npc_foundation，基础训练区）**

```
[npc]  我在这教了六年 C 语言。{excerpt}
[npc]  AI 写的代码能跑，但学生说不出为什么能跑——这就是我坚持先打基础的原因。
[action] show-source: s_foundation_01
[guide] 这个观点成立的前提是：你能接触到需要理解原理的场景，比如面试和调试。
[action] collect-opinion: o_foundation
[action] open-stance: o_foundation
```

**示例 2：看山环境叙事（enter-zone: z_fog，once）**

```
[guide] 前面是长期效果迷雾区。
[guide] 目前我们纳入的 {answerCount} 条讨论里，几乎没有毕业五年后的追踪证据。
[guide] 这不代表这里没有答案，只代表现有材料还照不到那里。
[guide] 要去看看持相反观点的人怎么说，还是先在这里立个「待调查」标记？
```

**示例 3：比较结果（o_speed × o_foundation → collide 返回后）**

```
[guide] 他们都同意一件事：{consensus}
[guide] 分歧不在「要不要用 AI」，而在{coreDisagreement}。
[guide] 看，两个区域之间亮起了桥——他们其实共享同一个前提。
[系统] bridge:o_speed:o_foundation = built（写入 progress）
```

### 6.4 环境隐喻 → 数据驱动规则（v0.1 §7 的落地映射）

| 场景现象 | 判定规则（数据源） |
| --- | --- |
| 荒凉地区 | 区域内观点 `support` 均值 < 50 或来源总数 ≤1 |
| 拥挤市场 | 区域内 ≥3 观点且 excerpt 相似理由聚类（MVP 用手工配置标记，不做实时聚类） |
| 浓雾区域 | `GET /gaps` 返回的盲区主题映射到指定 Zone |
| 断裂桥梁 | 存在 `oppose` 关系且 collide 结果 `consensus` 为空 |
| 两条反向道路 | collide 结果 `coreDisagreement` 含目标差异（由配置手工指定 MVP） |
| 停工建筑 | 观点有结论但 `evidence` 为空或 `sourceIds` 为空 |
| 废弃车站 | 观点 `conditions` 中含时间/环境前提（配置标记） |
| 巨大纪念碑 | 全图 `support` 最高观点 |
| 地下通道 | collide 发现隐藏共同前提后生成 |
| 无人房屋 | gaps 返回"缺失人群"类盲区 |

> 原则（继承 v0.1）：隐喻只表达"当前纳入材料的覆盖状态"，看山台词必须同时给出观察、证据范围与不确定性。

---

## 7. 美术生产流水线

### 7.1 规格

- 基准网格 **48×48px**（v0.1 的 32/48 二选一定稿为 48，匹配现有立绘精度）；角色高度 2 格，NPC 立绘出图 512×512 起、游戏内缩放显示。
- 地图 = 结构化对象（Zone/Poi/碰撞矩形）+ 地表贴图平铺，**禁止整图生成当地图**；场景名称与中文标注一律界面动态渲染。
- 灰盒阶段：Zone 用纯色半透明矩形 + 现有 5 张立绘（guide-fox / npc-archivist / npc-field-observer / npc-crossroads-traveler / player-explorer）；正式素材按区域逐个替换。

### 7.2 素材清单与命名

路径规范：`public/worlds/<worldType>/<role>-v<n>.png`（同时导出 `.webp` 压缩版，参考现有 `cosmos/nebula.*` 双格式做法）。

| 素材 | 世界 | 优先级 | 状态 |
| --- | --- | --- | --- |
| 引导导航员（白色狐狸占位） | 通用 | P0 | ✅ 已有（guide-fox-v1） |
| 玩家探索者 | 通用 | P0 | ✅ 已有（player-explorer-v1） |
| 分岔之城地表 tileset（路/广场/桥/雾/废墟/纪念碑） | crossroads | P0 | ⬜ 待制作 |
| NPC×8（§6.2 各角色） | crossroads | P1 | 灰盒用占位 |
| 观测站 / 火箭坪 / 条件桥单体 | crossroads | P1 | ⬜ |
| 失落档案馆 tileset（小型版） | archive | P2 | ⬜ |
| 其余三世界入口预览图 | theater/forest/machine | P2 | ⬜ |

### 7.3 许可登记

每个入库素材在 `public/worlds/ASSETS.md` 登记：文件名 / 来源（自研 / 生成模型 / 第三方链接）/ 许可证 / 可否随公开仓库再分发。AI 生成素材标注生成工具与日期；第三方素材无明确许可一律不入库（沿用 v0.1 §6 原则）。

---

## 8. 声音触发点事件表

首版只做 P0 反馈音效，背景音乐后置（v0.1 §8）。事件由渲染层统一发 `window.dispatchEvent(new CustomEvent('sfx', {detail}))`，音频模块订阅，便于后接。

| 事件名 | 触发时机 | 优先级 |
| --- | --- | --- |
| `sfx.rocket.launch` / `sfx.rocket.land` | 火箭发射 / 降落 | P0（已有动画点，直接挂） |
| `sfx.guide.appear` | 看山触发器触发 | P0 |
| `sfx.source.found` | 打开来源卡 | P0 |
| `sfx.relation.discover` | 桥梁/道路因比较而生成 | P0 |
| `sfx.blocked` | 被迷雾/条件桥阻挡 | P0 |
| `sfx.observatory.place` | 观测站放置成功 | P0 |
| `sfx.npc.talk` | 打开 NPC 对话 | P1 |
| `bgm.world.crossroads` | 分岔之城环境循环 | P2（后置） |

---

## 9. 开发任务拆分（里程碑制，可直接派工）

> 估时按 1 名全栈工程师计；M0→M2 串行，M3 与 M5 内容线可并行。

### M0 持久化基建（约 1 天）

| 任务 | 改动文件 | 验收 |
| --- | --- | --- |
| 建 stances / judgements / exploration_progress 三表 + 迁移 | `src/lib/db/schema/*.ts`、`src/lib/db/queries/*.ts` | `db:generate` 通过，迁移后表存在 |
| `store.ts` 的 stance 读写切换为数据库实现（**导出签名不变**） | `src/lib/opinion/store.ts` | 标记立场后重启 dev server，立场仍在 |
| `viewer.ts` 匿名/登录身份解析复用到新端点（不改逻辑，只确认导出可用） | — | 匿名请求带 `x-viewer-id` 可读写 |

### M1 世界配置层（约 2 天）

| 任务 | 改动文件 | 验收 |
| --- | --- | --- |
| 落地 §3.1 全部类型 + `getWorldConfig()` | `src/lib/opinion/types.ts`、`world-config.ts` | 类型通过 `tsc`；未配置议题返回 `null` |
| 编写裸辞灰盒配置（§6.1 全表） | `src/lib/opinion/worlds/q_luoci.ts` | 单元测试：每个 NPC 的 opinionId 都能在种子 graph 中找到 |
| 新增 `GET /api/opinion/world/config`（含未配置议题的通用布局生成） | `src/app/api/opinion/world/config/route.ts` | 配置议题返回完整 npcs/zones；`q_live_*` 返回 `unconfigured:true` 且可渲染 |

### M2 世界运行时（约 3 天）

| 任务 | 改动文件 | 验收 |
| --- | --- | --- |
| 按 §5.1 状态机重写世界页；按 questionId 推导世界、opinionId 决定落点 | `src/app/world/[opinionId]/page.tsx` | 从宇宙层降落到任意观点，进入同一问题的同一世界、落点不同 |
| 区域渲染（灰盒色块 + label 动态渲染）+ AABB 碰撞 + 条件阻挡提示 | 新组件 `src/components/world/*` | 迷雾/桥未解锁时阻挡并显示条件 |
| NPC 热点化：从 WorldConfig 生成可交互 NPC（替换现有 5 个写死热点） | 同上 | 8 个 NPC 可交互，半透明 NPC 渲染正确 |
| 对话 UI 容器（对话框 + 来源卡 + 动作按钮） | 同上 + 复用 `source-card.tsx` | 静态模板对话完整播放，来源卡可打开 |

### M3 对话与比较（约 3 天，可与 M5 并行）

| 任务 | 改动文件 | 验收 |
| --- | --- | --- |
| 编写裸辞议题全部静态 DialogueScript（§6.3 格式，每 NPC ≥4 行） | `src/lib/opinion/dialogue/q_luoci/*.ts` | 断网/无 AI 时全部对话完整可用 |
| `POST /api/opinion/world/dialogue`（AI + 严格 JSON 校验 + 模板兜底） | `src/app/api/opinion/world/dialogue/route.ts`、prompt 入 `src/lib/opinion/ai.ts` | AI 返回非法 JSON 时无感回退模板；actions 中的 sourceId 必为已注入来源 |
| 观点卡背包（§5.3） | `src/components/world/backpack.tsx` | 收集/查看/双选可用，刷新不丢 |
| 世界内比较面板 + 场景反馈规则（§5.4） | 复用 `collision-view.tsx` 改造 | 完成一次比较后桥出现且重进仍在 |

### M4 判断与进度（约 2 天）

| 任务 | 改动文件 | 验收 |
| --- | --- | --- |
| judgement / progress 两端点（§4.3、§4.4） | `src/app/api/opinion/judgement/route.ts`、`world/progress/route.ts` | 增量合并语义正确；匿名可用 |
| 观测站面板 + 世界内旗帜 Poi + 宇宙层星球标记（§5.5） | `src/components/world/observatory.tsx`、`cosmos-app.tsx` | 保存判断→回宇宙可见标记→再降落可见观测站 |
| 看山触发器系统（§5.6，含 once 语义） | `src/components/world/guide.tsx` | 7 类触发点全部可触发，once 不重复 |
| 火箭飞行预告信息条（§5.7） | `cosmos-app.tsx` | launching 阶段展示材料数/阵营/世界名/gaps |

### M5 内容终验（约 3 天，可与 M3 并行）

| 任务 | 改动文件 | 验收 |
| --- | --- | --- |
| 「AI 学编程」种子（§6.2 全表：8 观点/≥10 来源/≥12 关系） | `src/lib/opinion/seed.ts`、`seed-sources.ts` | 宇宙层可选该星球，graph 端点返回完整数据 |
| 该议题 WorldConfig + 全部对话脚本 | `worlds/q_ai_coding.ts`、`dialogue/q_ai_coding/*` | 同 M1/M3 验收 |
| 分岔之城正式地表 tileset 接入（灰盒色块替换） | `public/worlds/crossroads/`、`ASSETS.md` | 许可登记齐全；地图仍为结构化对象 |
| 看山全部触发点文案终稿 + 声音 P0 六项 | i18n locales、`src/lib/audio/*` | 走查表（§10）全过 |

---

## 10. 验收清单

**核心验收（继承 v0.1 §10，可测试化）**：邀请 3 名未看过设计文档的用户完成一次「AI 学编程」世界探索，每人必须做到——

1. 说出至少一处此前未意识到的分歧或成立条件；
2. 从该分歧出发，≤3 次点击定位到支撑它的知乎原文摘录；
3. 建立一个观测站并说出自己的判断与理由。

**工程验收清单**：

- [ ] 未登录匿名用户完整走通：降落 → 对话 → 收集 → 比较 → 判断 → 返回宇宙
- [ ] AI 不可用（mock 402 / 非法 JSON）时全链路无报错，体验仅"降级"不"中断"
- [ ] WebGL 不可用时宇宙层 2D 降级，世界入口仍可达
- [ ] 所有用户状态（立场/背包/进度/判断）刷新与重进后保留
- [ ] `q_live_*` 动态议题可降落到通用布局世界
- [ ] 场景名称、对话文案全部走 i18n，图片内无写死文字
- [ ] 素材许可登记完整；无"刘看山"品牌素材入库

---

## 11. 风险与开放问题

| 项 | 说明 | 处置 |
| --- | --- | --- |
| 刘看山 IP 授权 | v0.1 §5 已列 4 个待确认问题 | 授权确认前全量使用"白色狐狸导航员"占位；i18n 键与文件名不含品牌词，未来替换零迁移成本 |
| AI 虚构来源 | 对话 AI 可能编造不存在的引文 | D4 红线：来源卡只按 sourceId 渲染；AI 输出白名单校验 sourceId；越界即整段回退模板 |
| 内存 → 数据库迁移窗口 | 若赛事期间部署到多实例，内存 store 的观点数据会不一致 | 用户状态三表已落库不受影响；观点图在单实例 demo 下安全；多实例部署前须把 opinions/sources 落库（接口已预留，见 opinion-api.md §3） |
| 匿名进度合并 | 匿名 → 登录后进度不合并 | MVP 接受；赛后设计合并策略 |
| 移动端体验 | 虚拟摇杆未做 | MVP 点按交互；摇杆列入赛后 |
| 多世界串联 | v0.1 §3 的世界间入口 | 明确不做，仅保留 WorldConfig 扩展字段空间 |
| 实时议题（知乎直答）的世界质量 | 通用布局缺少手工配置的环境叙事 | 保证"可玩"即可；环境隐喻规则（§6.4）中能自动计算的（纪念碑/荒凉）自动生效，其余静默省略 |
