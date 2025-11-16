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
| 全局导航函数 | ✅ 可在 Hook 外调用 | ❌ 需使用 Hook | ❌ 需使用 Hook |
| 文件式路由 | 额外配置 | 额外配置 | 额外配置 |
| 中间件系统 | ✅ Koa 风格中间件 | ⚠️ V7版本才支持 | Loader 机制 |
| 页面缓存 | ✅ 内置 LRU 缓存 | ⚠️ 需手动实现，且 React19.2 无法使用 | ❌无 |
| 嵌套路由 | ✅ 支持 | ✅ 支持 | ✅ 支持 |

## 📦 安装

```bash
npm install @jl-org/react-router
# 或
pnpm add @jl-org/react-router
# 或
yarn add @jl-org/react-router
```

## 🚀 快速开始

### 1. 基础配置

```tsx
import { RouterProvider, Outlet } from '@jl-org/react-router'
import { routes } from './routes'

function App() {
  return (
    <RouterProvider routes={routes}>
      <Outlet />
    </RouterProvider>
  )
}
```

### 2. 路由配置

#### 方式一：手动配置路由

```tsx
import { lazy } from 'react'
import type { RouteObject } from '@jl-org/react-router'

export const routes: RouteObject[] = [
  {
    path: '/',
    component: () => import('./views/home'),
  },
  {
    path: '/dashboard',
    component: lazy(() => import('./views/dashboard')),
    meta: { title: 'Dashboard', requiresAuth: true },
  },
  {
    path: '/admin',
    component: lazy(() => import('./views/admin')),
    middlewares: [requireLogin, requireAdmin],
  },
  {
    path: '/users/:id',
    component: lazy(() => import('./views/user')),
    children: [
      {
        path: 'posts/:postId',
        component: lazy(() => import('./views/post')),
      },
    ],
  },
]
```

#### 方式二：文件式路由（推荐）

使用 [`@jl-org/vite-auto-route`](https://github.com/beixiyo/vite-auto-route) 插件自动生成路由：

```tsx
import { genRoutes } from '@jl-org/vite-auto-route'
import { lazy } from 'react'
import { createAuthMiddleware } from '../middlewares'
import Home from '../views'

const requireLogin = createAuthMiddleware(() => !!getUser(), '/login')
const requireAdmin = createAuthMiddleware(() => getUser()?.role === 'admin', '/403')

export const fileRoutes = genRoutes({
  customizeRoute: (context) => {
    return (route) => {
      // 根据路径添加中间件
      if (route.path === '/admin') {
        route.middlewares = [requireLogin, requireAdmin]
      } 

      // 添加元信息
      if (route.path === '/dashboard') {
        route.meta = { title: 'Dashboard', requiresAuth: true }
      }

      return {
        ...route,
        // 懒加载
        component: lazy(route.component),
      }
    }
  },
  // 手动添加首页
  extendRoutes(routes) {
    routes.push({
      path: '/',
      component: Home,
    } as any)
    return routes
  },
})
```

文件结构示例：
```
src/views/
  ├── index.tsx          → /
  ├── dashboard/
  │   └── page.tsx       → /dashboard
  ├── admin/
  │   └── page.tsx       → /admin
  └── users/
      └── [id]/
          └── page.tsx   → /users/:id
```

### 3. 全局路由守卫

```tsx
import type { RouterOptions, NavigationGuardContext, GuardNext } from '@jl-org/react-router'

const routerOptions: RouterOptions = {
  // 全局前置守卫 - 在路由跳转前执行
  beforeEach: async (to, from, next) => {
    console.log('🔒 [全局前置守卫]', from.to.pathname, '→', to.to.pathname)

    const user = getUser()
    const isLoginPage = to.to.pathname === '/login'

    // 未登录且不是登录页，重定向到登录页
    if (!user && !isLoginPage) {
      const requiresAuth = to.meta?.requiresAuth !== false
      if (requiresAuth) {
        next('/login')
        return
      }
    }

    // 已登录且访问登录页，重定向到首页
    if (user && isLoginPage) {
      next('/')
      return
    }

    next() // 继续导航
  },

  // 全局解析守卫 - 在所有组件内守卫和异步路由组件被解析之后执行
  beforeResolve: async (to, from, next) => {
    console.log('📦 [全局解析守卫] 预加载数据...')

    // 根据路由预加载数据
    if (to.to.pathname.startsWith('/dashboard')) {
      await preloadDashboardData()
    }

    next()
  },

  // 全局后置守卫 - 在路由跳转后执行
  afterEach: (to, from) => {
    console.log('📊 [全局后置守卫] 页面访问追踪...')

    // 更新页面标题
    const title = to.meta?.title || 'App'
    document.title = title

    // 发送分析事件
    analytics.track('page_view', {
      path: to.to.pathname,
      referrer: from.to.pathname,
    })
  },
}

function App() {
  return (
    <RouterProvider routes={routes} options={routerOptions}>
      <Outlet />
    </RouterProvider>
  )
}
```

### 4. 动态注册守卫

```tsx
import { useRouter } from '@jl-org/react-router'

function MyComponent() {
  const router = useRouter()

  useEffect(() => {
    // 注册守卫
    const removeGuard = router.beforeEach((to, from, next) => {
      // 守卫逻辑
      next()
    })

    // 清理守卫
    return removeGuard
  }, [router])
}
```

## 📖 API 文档

### 组件

#### `<RouterProvider>`

路由提供者组件，包裹应用根组件。

```tsx
<RouterProvider routes={routes} options={routerOptions}>
  {children}
</RouterProvider>
```

**Props:**
- `routes: RouteObject[]` - 路由配置数组
- `options?: RouterOptions` - 路由器选项

#### `<Outlet />`

渲染子路由的出口组件。

```tsx
function Layout() {
  return (
    <div>
      <nav>导航栏</nav>
      <Outlet /> {/* 子路由在这里渲染 */}
    </div>
  )
}
```

#### `<Link>`

导航链接组件。

```tsx
import { Link } from '@jl-org/react-router'

<Link to="/dashboard" className="nav-link">
  仪表盘
</Link>
```

#### `<NavLink>`

带激活状态的导航链接组件。

```tsx
import { NavLink } from '@jl-org/react-router'

<NavLink
  to="/dashboard"
  className="nav-link"
  activeClassName="active"
  inactiveClassName="inactive"
>
  仪表盘
</NavLink>
```

### Hooks

#### `useRouter()`

获取路由器实例。

```tsx
import { useRouter } from '@jl-org/react-router'

function MyComponent() {
  const router = useRouter()

  // router.navigate('/path')
  // router.replace('/path')
  // router.back()
  // router.location
  // router.beforeEach(guard)
  // router.beforeResolve(guard)
  // router.afterEach(guard)
}
```

#### `useNavigate()`

获取导航函数。

```tsx
import { useNavigate } from '@jl-org/react-router'

function MyComponent() {
  const navigate = useNavigate()

  // 普通导航
  navigate('/dashboard')

  // 替换当前历史记录
  navigate('/login', { replace: true })

  // 带查询参数
  navigate('/dashboard', { query: { tab: 'settings', page: 1 } })

  // 带路径参数（高级用法）
  navigate('/users/:id', { params: { id: '123' } })

  // 返回上一页
  navigate(-1)
}
```

#### `useLocation()`

获取当前位置信息。

```tsx
import { useLocation } from '@jl-org/react-router'

function MyComponent() {
  const location = useLocation()
  // location.pathname
  // location.search
  // location.hash
}
```

#### `useParams()`

获取路由参数、查询参数和 hash 参数。

```tsx
import { useParams } from '@jl-org/react-router'

function UserPage() {
  const { params, query, hash } = useParams()
  // params: { id: '123' } - 路由参数
  // query: { name: 'test' } - URL 查询参数 (?name=test)
  // hash: { section: 'intro' } - Hash 参数 (#section=intro)

  return <div>User ID: {params.id}</div>
}
```

### 全局导航函数

**无需在组件内使用，可在任何地方调用，但是仅限一个 Router 实例**

```tsx
import { navigate, replace, back } from '@jl-org/react-router'

// 在任何地方使用
navigate('/dashboard')
navigate('/users/:id', { params: { id: '123' } })
navigate('/dashboard', { query: { tab: 'settings' } })

replace('/login')
back()
```

### 中间件

#### 创建中间件

```tsx
import type { Middleware, MiddlewareContext } from '@jl-org/react-router'

const authMiddleware: Middleware = async (ctx, next) => {
  if (!isAuthenticated()) {
    ctx.redirect('/login')
    return
  }
  await next()
}

const logMiddleware: Middleware = async (ctx, next) => {
  console.log('访问:', ctx.to.pathname)
  await next()
  console.log('离开:', ctx.to.pathname)
}
```

#### 在路由中配置中间件

```tsx
const routes: RouteObject[] = [
  {
    path: '/admin',
    component: AdminPage,
    middlewares: [requireLogin, requireAdmin],
  },
]
```

### 路由选项

```tsx
interface RouterOptions {
  // 基础路径前缀
  base?: string

  // 页面缓存配置
  cache?: boolean | {
    limit?: number              // 缓存数量限制，默认 10
    include?: (string | RegExp)[]  // 包含的路径
    exclude?: (string | RegExp)[]   // 排除的路径
  }

  // 自定义缓存键生成函数
  cacheKey?: (loc: LocationLike) => string

  // 路径匹配配置
  routeConfig?: RouteConfig

  // 全局守卫
  beforeEach?: NavigationGuard
  beforeResolve?: NavigationGuard
  afterEach?: AfterEachGuard
}
```

## 🎯 使用场景

### 1. 权限控制

```tsx
const routerOptions: RouterOptions = {
  beforeEach: async (to, from, next) => {
    const user = getUser()
    const requiresAuth = to.meta?.requiresAuth

    if (requiresAuth && !user) {
      next('/login')
      return
    }

    if (to.to.pathname.startsWith('/admin') && user?.role !== 'admin') {
      next('/403')
      return
    }

    next()
  },
}
```

### 2. 页面缓存

```tsx
const routerOptions: RouterOptions = {
  cache: {
    limit: 10,
    include: ['/dashboard', '/profile']
  },
}
```

### 3. 数据预加载

```tsx
const routerOptions: RouterOptions = {
  beforeResolve: async (to, from, next) => {
    if (to.to.pathname.startsWith('/dashboard')) {
      await preloadDashboardData()
    }
    next()
  },
}
```

### 4. 页面分析

```tsx
const routerOptions: RouterOptions = {
  afterEach: (to, from) => {
    analytics.track('page_view', {
      path: to.to.pathname,
      referrer: from.to.pathname,
    })
  },
}
```

## 🔍 与 Vue Router 的相似性

如果你熟悉 Vue Router，你会发现这个库的 API 设计非常相似：

| Vue Router | @jl-org/react-router |
|------------|---------------------|
| `router.beforeEach` | `router.beforeEach` |
| `router.beforeResolve` | `router.beforeResolve` |
| `router.afterEach` | `router.afterEach` |
| `router.push` | `router.navigate` |
| `router.replace` | `router.replace` |
| `router.back` | `router.back` |
| `this.$router` | `useRouter()` / 全局 `navigate()` |
| `this.$route` | `useLocation()` / `useParams()` |

## 🔗 相关链接

- [文件式路由插件](https://github.com/beixiyo/vite-auto-route)
