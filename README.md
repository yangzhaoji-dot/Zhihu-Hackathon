# 知乎宇宙 / Cognitive Universe

> **让一个问题变成可以探索的认知空间。**

知乎宇宙是面向知乎黑客松构建的 AI-native 观点探索产品。

我们不把知乎回答简单总结成列表，而是把：

- **问题**组织成星系
- **思考方向**组织成星群
- **观点**组织成星球
- **真实回答片段**作为星球内部的认知材料

用户不只是“看观点”，而是可以进入一个观点、阅读相关原文、选择真正影响自己判断的文本，再让 AI 帮助这些材料形成新的观点。

新的观点和已有观点还可以继续发生关系：

- **Merge**：补充 / 修正原星球
- **Fork**：形成新的观点星球
- **Gravity**：拖动两颗星球靠近，感知潜在关系
- **Collision**：比较共识、分歧、条件和证据
- **Bridge**：保留两颗观点，建立补充 / 条件 / 对立 / 支持 / 反驳关系
- **Fusion**：在两个观点基础上形成第三颗星球

最终，这不是一张静态观点图，而是一片会随着用户继续思考而生长的认知宇宙。

---

## 当前产品版本

当前最新交互版本位于：

```bash
cognitive-orbit-v1
```

对应 PR：`#7 feat: 星球引力、碰撞、建桥与融合交互`

基础完整闭环位于 `cognitive-universe-v1` / PR #6。

完整产品设计：

> [`docs/cognitive-universe-v1.md`](./docs/cognitive-universe-v1.md)

星球之间交互设计：

> [`docs/planet-interaction-v1.md`](./docs/planet-interaction-v1.md)

---

## 当前核心流程

```text
世界观开场
  ↓
搜索 / 推荐问题
  ↓
问题星系
  ↓
选择思考方向
  ↓
具体观点星球
  ↓
登陆星球
  ↓
阅读来源文本
  ↓
划选并收集认知片段
  ↓
AI 形成新观点
  ↓
AI 独立评价
  ↓
Merge / Fork
  ↓
返回星系看到变化
  ↓
Gravity → Collision
  ↓
Bridge / Fusion
  ↓
认知宇宙继续生长
```

---

## 三层交互

### 1. 星系层：发现观点

用户先看到一个问题的整体认知结构，而不是直接进入长回答。

- 中央问题核心
- 多个思考方向 cluster
- 大量具体观点星球
- Semantic Zoom 逐级深入

Cluster 不是“支持 / 反对”阵营，而是不同的思考维度，例如身心、经济、职业、价值、环境、证据等。

### 2. 星球内部：形成 / 修正观点

进入一颗已有观点星球后：

1. 阅读与它相关的来源文本
2. 直接划选真正影响自己判断的一句 / 一段
3. 收集为自己的认知片段
4. AI **仅根据选中的文本**形成新观点
5. 独立 AI 再评估 grounding / coherence / specificity / boundary / novelty
6. 用户决定合并原星球还是生成新星球

AI 建议关系，但最终决定权属于用户。

### 3. 星球之间：感应 / 碰撞 / 建桥 / 融合

星球之间的互动不是装饰，而是认知图上的真实操作。

**Gravity**

在星群里直接拖动一颗观点星球。靠近另一颗时出现“认知引力”，但不会立刻修改数据，也不会偷偷调用 AI。

**Collision**

两颗星球真正接触并松手后，进入深分析：

- 共识
- 核心分歧
- 双方成立条件
- 证据差异
- 缺失信息
- 可能的综合观点

**Bridge**

如果两颗观点都值得保留，用户可以建立认知桥：

- 补充
- 条件
- 对立
- 支持
- 反驳

Bridge 不新增观点，只把关系写回星群。

**Fusion**

如果碰撞真正产生了一个独立的新判断，用户可以确认 Fusion，形成第三颗星球。原来的两个观点仍然保留，新星球记录两个 parent 和来源集合。

核心区别：

> **Bridge 表达关系，Fusion 表达新思想。**

拖动不是唯一入口。手机 / 键盘用户仍然可以使用列表中的「碰撞」按钮完成同样的核心流程。

---

## AI 的角色

AI 不是一个悬浮聊天框，而是整个系统背后的认知引擎：

- 构建问题的观点空间
- 把用户真正选中的材料凝结成观点
- 评价观点是否有材料支撑
- 分析观点之间的关系
- 帮助宇宙继续演化

核心原则：

> **AI 不替代知乎的人类内容，而是重新组织人类内容。**

同时，AI 不自动替用户修改宇宙：Collision 结果必须先展示，Merge / Fork / Bridge / Fusion 最终都由用户确认。

---

## 数据可信度原则

当前项目严格区分 Demo 与真实来源：

- Demo 内容明确标记为“演示材料”
- 不把演示作者 / 赞同数冒充真实知乎数据
- 真实检索模式才显示可追溯来源
- 用户提交给模型的 excerpt 必须是允许来源文本的真实子串
- AI 生成阶段看不到原星球观点，避免直接复述目标
- AI 生成阶段不使用赞同数作为输入
- AI 不可用时不伪造生成结果
- fallback Collision 不允许自动 Fusion 成新星球
- 不暴露或依赖模型私有 Chain-of-Thought

---

## 视觉方向

当前视觉原则：

> **深邃但不昏暗，空旷但不空洞，科幻但不赛博，丰富但不杂乱。**

技术路线保持 Web-native：

- 2D / 2.5D
- SVG / CSS / Canvas
- Semantic Zoom
- 星云 / 光场 / 粒子 / 视差
- 点击 / Hover / 拖动 / 滚动 / 文本选择

星球之间统一使用物理隐喻：

> **靠近 = 引力，接触 = 碰撞，连线 = 关系，生成第三颗星球 = 新观点。**

不做自由移动的 3D / 2.5D 游戏控制。

---

## 已实现能力

当前已经跑通：

- Opening / Home
- 搜索 / 推荐
- Question Galaxy
- Cluster Zoom
- Opinion Focus
- Planet Landing
- 来源文本阅读
- 文本划选 / 收集
- AI Viewpoint Synthesis
- AI Evaluation
- Merge / Fork
- 新星球回到星系并可再次登陆
- 直接拖动观点星球
- Gravity 引力反馈
- Planet Collision
- Semantic Bridge
- Persistent Relation Overlay
- Fusion
- Session Persistence
- Demo Reset
- Desktop / Mobile 基础适配

---

## 本地运行

推荐 Bun 版本见 `package.json`。

```bash
git fetch origin
git switch cognitive-orbit-v1
bun install --frozen-lockfile
bun dev
```

浏览器打开：

```text
http://localhost:3000
```

### 环境变量

复制：

```bash
cp .env.example .env
```

与当前认知宇宙主流程最相关的是：

- `EAZO_APP_ID`
- `EAZO_PRIVATE_KEY`
- `OPINION_AI_PROVIDER`
- `ZHIHU_ACCESS_SECRET`
- `ZHIHU_ZHIDA_MODEL`
- Eazo / BYOK AI 配置

完整变量说明见 [`.env.example`](./.env.example)。

---

## 验证

当前分支覆盖：

- 单元测试
- ESLint
- Next.js production build / TypeScript
- Chromium 主流程验收
- Merge / Fork
- Gravity / Collision / Bridge / Fusion
- Session 演化与 Demo Reset
- 手机端横向溢出检查

---

## 下一阶段

当前最值得继续做深的是 **Carry Fragment / 携带碎片**：

> 在星球 A 里读到的一段材料，可以被用户带到星球 B，让它参与 B 的观点形成，同时保持来源归属可追溯。

它会真正把“星球内部”和“星球之间”连接成同一个认知系统。

更远期还可以扩展：

- 云端持久化个人认知宇宙
- 多用户共同演化
- 观点匹配 / 社交
- 社会统计与阵营分布
- 跨问题星系跳转
- 三颗以上观点的 Constellation / 多观点合成
- 自部署模型后的 token-level / hidden-state 实验

---

## 核心表达

我们不想做：

> **“把知乎回答画成一堆星球。”**

我们真正想做的是：

> **知乎留下人类真实的思考素材；用户选择自己真正读进去的内容；AI 帮助这些材料凝结成新的观点；新的观点重新回到宇宙里，继续与其他思想发生关系。**

> **这个宇宙会随着人继续思考而生长。**
