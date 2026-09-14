# 三人协作规范 v1

## 一句话原则

> A 管“进入星球以后如何思考”，B 管“星球之间如何发生关系”，C 管“舞台如何呈现、如何被进入”。三方通过共享数据与语义事件协作，不直接侵入彼此模块。

## Ownership

| 角色 | 负责 | 目录 | 不直接修改 |
| --- | --- | --- | --- |
| A · Planet Internal | 来源阅读、文本划选、认知片段、AI synthesis、evaluation、Merge / Fork | `src/components/planet-internal/` | Galaxy 布局、星球拖拽、背景与导航 |
| B · Planet Interaction | Planet、hover/select/drag、Gravity、Collision、Bridge、Fusion、relation overlay | `src/components/planet-interaction/` | Opening、Home、全局背景、导航、星球内部流程 |
| C · Universe | Opening、Home、Galaxy Shell、背景、星云、转场、导航、通用控制、Responsive | `src/components/universe/` | Collision / Bridge / Fusion 逻辑和 relation 数据 |

旧目录 `components/world`、`components/cognitive-galaxy` 与 `components/cosmos` 逐步迁移，不做一次性大搬家。每次开发新能力时，把该能力收口到所属目录并从公开入口导出。

## 接口边界

共享模型的唯一来源：

- `src/lib/opinion/types.ts`
- `src/lib/cognitive-galaxy/model.ts`
- `src/lib/cognitive-galaxy/evolution.ts`

这些文件属于 `shared`。任何人都能提修改，但需要在 PR 中说明对 A/B/C 的影响。

B 对外只暴露语义状态：

```ts
type InteractionState = "idle" | "gravity" | "collision" | "fusion";
```

C 可以依据状态改变背景或全局光效，但 B 不进入 Universe 组件直接改星空。A 产生 Merge / Fork 结果后写入共享 graph，B 负责新节点在 Galaxy 中如何出现。

## 数据与交互优先级

```text
数据正确性 > 交互逻辑 > 视觉表现
```

- Gravity 只做低成本预览，不调用 AI、不修改 graph。
- Collision 只分析；先展示结果，不自动写 graph。
- Bridge / Fusion 必须由用户确认。
- Fusion 创建第三颗星球，两个父星球继续保留。
- fallback Collision 不得创建新星球。

## Git 流程

```text
main
└── web-redesign-v1
    ├── feat/planet-internal
    ├── feat/planet-interaction
    └── feat/universe-visual
```

- `main` 是稳定版本，不直接开发。
- `web-redesign-v1` 是三方集成分支。
- 个人分支只承载本人 ownership 内的改动。
- 每天开始前先更新集成分支，再把它合入个人分支：

```bash
git fetch origin
git switch web-redesign-v1
git pull origin web-redesign-v1
git switch feat/planet-interaction # 换成自己的分支
git merge web-redesign-v1
```

## Commit 与 PR

Commit 格式：

```text
类型(模块): 内容
```

模块只使用 `internal`、`interaction`、`universe`、`shared`、`api`。例如：

```text
feat(interaction): isolate planet gravity state
fix(internal): preserve excerpts after synthesis failure
style(universe): refine nebula background
```

一个完整的小能力对应一个 PR。不要把整个角色范围压成一个超大 PR。跨 ownership 的 PR 必须列出触及文件、接口原因和已同步的 owner。

## 每日同步

每人只需同步三件事：

1. 今天修改什么。
2. 需要别人提供什么接口。
3. 是否会触及别人的文件。

## 合并前检查

- 改动是否位于自己的 ownership。
- 是否复用了共享 `Opinion` / `Relation`，没有重复定义。
- 跨模块行为是否通过 typed data / event 传递。
- 是否保留用户确认、错误、loading、fallback 与可访问替代入口。
- `bun run lint` 与 `bun run build` 是否通过。
