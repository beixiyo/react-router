<div align="center">
  <img alt="npm-version" src="https://img.shields.io/npm/v/@jl-org/react-router?color=red&logo=npm" />
  <img alt="npm-download" src="https://img.shields.io/npm/dm/@jl-org/react-router?logo=npm" />
  <img alt="License" src="https://img.shields.io/npm/l/@jl-org/react-router?color=blue" />
  <img alt="typescript" src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" />
  <img alt="github" src="https://img.shields.io/badge/GitHub-181717?logo=github&logoColor=white" />
</div>

<br />

# @jl-org/react-router

受 Vue Router 启发的 React 路由库。Vue Router 风格守卫、Koa 风格中间件、内置 LRU 缓存，Router 实例即全局 API

[English](./README.en.md) | [更新日志](./CHANGELOG.md)

[Code Demo](./src/App.tsx)

## ✨ 特性

| 特性 | @jl-org/react-router | React Router | TanStack Router |
|------|----------------------|--------------|-----------------|
| 全局守卫 `beforeEach`/`beforeResolve`/`afterEach` | ✅ Vue Router 风格全局 API | ⚠️ 无同名 API，可用 route middleware / loader 生命周期承接 | ⚠️ `route.beforeLoad` 路由 / 子树级 |
| Koa 风格中间件 | ✅ route `middlewares`，`(ctx, next)` | ✅ `middleware` / `clientMiddleware` | ⚠️ `beforeLoad` + loader 生命周期 |
| 内置组件 keep-alive / LRU 页面缓存 | ✅ 组件实例级 LRU keep-alive | ❌ 无内置组件 keep-alive | ⚠️ 有 loader / SWR 数据缓存，非组件 keep-alive |
| 全局布局 `layouts` | ✅ 集中配置 pathname 匹配规则 | ⚠️ 嵌套路由 / layout route | ⚠️ layout / pathless layout route |
| 路由过渡动画 + 前进/后退方向感知 | ✅ headless 四阶段 + `direction`，浏览器前进/后退可感知 | ⚠️ View Transitions API（无栈方向语义） | ⚠️ 需自行接动画库 |

## 📦 安装

```bash
pnpm i @jl-org/react-router
# or npm i @jl-org/react-router
# or yarn add @jl-org/react-router
```

## 🚀 快速开始

```tsx
import { lazy } from 'react'
import { RouterProvider, Outlet, createBrowserRouter } from '@jl-org/react-router'

const router = createBrowserRouter({
  routes: [
    { path: '/', component: lazy(() => import('./views/home')) },
    {
      path: '/dashboard',
      component: lazy(() => import('./views/dashboard')),
      meta: { title: 'Dashboard', requiresAuth: true },
      middlewares: [
        async (ctx, next) => {
          if (ctx.meta?.requiresAuth && !getUser()) { ctx.redirect('/login'); return }
          await next()
        },
      ],
    },
  ],
  options: {
    cache: { limit: 5, exclude: ['/login'] },
    beforeEach: async (to, _from, next) => next(),
    afterEach: (to) => { document.title = to.meta?.title ?? 'App' },
  },
})

export function App() {
  return <RouterProvider router={router}><Outlet /></RouterProvider>
}

// Router 实例即全局 API
router.navigate('/dashboard')
router.replace('/login')
```

## ⚙️ 配置

```ts
createBrowserRouter({
  routes: RouteObject[],
  options: {
    base?: string,
    cache?: boolean | {
      limit?: number,                    // @default 10
      include?: (string | RegExp)[],     // 不传则缓存所有路径，传空数组则不缓存
      exclude?: (string | RegExp)[],     // 优先于 include，命中则不缓存
    },
    cacheKey?: (loc: LocationLike) => string,
    loadingComponent?: ReactElement | ComponentType,
    notFoundComponent?: ReactElement | ComponentType,
    layouts?: LayoutConfig[],            // 全局布局
    transition?: {                       // 路由过渡动画，不传则完全不启用（零行为差异）
      enterTimeout?: number,             // 进场兜底超时（毫秒）@default 500
      exitTimeout?: number,              // 退场兜底超时（毫秒）@default 500
      respectReducedMotion?: boolean,    // 遵循 prefers-reduced-motion @default true
    },
    beforeEach?: NavigationGuard,
    beforeResolve?: NavigationGuard,
    afterEach?: AfterEachGuard,
  },
})
```

### 页面缓存控制

`cache` 开启后，命中的页面会以 keep-alive 形式保留组件状态。需要在退出登录、切换租户、切换账号等场景释放缓存时，可以直接调用 Router 实例方法：

```ts
// 清空所有 keep-alive 页面缓存
router.clearCache()

// 只删除某个缓存 key
router.deleteCache('/cards')

// 按正则或函数删除一组缓存 key
router.deleteCache(/^\/cards/)
router.deleteCache(key => key.includes(':guest'))
```

如果清缓存后会立刻跳转，推荐在目标路由进入后再清，避免当前可缓存页面在同一次 render 中重新写回缓存：

```ts
router.afterEach((ctx) => {
  if (ctx.to.pathname === '/login')
    router.clearCache()
})
```

### RouteObject 常用字段

| 字段 | 说明 |
|------|------|
| `path` | 路径 |
| `component` | 组件或 `lazy()` |
| `children` | 嵌套路由 |
| `meta` | 自定义信息 |
| `middlewares` | Koa 风格 `(ctx, next)` |
| `loadingComponent` | 懒加载占位，优先于全局 |
| `layoutComponent` | 路由级布局（包裹当前路由） |
| `transition` | 路由级过渡：与全局字段级合并（路由优先）；`false` 单独关闭 |

### 全局布局 `layouts`

按 pathname 匹配，第一个命中的布局包裹渲染结果。`exclude` 优先；`include` 为空则匹配全部

```tsx
const router = createBrowserRouter({
  routes: [...],
  options: {
    layouts: [
      {
        component: MainLayout,    // 接收 children 的布局组件
        include: ['/dashboard', '/users'],
        exclude: ['/login'],
      },
      {
        component: AdminLayout,
        include: ['/admin'],
      },
    ],
  },
})
```

| 字段 | 说明 |
|------|------|
| `component` | 布局组件，`({ children }) => ReactNode` |
| `include` | 命中任一则使用；空则匹配全部 |
| `exclude` | 命中任一则跳过此布局 |

### 404

```tsx
options: {
  notFoundComponent: () => <div>页面不存在</div>,
}
```

## 🎬 路由过渡动画

headless 设计：库只提供**阶段状态机与方向信号**，不绑定任何动画库——用纯 CSS、motion/react 或其它方案消费均可。与 keep-alive 缓存完全独立，未缓存的路由同样有退场窗口

```ts
// 全局开启
options: {
  transition: { enterTimeout: 350, exitTimeout: 350 },
}

// 路由级粒度：与全局字段级合并（路由字段优先），就近生效
routes: [
  { path: '/heavy', component: Heavy, transition: { exitTimeout: 800 } }, // 覆盖退场超时
  { path: '/instant', component: Instant, transition: false },           // 单独关闭过渡
  { path: '/only-me', component: OnlyMe, transition: { enterTimeout: 350 } }, // 全局未配置时也可单路由开启
]
```

开启后路由切换不再立即生效，而是经过可控的过渡窗口。**退场中的页面用自己的配置播完动画**，不受目标路由配置影响。页面内用 `useRouteTransition()` 读取状态：

| 字段 | 说明 |
|------|------|
| `phase` | `entering` 进场中 → `entered` 稳定展示 → `exiting` 退场中 → `exited` 退场完成 |
| `direction` | 本次切换的导航方向：`forward`（push / 浏览器前进）、`back`（浏览器后退 / `navigate(-1)`）、`replace`（显式 replace / 守卫重定向） |
| `finishEnter()` | 手动确认进场动画结束；不调用则由 `enterTimeout` 兜底 |
| `finishExit()` | 手动确认退场动画结束；不调用则由 `exitTimeout` 兜底 |

`direction` 在切换瞬间快照，动画播放中途不受后续导航影响；基于 `history.state` 位点推导，**浏览器原生前进 / 后退按钮同样可感知**

### 完整示例：方向感知的滑动过渡

用 `useRouteTransitionBindings()`——它把消费过渡的三个易错细节收进了库里（进场双帧节奏、子元素 `transitionend` 冒泡过滤、动画结束自动回调 finish），**你只写样式**，把 `bind` 展开到做动画的元素上即可：

```tsx
import { useRouteTransitionBindings } from '@jl-org/react-router'

const DURATION = 300 // 必须小于 enterTimeout / exitTimeout，否则动画被兜底腰斩

export function PageTransition({ children }: { children: React.ReactNode }) {
  const { isEntering, isExiting, direction, bind } = useRouteTransitionBindings()

  /** forward / back 走横向滑动；replace 无栈方向语义，退化为竖直淡入淡出 */
  const axis = direction === 'replace'
    ? 'Y'
    : 'X'
  const enterOffset = direction === 'back'
    ? -12
    : 12

  return (
    <div
      style={{
        transition: `all ${DURATION}ms ease-out`,
        opacity: isExiting || isEntering
          ? 0
          : 1,
        transform: isExiting
          ? `translate${axis}(${-enterOffset}px)`
          : isEntering
            ? `translate${axis}(${enterOffset}px)`
            : `translate${axis}(0)`,
      }}
      {...bind}
    >
      { children }
    </div>
  )
}
```

`bind` 同时监听 `transitionend` 与 `animationend`，CSS animation 写法同样免接线

### 接入 motion/react 等 JS 动画库

JS 动画库不经过 DOM 过渡事件，不需要 `bind`——用 `phase` / `direction` 驱动 `animate`，在动画完成回调里调用 `finishExit` / `finishEnter` 原语通知路由：

```tsx
import { useRouteTransition } from '@jl-org/react-router'
import { motion } from 'motion/react'

export function MotionPageTransition({ children }: { children: React.ReactNode }) {
  const transition = useRouteTransition()

  /** 未开启过渡（全局未配或路由级 false）：正常渲染即可 */
  if (!transition)
    return <>{ children }</>

  const { phase, direction } = transition
  const isExiting = phase === 'exiting'
  // forward 从右进左出、back 相反；replace 走竖直。x / y 恒同时给出，避免残留上一轴旧值
  const enter = direction === 'back'
    ? -24
    : 24
  const offset = (v: number) => (direction === 'replace'
    ? { x: 0, y: v }
    : { x: v, y: 0 })

  return (
    <motion.div
      initial={phase === 'entering'
        ? { opacity: 0, ...offset(enter) }
        : false}
      animate={isExiting
        ? { opacity: 0, ...offset(-enter) }
        : { opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      onAnimationComplete={() => {
        if (transition.phase === 'exiting')
          transition.finishExit()
        else if (transition.phase === 'entering')
          transition.finishEnter()
      }}
    >
      { children }
    </motion.div>
  )
}
```

要点：`initial` 只在 `phase === 'entering'` 时给起始态（`entered` 稳定态不重播入场）；动画时长同样要小于兜底超时。完整可运行版本见 demo 的 [`MotionPageTransition`](./src/views/_shared/MotionPageTransition.tsx)（`/push-replace` 路由使用它，其余路由为 CSS 版，可对比手感）

### 推荐在路由配置层统一注入

页面组件零侵入，新增页面自动获得过渡，不会漏包：

```tsx
const withPageTransition = (Component: ComponentType<any>) => (props: any) => (
  <PageTransition>
    <Component {...props} />
  </PageTransition>
)

const router = createBrowserRouter({
  routes: [
    { path: '/', component: withPageTransition(Home) },
    { path: '/dashboard', component: withPageTransition(lazy(() => import('./views/dashboard'))) },
  ],
  options: {
    transition: { enterTimeout: 350, exitTimeout: 350 },
  },
})
```

### 注意事项

- 全局 `transition` 下，不消费过渡状态的页面不会报错，但每次切换会等满兜底超时才完成——要么统一注入，要么给该路由配 `transition: false`
- 命中 `prefers-reduced-motion: reduce`（默认遵循）或未配置 `transition` 时，一切退化为立即切换
- 未开启过渡（含路由级 `false`）时 `useRouteTransition()` 返回 `null`、`useRouteTransitionBindings()` 返回无害的 no-op 绑定，同一组件无需条件分支
- 方向推导会在每个历史条目的 `history.state` 上写入位点字段（键名见导出的 `NAV_POSITION_KEY`），自行读写 `history.state` 时请展开合并保留该字段

## 🧭 Router API

| 方法 | 说明 |
|------|------|
| `router.navigate(path)` | 推入历史，触发守卫/中间件 |
| `router.replace(path)` | 替换当前 |
| `router.back()` | `history.back()` |
| `router.getLocation()` | 当前 `LocationLike` |
| `router.navigationDirection` | 最近一次导航的方向：`forward` / `back` / `replace` |
| `router.beforeEach/beforeResolve/afterEach(handler)` | 守卫注册 |
| `router.clearCache()` | 清空所有 keep-alive 页面缓存 |
| `router.deleteCache(matcher)` | 删除匹配指定 key 的 keep-alive 页面缓存，支持 string / RegExp / function |
| `router.subscribe(listener)` | 监听 location |
| `router.dispose()` | 清理 |

## 🧩 组件 & Hooks

| 名称 | 说明 |
|------|------|
| `<RouterProvider router>` | 入口 |
| `<Outlet />` | 嵌套出口 |
| `<Link />` / `<NavLink />` | 导航 |
| `useRouter()` | 实例（引用终身恒定，**不随导航重渲染**；读 `.location` / `.navigationDirection` 值新鲜但不触发刷新，需要响应式请用 `useLocation()`） |
| `useNavigate()` | `navigate` 函数（引用恒定，可安全放入 deps / memo 组件 props） |
| `useLocation()` | 全局当前 `pathname`、`search`、`hash`，默认跟随真实路由切换 |
| `useLocation({ scope: 'cache' })` | 当前 keep-alive 缓存 entry 的 `pathname`、`search`、`hash` |
| `useParams()` | `{ params, query, hash }` |
| `useRouteKeepAliveEffect(effect)` | keep-alive 缓存页的可见性感知 `useEffect`：激活时跑 `effect`，**失活（被缓存隐藏）/ 卸载**时跑其 cleanup |
| `useRouteTransition()` | 当前路由过渡状态 `{ phase, direction, finishEnter, finishExit }`；未开启过渡时为 `null` |
| `useRouteTransitionBindings()` | 开箱即用封装：`{ isEntering, isExiting, direction, bind }`，`{...bind}` 展开到动画元素即完成接线 |

### `useRouteKeepAliveEffect`

开启 `cache` 后，离开缓存页只是把它**隐藏**（组件不卸载），普通 `useEffect` 的 cleanup 此时**不会触发** —— 凡是「仅当前页可见时才该生效」的副作用 / 信号（如上报“当前在某页”、暂停视频、释放摄像头），用普通 `useEffect` 都会在切走后残留。`useRouteKeepAliveEffect` 专门解决这点：

```tsx
useRouteKeepAliveEffect(() => {
  reportActiveSurface(true)
  return () => reportActiveSurface(false) // 隐藏 / 卸载都会复位
})
```

- 页面**激活**（首次可见，或被缓存隐藏后切回）时执行 `effect`；**失活（隐藏）或卸载**时执行其返回的 cleanup
- 自动解析所属缓存单元，**无需手动传 key**；内部用 ref 始终调用最新闭包，故不需要依赖数组
- 覆盖「晚于初次激活才挂载的后代」（如异步 / `SplitPane` 内晚挂载的子组件）：挂载即补激活
- 未被 keep-alive 包裹时退化为普通 `useEffect`（挂载执行、卸载清理）

## 🔌 守卫与中间件

```ts
// 守卫签名
type NavigationGuard = (to, from, next) => void | Promise<void>
// next() | next(false) | next('/redirect')

// 中间件签名
type Middleware = (ctx, next) => void | Promise<void>
// ctx.redirect('/path') 可跳转
```

## 📁 项目结构

`src/router/` 为库源码，其余为示例：

```
src/router/          # 库源码
src/routes/          # 路由配置示例
src/views/           # 页面示例
src/App.tsx          # Demo 入口
```

## 🔗 相关

- [文件式路由插件](https://github.com/beixiyo/vite-auto-route)
- [示例代码](./src/App.tsx)
