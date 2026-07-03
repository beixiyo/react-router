# 更新日志

`@jl-org/react-router` 的所有重要变更都会记录在本文件

[中文 README](./README.md) | [English README](./README.en.md)

## [Unreleased]

路由过渡动画系统与导航方向感知，及其一轮审查修复。含一处 Breaking（移除 `useNavigation`）

### 新增

- **路由过渡动画**：`RouterOptions.transition` + `useRouteTransition()`——`entering / entered / exiting / exited` 四阶段状态机，`finishEnter` / `finishExit` 手动确认或超时兜底；与 keep-alive 缓存完全独立（未缓存路由同样有退场窗口），默认遵循 `prefers-reduced-motion`，不配置则零行为差异
- **`useRouteTransitionBindings()`**：过渡消费的开箱即用封装——进场双帧节奏、子元素 `transitionend` / `animationend` 冒泡过滤、动画结束自动回调 finish 均收进库里，使用方 `{...bind}` 展开即完成接线、只写样式；JS 动画库场景仍可退回 `finishEnter` / `finishExit` 原语
- **路由级过渡粒度**：`RouteObject.transition`——与全局配置字段级合并（路由字段优先）、`false` 单独关闭该路由过渡、全局未配置时也可单路由开启；配置随缓存条目 / 退场槽位存储，退场中的页面用自己的配置播完动画
- **导航方向感知**：`Router.navigationDirection` 与 `RouteTransitionState.direction`（`forward / back / replace`）——基于 `history.state` 位点打点推导，浏览器原生前进 / 后退可感知；方向在 active 切换瞬间快照，动画中途不受后续导航影响
- `history.state` 上新增 `__routerPos` 位点键（公共暴露面），导出 `NAV_POSITION_KEY` / `RouterHistoryState` 供使用方合并保留

### 修复

- **位点随 URL 原子写入**（`URLAdapter` 增加 state 载荷）：修复 popstate 流程 / hash 回声用 `replaceState(null)` 抹掉位点、导致被 pop 过的条目再次往返时方向大面积退化为 `replace` 的缺陷（真实 Chromium 中 hash 模式后退 / 前进方向曾整体失效）
- **transition 开启后根层 404 空白**：`notFoundComponent` 此前没有任何渲染路径，现经 bypass 槽位渲染
- **中间件 `next(path)` 字符串重定向**：重定向即接管本次导航（短路外层），URL 不再被覆写回原目标、方向不再被外层覆盖
- **重定向位点账本**：push 中被守卫重定向按实际历史操作递增位点（方向仍记 `replace`）；popstate 源被重定向时位点同步到浏览器恢复的条目——两者均避免相邻同位点条目把真实后退误判为回声
- **挂载即失活的 KeepAlive** 不再假走退场窗口、误触发 `onExited`
- PageTransition 参考实现：缓存页复活首帧不再闪现终态（`useLayoutEffect` 复位）；子元素 `transitionend` 冒泡不再误触发 `finishExit` / `finishEnter`

### 性能（memo / 引用稳定性专项）

- **RouterCtx 直接下发稳定实例**：`useRouter` / `useNavigate` / `Link` 消费者不再随导航全量重渲染（此前每次导航 spread 出新对象，还把 location / navigationDirection 的活 getter 冻成快照）；`NavLink` 激活态改由 `useLocation` 响应式驱动。**语义变化**：`useRouter()` 不再随导航重渲染，读 `.location` 值新鲜但非响应式，响应式请用 `useLocation()`
- **`useNavigate` 返回引用恒定**（useCallback），可安全放入 deps / memo 组件 props
- **缓存条目 location 引用稳定化**：值比较后才换引用，活跃子树的 LocationCtx 不再被值相等的新对象击穿（此前每渲染 spread 新对象 → 子树所有 useLocation/useParams 消费者每渲染重跑 + 订阅退订重订）
- **query-only 导航不再重建元素树**：`liveElement` 依赖移除 search/hash（元素创建链路不消费它们，查询参数经 useLocation 订阅送达）
- 路由级 transition 合并结果锚定引用；`useLocation` 订阅只建一次；默认 cacheKey / 空 params / 空 candidates 提为模块级稳定常量

### 变更

- **Breaking**：移除 `useNavigation`——RouterProvider 旧架构残留的平行导航实现，绕过守卫 / 方向位点体系且无消费者；请使用 `useRouter()` / `useNavigate()`
- 过渡 / 方向类型迁移至类型层（`types/transition.ts`），包入口导出不变；核心与 utils 不再反向依赖组件目录
- Router 实例构造改用属性描述符合并，`location` / `navigationDirection` 为活 getter，新增动态字段无需在 notify 中手动同步

## [0.1.3] - 2026-06-26

新增 keep-alive 可见性感知 effect。公共 API 变更（新增一个导出）

### 新增

- **`useRouteKeepAliveEffect(effect)`**：keep-alive 缓存页的可见性感知 effect（`useEffect` 的缓存版）——页面**激活**（首次可见，或被缓存隐藏后切回）时执行 `effect`，**失活（被缓存隐藏）或卸载**时执行其返回的 cleanup。解决「缓存页用普通 `useEffect` 时，cleanup 只在真卸载触发、隐藏时不触发」导致的副作用 / 当前页信号残留；自动经 context 解析所属缓存单元（无需手动传 `uniqueKey`），内部用 ref 始终调用最新闭包，并覆盖「晚于初次激活才挂载的后代」（挂载即补激活，幂等去重）。`KeepAlive` 组件本身由路由内部使用，不对外导出

## [0.1.2] - 2026-06-26

keep-alive 引擎的一轮缺陷修复。无公共 API 变更

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
