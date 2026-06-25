# 更新日志

`@jl-org/react-router` 的所有重要变更都会记录在本文件

[中文 README](./README.md) | [English README](./README.en.md)

## [Unreleased]

keep-alive 引擎的一轮缺陷修复。无公共 API 变更，暂未发布到 npm

### 修复

- **清 / 删缓存不再白屏**：在当前页调用 `clearCache()` / `deleteCache()` 时，页面保持可见并原地重新挂载，不再消失到「切走再切回」才恢复
- **共享布局壳改用路由模式做缓存键**（启用缓存时），一并修复：
  - 静态与动态同级壳（如 `/settings` 与 `/:tab`）不再撞键、渲染错组件；
  - 带参数的壳（如 `/users/:id`）收敛为单实例（不再每个参数一份），并遵循 `include` / `exclude`；
  - 被缓存壳的 `params` / splat 随子路由切换刷新，不再过期；
  - 布局壳与叶子分开缓存，不再被无关叶子导航挤出 LRU
- **根级 404 不再泄漏**：无匹配时上一页不再隐藏在 `notFoundComponent` 之后继续跑副作用
- **`options.layouts` 全局布局单实例**：不再按缓存页数复制
- **壳内 `useLocation({ scope: 'cache' })`** 返回壳自身的路径前缀（如 `/users/1`），而非最深叶子路径
- **叶子组件内误用 `<Outlet />`** 渲染为空，不再无限递归（堆栈溢出 / 内存溢出）
- **KeepAlive 激活 / 失活注册表按 Provider 隔离**：不同 Outlet 层 / Router 的同名 key 不再串扰；失活回调在卸载时也会触发
- **运行时调小 `cache.limit`** 立即裁剪到新上限，不再每次导航才挤出一个

### 变更

- 内部：keep-alive 渲染器重构为逐层 `KeepAliveOutlet`（壳 / 叶子分治），取代 `RootOutlet` / `NestedOutlet`，无公共 API 变更
- `deleteCache(key)` 语义澄清：叶子按 `cacheKey`（默认 `pathname`）匹配，布局壳按结构化路由模式（如 `/users/:id`）匹配；跨参数 / 前缀删除请用 `RegExp` 或谓词函数

### 说明

- 被隐藏的 keep-alive 页面，其副作用（定时器、订阅）仍在运行——这是 Suspense 式 keep-alive 的固有取舍，已有回归测试固化该行为

## [0.1.1] - 2026-06-23

### 新增

- 新增 `router.subscribe(listener)`，可直接从 Router 实例订阅全局位置变化
- 新增带 `scope` 选项的 `useLocation(options)`：
  - `useLocation()` 与 `useLocation({ scope: 'current' })` 读取全局当前路由；
  - `useLocation({ scope: 'cache' })` 读取当前 keep-alive 缓存条目的位置
- 新增英文文档 `README.en.md`
- 新增本更新日志

### 变更

- `useLocation()` 默认跟随真实当前路由，即使在 keep-alive 缓存的路由树中调用也是如此
- 更新 README，阐明「当前路由位置」与「缓存条目位置」的区别

## [0.1.0]

### 新增

- 首个公开版本
- 新增 browser 与 hash 路由创建 API
- 新增 Vue Router 风格的全局守卫
- 新增 Koa 风格的路由中间件
- 新增全局布局（layouts）
- 新增内置 LRU keep-alive 页面缓存及缓存清理 API
