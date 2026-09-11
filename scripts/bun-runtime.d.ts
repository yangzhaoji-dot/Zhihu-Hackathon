// 项目未安装 bun-types（既有基线中 bun:test 同样无类型报错）。
// 这里为脚本用到的 Bun 运行时插件 API 提供最小类型声明，
// 保持 tsc --noEmit 不因脚本新增错误。本文件必须是全局脚本（不得有顶层
// import/export），否则 declare module 会被当作模块增强而报错。

declare module "bun" {
  interface BunPluginBuilder {
    module(
      specifier: string,
      factory: () => { exports: Record<string, never>; loader: string },
    ): void;
  }
  export function plugin(config: {
    name: string;
    setup(build: BunPluginBuilder): void;
  }): void;
}
