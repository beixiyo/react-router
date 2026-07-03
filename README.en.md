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
| Route transitions + forward/back direction awareness | ✅ Headless 4-phase state machine + `direction`, aware of native browser back/forward | ⚠️ View Transitions API (no stack-direction semantics) | ⚠️ Bring your own animation library |

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
    transition?: {                       // route transitions; omit to disable entirely (zero behavior change)
      enterTimeout?: number,             // enter fallback timeout (ms) @default 500
      exitTimeout?: number,              // exit fallback timeout (ms) @default 500
      respectReducedMotion?: boolean,    // respect prefers-reduced-motion @default true
    },
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
| `transition` | Route-level transitions: field-level merge over the global config (route wins); `false` disables for this route |

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

## 🎬 Route Transitions

Headless by design: the library only provides the **phase state machine and direction signal**, without bundling any animation library — consume it with plain CSS, motion/react, or anything else. Fully independent from the keep-alive cache; uncached routes get an exit window too

```ts
// enable globally
options: {
  transition: { enterTimeout: 350, exitTimeout: 350 },
}

// per-route granularity: field-level merge over the global config (route fields win)
routes: [
  { path: '/heavy', component: Heavy, transition: { exitTimeout: 800 } }, // override exit timeout
  { path: '/instant', component: Instant, transition: false },           // disable for this route only
  { path: '/only-me', component: OnlyMe, transition: { enterTimeout: 350 } }, // enable a single route without a global config
]
```

Once enabled, route switches go through a controlled transition window instead of taking effect immediately. **An exiting page finishes its animation with its own config**, unaffected by the target route's config. Read the state inside pages via `useRouteTransition()`:

| Field | Description |
|-------|-------------|
| `phase` | `entering` → `entered` (stable) → `exiting` → `exited` (exit complete) |
| `direction` | Direction of this switch: `forward` (push / browser forward), `back` (browser back / `navigate(-1)`), `replace` (explicit replace / guard redirect) |
| `finishEnter()` | Manually confirm the enter animation finished; falls back to `enterTimeout` otherwise |
| `finishExit()` | Manually confirm the exit animation finished; falls back to `exitTimeout` otherwise |

`direction` is snapshotted at the moment of the switch, so a later navigation never mutates an in-flight animation. It is derived from position stamps in `history.state`, so **native browser back/forward buttons are recognized as well**

### Full example: direction-aware sliding transition

Use `useRouteTransitionBindings()` — it moves the three easy-to-get-wrong details into the library (enter double-frame pacing, filtering `transitionend` bubbled from children, auto-calling finish on animation end). **You only write styles** and spread `bind` onto the animated element:

```tsx
import { useRouteTransitionBindings } from '@jl-org/react-router'

const DURATION = 300 // must stay below enterTimeout / exitTimeout, or the fallback cuts the animation short

export function PageTransition({ children }: { children: React.ReactNode }) {
  const { isEntering, isExiting, direction, bind } = useRouteTransitionBindings()

  /** forward / back slide horizontally; replace has no stack-direction semantics, fall back to a vertical fade */
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

`bind` listens for both `transitionend` and `animationend`, so CSS animations work wiring-free as well

### Integrating motion/react (or other JS animation libraries)

JS animation libraries don't go through DOM transition events, so `bind` isn't needed — drive `animate` with `phase` / `direction`, and call the `finishExit` / `finishEnter` primitives in the completion callback:

```tsx
import { useRouteTransition } from '@jl-org/react-router'
import { motion } from 'motion/react'

export function MotionPageTransition({ children }: { children: React.ReactNode }) {
  const transition = useRouteTransition()

  /** Transitions disabled (no global config, or route-level false): just render normally */
  if (!transition)
    return <>{ children }</>

  const { phase, direction } = transition
  const isExiting = phase === 'exiting'
  // forward enters from the right and exits left; back is mirrored; replace moves vertically.
  // Always provide both x / y so a leftover value from the previous axis never lingers
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

Key points: only pass `initial` while `phase === 'entering'` (don't replay the enter animation in the stable `entered` state); the animation duration must stay below the fallback timeouts. A complete runnable version lives in the demo at [`MotionPageTransition`](./src/views/_shared/MotionPageTransition.tsx) (used by the `/push-replace` route, while the rest use the CSS version — compare the feel)

### Recommended: inject once at the route-config layer

Zero intrusion into page components; new pages get transitions automatically and none can be missed:

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

### Notes

- Under a global `transition`, pages that never consume the transition state won't break, but each switch waits out the fallback timeout — either inject the wrapper uniformly, or set `transition: false` on that route
- Everything degrades to instant switching when `prefers-reduced-motion: reduce` matches (respected by default) or `transition` is not configured
- With transitions disabled (including route-level `false`), `useRouteTransition()` returns `null` and `useRouteTransitionBindings()` returns harmless no-op bindings — the same component needs no conditional branches
- Direction inference writes a position field onto each history entry's `history.state` (key name exported as `NAV_POSITION_KEY`); spread-merge to preserve it if you write `history.state` yourself

## 🧭 Router API

| Method | Description |
|--------|-------------|
| `router.navigate(path)` | Pushes history and runs guards/middleware |
| `router.replace(path)` | Replaces the current entry |
| `router.back()` | Calls `history.back()` |
| `router.getLocation()` | Current `LocationLike` |
| `router.navigationDirection` | Direction of the latest navigation: `forward` / `back` / `replace` |
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
| `useRouter()` | Router instance (lifetime-stable reference, **does not re-render on navigation**; reading `.location` / `.navigationDirection` is always fresh but non-reactive — use `useLocation()` for reactivity) |
| `useNavigate()` | `navigate` function (stable reference, safe for deps / memoized component props) |
| `useLocation()` | Global current `pathname`, `search`, and `hash`; follows real route changes by default |
| `useLocation({ scope: 'cache' })` | `pathname`, `search`, and `hash` of the current keep-alive cache entry |
| `useParams()` | `{ params, query, hash }` |
| `useRouteKeepAliveEffect(effect)` | Visibility-aware `useEffect` for keep-alive cached pages: runs `effect` on activate, runs its cleanup on **deactivate (hidden by cache) / unmount** |
| `useRouteTransition()` | Current route transition state `{ phase, direction, finishEnter, finishExit }`; `null` when transitions are disabled |
| `useRouteTransitionBindings()` | Batteries-included wrapper: `{ isEntering, isExiting, direction, bind }`; spreading `{...bind}` onto the animated element completes the wiring |

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
