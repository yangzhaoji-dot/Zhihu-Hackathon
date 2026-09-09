# OpinionSpace 后端 API 契约

> 观点空间（OpinionSpace）后端接口文档 · v1
> 面向前端对接与后续接入知乎真实数据源。当前实现以服务端内置种子数据 +
> 内存存储承载，接口形态保持稳定，可平滑替换为数据库 / 知乎数据管线。

约定：

- Base URL：与应用同源，前缀 `/api/opinion`。
- 编码：请求与响应均为 `application/json; charset=utf-8`。
- 鉴权：读接口公开；涉及个人数据的接口（立场）用 Eazo 会话头
  `x-eazo-session`；未登录时以设备匿名头 `x-viewer-id` 兜底，保证未登录也能体验。
- AI 接口：`collide` / `search` / `gaps` / `navigate` 由 App AI（DeepSeek-V3.1，
  经 Eazo 托管）驱动；每个响应都带 `source` 字段（`"ai"` 实时推演 / `"fallback"`
  离线兜底），AI 不可用时自动降级，保证 Demo 始终可用。
- 统一响应包裹：成功 `{"ok": true, ...}`，失败 `{"ok": false, "error": "<code>"}`；
  AI 额度耗尽等场景返回 HTTP 402，body 含 `{"code":"app_ai_unavailable"}`。

---

## 1. 数据模型

### Author 答主

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 答主唯一 id |
| `name` | string | 昵称，如 `@林小满` |
| `title` | string | 身份，如 `产品经理 · 6 年` |
| `credibility` | number | 0–100，来源可信度（编辑态） |

### OpinionSource 来源（真人回答）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 来源 id |
| `authorId` | string | 关联 `Author.id` |
| `excerpt` | string | 知乎原文摘录（可回溯） |
| `upvotes` | number | 赞同数 |
| `url` | string | 指向知乎原回答的深链 |
| `evidence` | string[]? | 该回答引用的证据 / 数据 |

### Opinion 观点节点

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 观点 id |
| `questionId` | string | 所属问题 id |
| `title` | string | 节点上显示的观点陈述 |
| `summary` | string | 一句话展开 |
| `kind` | `"human"` \| `"ai"` | 真人观点 / AI 推演观点（前端据此区分材质与标签） |
| `support` | number | 0–100 支持度，驱动节点体积 + 碰撞物理 |
| `x` `y` | number | 归一化 0–1 布局坐标 |
| `sourceIds` | string[] | 支撑该观点的来源 id（AI 观点通常为空） |
| `camp` | string? | 立场阵营标签，如 `止损派` |
| `derivedFrom` | string[]? | AI 观点：父观点 id 列表 |

### Relation 观点关系

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `from` `to` | string | 关系两端观点 id（有向） |
| `type` | `support`\|`refute`\|`add`\|`cond`\|`oppose` | 支持 / 反驳 / 补充 / 条件限定 / 对立分歧 |

### Question 问题节点（第一层）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 问题 id |
| `title` | string | 问题标题 |
| `x` `y` | number | 归一化布局坐标 |
| `core` | boolean? | 是否当前焦点问题 |
| `kind` | `related`\|`sub`\|`prerequisite`\|`extension`\|`temporal` | 相关/子/前置/延伸/同源议题 |
| `era` | string? | 同源议题的时间维度，如 `2019` |
| `answerCount` | number? | 回答数（展示用） |

### Stance 个人立场

`"agree" | "disagree" | "neutral"`（认同 / 反对 / 中立）。

---

## 2. 端点

### 2.1 GET `/api/opinion/questions`

第一层：以焦点问题为核心的全局问题关联网络。

**响应**

```json
{
  "ok": true,
  "network": {
    "coreQuestionId": "q_luoci",
    "questions": [ Question, ... ],
    "relations": [
      { "from": "q_luoci", "to": "q_gap", "type": "add", "label": "子问题" }
    ]
  }
}
```

### 2.2 GET `/api/opinion/graph?questionId=<id>`

第二层：某个问题的观点空间图（观点 + 关系 + 答主 + 来源）。

**查询参数**：`questionId`（缺省 `q_luoci`）。

**响应**

```json
{
  "ok": true,
  "graph": {
    "questionId": "q_luoci",
    "questionTitle": "年轻人该不该裸辞？",
    "opinions": [ Opinion, ... ],
    "relations": [ Relation, ... ],
    "authors": [ Author, ... ],
    "sources": [ OpinionSource, ... ]
  }
}
```

**错误**：`404 {"ok":false,"error":"opinion_space_not_found"}`。

### 2.3 GET `/api/opinion/opinions/{id}/source`

来源回溯：把一个观点回溯到支撑它的真人回答、答主、原文、证据，并联动其关联观点。

**响应**

```json
{
  "ok": true,
  "opinion": Opinion,
  "sources": [ OpinionSource, ... ],
  "authors": [ Author, ... ],
  "related": [
    { "type": "oppose", "opinion": Opinion },
    { "type": "refute", "opinion": Opinion }
  ]
}
```

**错误**：`404 {"ok":false,"error":"opinion_not_found"}`。

### 2.4 GET `/api/opinion/stance` · POST `/api/opinion/stance`

个人立场标记与「观点画像」。按已登录用户 id 或匿名 `x-viewer-id` 归属。

**GET 响应 / POST 响应**（均返回最新画像）

```json
{
  "ok": true,
  "profile": {
    "stances": { "o_stoploss": "agree" },
    "agree": ["o_stoploss"],
    "disagree": [],
    "neutral": [],
    "leaning": "止损派"
  }
}
```

**POST 请求**

```json
{ "opinionId": "o_stoploss", "stance": "agree" }
```

**请求头**：`x-viewer-id: <设备匿名 id>`（未登录时）；登录态自动读 `x-eazo-session`。

**错误**：`400 invalid_input`（缺少 opinionId 或 stance 非法）、`404 opinion_not_found`。

### 2.5 POST `/api/opinion/collide` · AI

★签名交互。分析两个观点碰撞后的关系，输出结构化推演结论。

**请求**

```json
{ "aId": "o_stoploss", "bId": "o_cashflow" }
```

**响应**

```json
{
  "ok": true,
  "analysis": {
    "consensus": "共识 / 共同点",
    "coreDisagreement": "核心分歧",
    "conditions": { "a": "A 成立条件", "b": "B 成立条件" },
    "evidence": { "a": "A 证据类型与充分度", "b": "…", "verdict": "谁更充分及原因" },
    "missing": ["缺失信息1", "缺失信息2"],
    "candidate": { "title": "融合后的 AI 候选观点", "summary": "一句话说明" },
    "source": "ai"
  }
}
```

**错误**：`400 invalid_input`（缺 id 或两 id 相同）；`402 {"code":"app_ai_unavailable"}`
（额度耗尽，前端统一 toast）。注：内部已带离线兜底，正常情况下即使模型不可用也会返回
`source:"fallback"` 的结果。

### 2.6 POST `/api/opinion/fuse`

融合：将碰撞面板上的候选观点落地为一个新的 AI 观点节点，并连线指向两个父观点。

**请求**

```json
{
  "parentA": "o_stoploss",
  "parentB": "o_cashflow",
  "title": "先设退出阈值，再决定是否裸辞",
  "summary": "把健康风险、现金储备与就业周期合成一个可行动阈值。",
  "x": 0.5,
  "y": 0.3
}
```

**响应**：`{ "ok": true, "opinion": Opinion }`（`kind:"ai"`，含 `derivedFrom`）。

**错误**：`400 invalid_input`。

### 2.7 POST `/api/opinion/search` · AI

语义化观点搜索：搜的是「一个想法/观点/疑问」而非关键词，直达最相关节点。

**请求**：`{ "query": "先给自己定一个能不能走的标准" }`

**响应**

```json
{
  "ok": true,
  "result": {
    "opinionId": "o_threshold",
    "reason": "为什么最相关（一句话）",
    "rankedIds": ["o_threshold", "o_cashflow", "..."],
    "source": "ai"
  }
}
```

**错误**：`400 empty_query`。兜底为关键词相近度匹配（`source:"fallback"`）。

### 2.8 GET `/api/opinion/gaps` · AI

盲区挖掘：识别当前讨论中缺失的视角 / 证据 / 场景。

**响应**：`{ "ok": true, "gaps": ["盲区1", "盲区2", ...], "source": "ai" }`

### 2.9 GET `/api/opinion/navigate` · AI

Agent 导航：推荐一条最省力看清争议结构的探索路径。

**响应**

```json
{ "ok": true, "path": ["o_cashflow", "o_stoploss", "o_threshold"], "rationale": "…", "source": "ai" }
```

---

## 3. 服务端架构与可扩展性

```
src/lib/opinion/
  types.ts          领域类型（唯一真源，前后端共享）
  seed-sources.ts   种子：答主 + 来源（真人回答摘录）
  seed.ts           种子：观点 / 关系 / 问题网络
  store.ts          数据存取层（内存 + 立场按 viewer 归属 + 融合节点持久化）
  viewer.ts         viewer 身份解析（登录 user 或匿名 x-viewer-id）
  ai-client.ts      App AI 调用与 JSON 解析（server-only）
  ai.ts             碰撞/盲区/搜索/导航的 AI 逻辑 + 离线兜底
src/app/api/opinion/*  Route Handlers（仅做：解析→鉴权→调用服务→返回）
```

**接入知乎真实数据源**：`store.ts` 是唯一的数据出入口，接口签名（`getOpinionGraph`
/ `getSourcesForOpinion` / `getQuestionNetwork` 等）保持不变即可把内存实现替换为：

1. 知乎问题/回答/评论抓取 → 观点萃取与去重（可复用 `ai.ts` 的 App AI 调用）；
2. 关系判定（支持/反驳/补充/条件/对立）落库；
3. 用 Eazo 托管数据库（Drizzle + PostgreSQL）替换内存 Map，立场表按 `userId` 隔离。

前端只依赖本契约中的 HTTP 形态，数据源替换对前端零感知。

**AI 模型**：文本能力 = Eazo 托管 DeepSeek-V3.1，经服务端 `appAi.chat()` 调用，
私钥 `EAZO_PRIVATE_KEY` 只在服务端使用，绝不下发浏览器。



