# AGENTS 开发规范

本文档说明 `@jl-org/react-router` 的项目结构、路由缓存与 keep-alive 方案，供后续 AI / Agent 修改本包时优先参考

## 项目定位

`@jl-org/react-router` 是一个受 Vue Router 启发的 React 路由库，核心能力包括：

- Vue Router 风格的全局守卫：`beforeEach` / `beforeResolve` / `afterEach`
- Koa 风格路由中间件：`middlewares`
- 内置页面 keep-alive 缓存：`cache` / `cacheKey`
- Router 实例全局 API：`navigate` / `push` / `replace` / `clearCache` / `deleteCache`

修改前优先阅读：

- `package.json`：真实脚本、依赖与发布入口
- `README.md`：公开 API 与使用方式
- `src/router/types/index.ts`：外部类型契约
- `src/router/create-base-router.ts`：Router 实例与导航主流程
- `src/router/components/RootOutlet.tsx`：路由渲染与缓存挂载
- `src/router/renderer/cache.ts`：缓存 key、LRU map、缓存读写
- `src/router/renderer/cache-control.ts`：缓存清理控制器
- `src/router/components/KeepAlive/`：keep-alive 的 Suspense 实现

## 技术栈与命令

- 包管理：pnpm
- 语言：TypeScript + React
- 构建：Vite library mode + `vite-plugin-dts`
- 测试：Vitest + Testing Library + jsdom

常用命令：

```bash
pnpm test
pnpm build
pnpm lint
```

`pnpm build` 会输出到 `dist-lib/`，发布入口由 `package.json` 的 `main` / `module` / `types` / `exports` 指向 `dist-lib`

## 目录结构

| 路径 | 职责 |
|------|------|
| `src/router/create-browser-router.ts` | Browser history 适配入口 |
| `src/router/create-hash-router.ts` | Hash history 适配入口 |
| `src/router/create-base-router.ts` | 跨 history 模式的 Router 创建、导航、守卫、中间件调度 |
| `src/router/router.tsx` | `RouterProvider`，向 React context 注入 router / location / config |
| `src/router/types/index.ts` | 公开类型定义，所有新增外部 API 必须先更新这里 |
| `src/router/components/RootOutlet.tsx` | 根 Outlet，匹配路由、包布局、挂载 keep-alive 缓存 |
| `src/router/components/Outlet.tsx` | 嵌套路由出口 |
| `src/router/components/KeepAlive/` | keep-alive 基础组件与激活 / 失活 effect |
| `src/router/renderer/cache.ts` | `cacheKey` 计算、LRUCache 实例、缓存读写 |
| `src/router/renderer/cache-control.ts` | `clearCache` / `deleteCache` 事件控制 |
| `src/router/utils/` | 路径匹配、守卫管理、中间件 compose、URL 构造等纯逻辑 |
| `src/routes/` / `src/views/` | Demo 与测试用示例，不属于库核心发布 API |

## 导航流程

`create-base-router.ts` 是导航主流程，修改导航行为时优先从这里入手

当前流程：

1. 解析目标路径为 `LocationLike`
2. 匹配 route 与 middleware chain
3. 执行 `beforeEach`
4. 执行 route middlewares
5. 执行 `beforeResolve`
6. 更新 URL
7. `notify()` 通知 `RouterProvider` 更新 location
8. 执行 `afterEach`

注意：

- `afterEach` 在 URL / location 更新后执行，适合做页面缓存清理、标题同步、埋点等副作用
- `beforeEach` 中重定向会递归进入 `runNavigation`，不要在守卫里制造无限重定向
- `navigate(path, { replace })` 是低层 API；`push` / `replace` 是 Vue Router 风格封装，会合并 params / query

## 路由缓存与 keep-alive

页面缓存由 `options.cache` 开启：

```ts
createBrowserRouter({
  routes,
  options: {
    cache: {
      limit: 10,
      include: ['/cards'],
      exclude: ['/login'],
    },
    cacheKey: loc => loc.pathname,
  },
})
```

### 缓存 key

`cacheKey` 默认是 `loc.pathname`。如果页面内容与账号、租户、语言、实验配置等状态强相关，必须显式扩展 key，避免复用旧实例：

```ts
cacheKey: (loc) => {
  if (loc.pathname.startsWith('/cards'))
    return `${loc.pathname}:${authSessionId}`

  return loc.pathname
}
```

不要把所有页面都粗暴排除缓存。优先使用更细的 `cacheKey` 隔离实例，只有确实不适合 keep-alive 的页面才放进 `exclude`

### 缓存 map

`RootOutlet` 内部通过 `useCacheMap(effectiveLimit)` 持有 `LRUCache<string, CacheEntry>`

- `updateCache` 只在 key 不存在时写入元素，避免刷新同 key 页面时重建组件实例
- `getCachedElement` 命中缓存时更新 `lastShown` 和 `location`
- `LRUCache` 会在超过 `limit` 时淘汰最久未使用项

### KeepAlive 实现

`KeepAlive` 使用 Suspense 暂停非 active 页面：

- active 为 `true`：resolve 上一次 Promise，正常渲染 children
- active 为 `false`：throw Promise，让 Suspense fallback 为 `null`，组件实例仍保留
- `KeepAliveContext` 提供 active / deactive effect 注册能力

这意味着被缓存页面的 React 实例不会卸载。若页面内部使用 portal 挂到 `document.body`，离开页面后 portal 也可能继续存在。因此：

- 登录页、录音页、带不可关闭全局弹窗的页面优先加入 `cache.exclude`
- 切账号 / 退出登录后应清理对应缓存，而不是只隐藏 UI

## 缓存清理 API

Router 实例提供：

```ts
router.clearCache()
router.deleteCache('/cards')
router.deleteCache(/^\/cards/)
router.deleteCache(key => key.includes(':guest'))
```

实现链路：

- `create-base-router.ts` 创建 `createRouterCacheController()`
- Router 暴露 `clearCache` / `deleteCache` / `subscribeCache`
- `RootOutlet` 通过 `router.subscribeCache` 接收事件并修改内部 cache map

### 调用时机

如果清缓存后会立刻跳转，推荐在目标路由进入后清：

```ts
router.afterEach((ctx) => {
  if (ctx.to.pathname === '/login')
    router.clearCache()
})
```

不要在仍停留当前可缓存页面时同步清缓存后立刻 force render，否则当前页面可能在同一轮渲染中重新写回缓存

## 修改约束

- 新增公开 API 必须同步更新：
  - `src/router/types/index.ts`
  - `README.md`
  - 相关测试
- 缓存逻辑改动必须覆盖：
  - cache include / exclude
  - custom `cacheKey`
  - `clearCache` / `deleteCache`
  - LRU limit
- 不要让 `RootOutlet` 直接依赖业务状态。业务隔离应通过 `cacheKey` 或外部调用缓存 API 完成
- 不要把 demo (`src/routes` / `src/views`) 的约束误当成库核心约束
- 不要手动修改 `dist-lib/` 源码；需要发布或 link 到下游项目时运行 `pnpm build`

