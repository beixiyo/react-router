<div align="center">
  <img alt="npm-version" src="https://img.shields.io/npm/v/@jl-org/react-router?color=red&logo=npm" />
  <img alt="npm-download" src="https://img.shields.io/npm/dm/@jl-org/react-router?logo=npm" />
  <img alt="License" src="https://img.shields.io/npm/l/@jl-org/react-router?color=blue" />
  <img alt="typescript" src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" />
  <img alt="github" src="https://img.shields.io/badge/GitHub-181717?logo=github&logoColor=white" />
</div>

<br />

# @jl-org/react-router

A React router inspired by Vue Router. It provides Vue Router-style guards, Koa-style middleware, built-in LRU page caching, and a Router instance that can be used as a global API.

[中文](./README.md) | [Changelog](./CHANGELOG.md)

[Code Demo](./src/App.tsx)

## ✨ Features

| Feature | @jl-org/react-router | React Router | TanStack Router |
|---------|----------------------|--------------|-----------------|
| Global guards `beforeEach`/`beforeResolve`/`afterEach` | ✅ Vue Router-style global API | ⚠️ No same-name API; route middleware / loader lifecycle can cover related flows | ⚠️ Route/subtree-level `route.beforeLoad` |
| Koa-style middleware | ✅ Route `middlewares`, `(ctx, next)` | ✅ `middleware` / `clientMiddleware` | ⚠️ `beforeLoad` + loader lifecycle |
| Built-in component keep-alive / LRU page cache | ✅ Component-instance LRU keep-alive | ❌ No built-in component keep-alive | ⚠️ Loader / SWR data cache, not component keep-alive |
| Global `layouts` | ✅ Central pathname-matching config | ⚠️ Nested routes / layout routes | ⚠️ Layout / pathless layout routes |

## 📦 Installation

```bash
pnpm i @jl-org/react-router
# or npm i @jl-org/react-router
# or yarn add @jl-org/react-router
```

## 🚀 Quick Start

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

// The Router instance can be used as a global API.
router.navigate('/dashboard')
router.replace('/login')
```

## ⚙️ Configuration

```ts
createBrowserRouter({
  routes: RouteObject[],
  options: {
    base?: string,
    cache?: boolean | {
      limit?: number,                    // @default 10
      include?: (string | RegExp)[],     // cache all paths when omitted; cache none when []
      exclude?: (string | RegExp)[],     // higher priority than include
    },
    cacheKey?: (loc: LocationLike) => string,
    loadingComponent?: ReactElement | ComponentType,
    notFoundComponent?: ReactElement | ComponentType,
    layouts?: LayoutConfig[],            // global layouts
    beforeEach?: NavigationGuard,
    beforeResolve?: NavigationGuard,
    afterEach?: AfterEachGuard,
  },
})
```

### Page Cache Control

When `cache` is enabled, matched pages are preserved in a keep-alive state. To release cached pages on logout, tenant switching, account switching, or similar flows, call the Router instance methods directly:

```ts
// Clear all keep-alive page caches.
router.clearCache()

// Delete one cache key.
router.deleteCache('/cards')

// Delete a group of cache keys with a regexp or predicate.
router.deleteCache(/^\/cards/)
router.deleteCache(key => key.includes(':guest'))
```

If clearing cache is immediately followed by navigation, it is recommended to clear after the target route is entered. This avoids the current cacheable page being written back into the cache during the same render:

```ts
router.afterEach((ctx) => {
  if (ctx.to.pathname === '/login')
    router.clearCache()
})
```

### Common RouteObject Fields

| Field | Description |
|-------|-------------|
| `path` | Route path |
| `component` | Component or `lazy()` |
| `children` | Nested routes |
| `meta` | Custom metadata |
| `middlewares` | Koa-style `(ctx, next)` handlers |
| `loadingComponent` | Route-level lazy fallback, higher priority than the global one |
| `layoutComponent` | Route-level layout wrapping the current route |

### Global `layouts`

Layouts are matched by pathname. The first matching layout wraps the rendered result. `exclude` has higher priority; an empty `include` matches all paths.

```tsx
const router = createBrowserRouter({
  routes: [...],
  options: {
    layouts: [
      {
        component: MainLayout,    // layout component receiving children
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

| Field | Description |
|-------|-------------|
| `component` | Layout component, `({ children }) => ReactNode` |
| `include` | Use this layout when any matcher hits; empty means match all |
| `exclude` | Skip this layout when any matcher hits |

### 404

```tsx
options: {
  notFoundComponent: () => <div>Page not found</div>,
}
```

## 🧭 Router API

| Method | Description |
|--------|-------------|
| `router.navigate(path)` | Pushes history and runs guards/middleware |
| `router.replace(path)` | Replaces the current entry |
| `router.back()` | Calls `history.back()` |
| `router.getLocation()` | Current `LocationLike` |
| `router.beforeEach/beforeResolve/afterEach(handler)` | Guard registration |
| `router.clearCache()` | Clears all keep-alive page caches |
| `router.deleteCache(matcher)` | Deletes matching keep-alive cache keys; supports string / RegExp / function |
| `router.subscribe(listener)` | Subscribes to location changes |
| `router.dispose()` | Cleans up listeners |

## 🧩 Components & Hooks

| Name | Description |
|------|-------------|
| `<RouterProvider router>` | Entry provider |
| `<Outlet />` | Nested outlet |
| `<Link />` / `<NavLink />` | Navigation |
| `useRouter()` | Router instance |
| `useNavigate()` | `navigate` function |
| `useLocation()` | Global current `pathname`, `search`, and `hash`; follows real route changes by default |
| `useLocation({ scope: 'cache' })` | `pathname`, `search`, and `hash` of the current keep-alive cache entry |
| `useParams()` | `{ params, query, hash }` |
| `useRouteKeepAliveEffect(effect)` | Visibility-aware `useEffect` for keep-alive cached pages: runs `effect` on activate, runs its cleanup on **deactivate (hidden by cache) / unmount** |

### `useRouteKeepAliveEffect`

With `cache` enabled, leaving a cached page only **hides** it (the component stays mounted), so a plain `useEffect` cleanup **does not fire**. Any "active only while this page is visible" side effect / signal (e.g. reporting "I'm on page X", pausing a video, releasing the camera) would leak after navigating away. This hook fixes exactly that:

```tsx
useRouteKeepAliveEffect(() => {
  reportActiveSurface(true)
  return () => reportActiveSurface(false) // reset on hide / unmount
})
```

- Runs `effect` on **activate** (first visible, or switched back after being hidden); runs its cleanup on **deactivate (hidden) or unmount**
- Auto-resolves the owning cache entry — **no manual key**; always calls the latest closure via a ref, so no deps array needed
- Covers descendants that **mount later than the initial activation** (e.g. async / late-mounted children inside a `SplitPane`): activates on mount
- Falls back to a plain `useEffect` when not wrapped by keep-alive (run on mount, clean up on unmount)

## 🔌 Guards & Middleware

```ts
// Guard signature
type NavigationGuard = (to, from, next) => void | Promise<void>
// next() | next(false) | next('/redirect')

// Middleware signature
type Middleware = (ctx, next) => void | Promise<void>
// ctx.redirect('/path') can redirect
```

## 📁 Project Structure

`src/router/` contains the library source. Other directories are examples:

```
src/router/          # library source
src/routes/          # route config examples
src/views/           # page examples
src/App.tsx          # demo entry
```

## 🔗 Related

- [File-based route plugin](https://github.com/beixiyo/vite-auto-route)
- [Example code](./src/App.tsx)
