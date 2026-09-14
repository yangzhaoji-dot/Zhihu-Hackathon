## 能力

<!-- 一个完整的小能力；不要用“完成整个模块”作为范围。 -->

## Ownership

- [ ] internal
- [ ] interaction
- [ ] universe
- [ ] shared
- [ ] api

## 跨模块接口

<!-- 没有则写“无”。说明触及其他 ownership 的文件、原因和已同步的 owner。 -->

## 行为检查

- [ ] 没有重复定义共享 Opinion / Relation 类型
- [ ] 跨模块行为通过 typed data 或 semantic event 传递
- [ ] 保留 loading、error、fallback 与用户确认状态
- [ ] 手机与键盘用户有等价核心操作
- [ ] `bun run lint` 通过
- [ ] `bun run build` 通过
