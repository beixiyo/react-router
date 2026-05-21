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

[Code Demo](./src/App.tsx)

## ✨ 特性

| 特性 | @jl-org/react-router | react-router | TanStack Router |
|------|----------------------|--------------|-----------------|
| 全局守卫 `beforeEach`/`beforeResolve`/`afterEach` | ✅ Vue Router 风格 | ❌ 无，需根 middleware 模拟 | ⚠️ `route.beforeLoad` 路由级 |
| Koa 风格中间件 | ✅ | ⚠️ v7 有 middleware | Loader 机制 |
| 内置 LRU 页面缓存 | ✅ | ❌ 需第三方（如 keepalive-for-react） | ❌ |
| 全局布局 `layouts` | ✅ pathname 配置 | ❌ 仅嵌套路由 | ❌ 仅 Layout Route |

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
    beforeEach?: NavigationGuard,
    beforeResolve?: NavigationGuard,
    afterEach?: AfterEachGuard,
  },
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

## 🧭 Router API

| 方法 | 说明 |
|------|------|
| `router.navigate(path)` | 推入历史，触发守卫/中间件 |
| `router.replace(path)` | 替换当前 |
| `router.back()` | `history.back()` |
| `router.getLocation()` | 当前 `LocationLike` |
| `router.beforeEach/beforeResolve/afterEach(handler)` | 守卫注册 |
| `router.subscribe(listener)` | 监听 location |
| `router.dispose()` | 清理 |

## 🧩 组件 & Hooks

| 名称 | 说明 |
|------|------|
| `<RouterProvider router>` | 入口 |
| `<Outlet />` | 嵌套出口 |
| `<Link />` / `<NavLink />` | 导航 |
| `useRouter()` | 实例 |
| `useNavigate()` | `navigate` 函数 |
| `useLocation()` | `pathname`、`search`、`hash` |
| `useParams()` | `{ params, query, hash }` |

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
