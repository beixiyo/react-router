# @jl-org/react-router

一个受 Vue Router 启发的 React 路由库，不再拧巴！！不再受制于人！！

- ✅ 路由缓存
- ✅ 统一的路由守卫
- ✅ 全局导航函数
- ✅ 文件式路由配置
- ✅ Api 简洁，无多余 Hook

[Code Demo](./src/App.tsx)

## ✨ 特性

### 🎯 核心优势

- **🛡️ Vue Router 风格的全局守卫** - 统一的 `beforeEach`、`beforeResolve`、`afterEach` 守卫，无需在每个组件中处理权限
- **🌐 全局导航函数** - 无需在组件内使用 Hook，可在任何地方调用 `navigate`、`replace`、`back`
- **📁 文件式路由** - 基于文件系统自动生成路由配置，简化路由管理
- **🔌 中间件系统** - 类似 Koa 的中间件机制，支持路由级别的中间件链
- **💾 页面缓存** - 内置页面缓存机制，支持 LRU 缓存策略
- **🔗 嵌套路由** - 完整的嵌套路由支持，支持 `<Outlet />` 组件

### 🆚 与其他路由库的对比

| 特性 | @jl-org/react-router | react-router | @tanstack/react-router |
|------|---------------------|--------------|------------------------|
| 全局路由守卫 | ✅ `beforeEach`/`beforeResolve`/`afterEach` | ❌ 需在组件内处理 | ❌ 需在组件内处理 |
| 文件式路由 | 额外配置 | 额外配置 | 额外配置 |
| 中间件系统 | ✅ Koa 风格中间件 | ⚠️ V7版本才支持 | Loader 机制 |
| 页面缓存 | ✅ 内置 LRU 缓存 | ⚠️ 需手动实现，且 React19.2 无法使用 | ❌无 |
| 嵌套路由 | ✅ 支持 | ✅ 支持 | ✅ 支持 |

## 🚀 最简上手示例

```bash
# pnpm 安装
pnpm i @jl-org/react-router
# npm 安装
npm i @jl-org/react-router
# yarn 安装
yarn add @jl-org/react-router
```

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
          if (!ctx.meta?.requiresAuth) return next()
          if (!getUser()) {
            ctx.redirect('/login')
            return
          }
          await next()
        },
      ],
    },
  ],
  options: {
    loadingComponent: // YourLoading,
    cache: { limit: 5, include: ['/', '/dashboard'] },
    beforeEach: async (to, _from, next) => {
      console.log('🔒 entering', to.to.pathname)
      next()
    },
    afterEach: (to) => {
      document.title = (typeof to.meta?.title === 'string' ? to.meta.title : 'App')
    },
  },
})

export function App() {
  return (
    <RouterProvider router={router}>
      <Outlet />
    </RouterProvider>
  )
}

// router 实例就是「全局 API」
router.navigate('/dashboard')
router.replace('/login')
router.beforeResolve(async (_to, _from, next) => next())
```

## 📦 安装

```bash
npm install @jl-org/react-router
# or pnpm add @jl-org/react-router
# or yarn add @jl-org/react-router
```

## ⚙️ `createBrowserRouter` 配置

```ts
const router = createBrowserRouter({
  routes,              // RouteObject[]
  options: {           // 可选
    base?: string,
    cache?: boolean | { limit?: number; include?: (string | RegExp)[]; exclude?: (string | RegExp)[] },
    cacheKey?: (location: LocationLike) => string,
    routeConfig?: RouteConfig,
    loadingComponent?: ReactElement | ComponentType,
    notFoundComponent?: ReactElement | ComponentType,   // 404 未匹配时渲染
    beforeEach?: NavigationGuard,
    beforeResolve?: NavigationGuard,
    afterEach?: AfterEachGuard,
  },
})
```

### RouteObject（常用字段）
- `path`: string
- `component`: React 组件或懒加载函数
- `children`: 嵌套路由
- `meta`: 自定义信息（如 `title`, `requiresAuth`）
- `loadingComponent`: 懒加载时的加载组件，支持 ReactElement 或 ComponentType，优先级高于全局配置
- `middlewares`: `Middleware[]`，Koa 风格 `(ctx, next)`，可调用 `ctx.redirect('/login')`

### 404 配置

当路由未匹配时，默认渲染简单的 "Not Found" 文案。可通过 `options.notFoundComponent` 自定义 404 页面：

```tsx
const router = createBrowserRouter({
  routes: [...],
  options: {
    notFoundComponent: () => <div className="text-center py-20">页面不存在</div>,
    // 或使用组件引用
    // notFoundComponent: NotFoundPage,
  },
})
```

## 🧭 Router 实例 API

| 方法 | 说明 |
| --- | --- |
| `router.navigate(path)` | 推入历史记录并触发守卫/中间件 |
| `router.replace(path)` | 替换当前历史记录 |
| `router.back()` | `history.back()` 封装 |
| `router.getLocation()` / `router.location` | 读取最新 `LocationLike` |
| `router.routes` / `router.options` | 访问构建配置 |
| `router.beforeEach(handler)` | 注册/移除前置守卫 |
| `router.beforeResolve(handler)` | 在组件渲染前最后一跳 |
| `router.afterEach(handler)` | 渲染完成后回调 |
| `router.subscribe(listener)` | 监听 location 变化 |
| `router.dispose()` | 停止监听、清理守卫 |

## 🧩 组件

- `<RouterProvider router={router}>`：整个应用的上下文入口。
- `<Outlet />`：嵌套路由出口。
- `<Link />` / `<NavLink />`：带缓存/参数/查询能力的导航组件。

## 🪝 Hooks（简单直接）

| Hook | 返回值 / 作用 |
| --- | --- |
| `useRouter()` | `BrowserRouterInstance`；可直接调用 `navigate/replace/back`、守卫注册等。 |
| `useNavigate()` | `(to: string \| number, options?: NavigateOptions) => void`；与实例方法一致但无需手动拿 router。 |
| `useLocation()` | `LocationLike`；包含 `pathname`、`search`、`hash`。 |
| `useParams()` | `{ params, query, hash }`；分别是路径参数、URL 查询、hash 查询。 |

> 所有 Hook 都没有入参，直接返回需要的值/函数。

## 🔌 中间件与守卫速览

```ts
const routes = [
  {
    path: '/admin',
    component: AdminPage,
    middlewares: [
      async (ctx, next) => {
        if (!hasToken()) {
          ctx.redirect('/login')
          return
        }
        await next()
      },
    ],
  },
]

router.beforeEach(async (to, from, next) => {
  if (to.meta?.requiresAuth && !getUser()) {
    next('/login')
    return
  }
  next()
})
```

守卫签名：

```ts
type NavigationGuard = (
  to: NavigationGuardContext,
  from: NavigationGuardContext,
  next: GuardNext,          // next() 继续，next(false) 中断，next('/login') 重定向
) => void | Promise<void>
```

中间件签名：

```ts
type Middleware = (ctx: MiddlewareContext, next: () => Promise<void>) => void | Promise<void>
// ctx.redirect('/anywhere') 可立即跳转
```

## 🌟 特性速览

- Vue Router 风格的 `beforeEach / beforeResolve / afterEach`
- Koa 风格路由中间件 + 文件式路由友好
- 内置 LRU 页面缓存与 `include/exclude` 配置
- Router 实例即全局 API，便于在 service/store 中复用

## 📁 项目结构

**`src/router/`** 才是路由库的**源码**，会被打包发布为 `@jl-org/react-router`。其余目录均为本仓库的**测试与示例**：

```
src
├── router/                    # 路由库源码
│   ├── components/            # Outlet、Link、RootOutlet 等
│   ├── constants/
│   ├── context/
│   ├── hooks/                 # useRouter、useNavigate、useParams 等
│   ├── renderer/              # 路由匹配、缓存、加载
│   ├── types/
│   ├── utils/                 # 守卫、中间件、LRU 缓存、路径解析
│   ├── create-browser-router.ts
│   ├── create-hash-router.ts
│   └── ...
├── routes/                    # 测试：路由配置与文件式路由示例
│   ├── middlewares/           # 测试：业务中间件示例（requireLogin 等）
│   ├── routes/
│   ├── file-routes.tsx
│   └── index.tsx
├── store/                     # 测试：Demo 用状态（auth）
├── utils/                     # 测试：Demo 用工具
├── views/                     # 测试：Demo 页面组件
├── App.tsx                    # 测试：Demo 应用入口
└── main.tsx
```

## 🔗 相关

- [文件式路由插件](https://github.com/beixiyo/vite-auto-route)
- [示例代码](./src/App.tsx)
