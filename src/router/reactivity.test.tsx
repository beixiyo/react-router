import type { BrowserRouterInstance, LocationLike, RouteObject } from './types'
import { act, cleanup, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Outlet } from './components/Outlet'
import { createBrowserRouter } from './create-browser-router'
import { useLocation } from './hooks/use-location'
import { useParams } from './hooks/use-params'
import { useRouter } from './hooks/use-router'
import { RouterProvider } from './router'

/**
 * 响应式 API 集成回归集（真实 router → Provider → Outlet 全链路，非 mock context）
 *
 * memo / 引用稳定性专项（RouterCtx 稳定实例、缓存 location 引用复用、
 * liveElement 依赖移除 search/hash）都是「减少重渲染」方向的改动，
 * 最大风险是过度优化导致该更新的没更新。本文件逐一锁死：
 * - query-only / hash-only 导航后 useLocation / useParams 必须看到新值（缓存开关两种路径）
 * - 缓存页复活时状态保留 && location 仍新鲜（同实例 + 新位置，两者缺一即为 bug）
 * - useRouter 非响应式但事件时读取必须新鲜（活 getter 不被冻成快照）
 * - 浏览器后退（popstate）同样驱动 useLocation
 */

function QueryProbe() {
  const location = useLocation()
  const { query } = useParams()
  return (
    <div>
      <span data-testid="search">{location.search}</span>
      <span data-testid="hash">{location.hash}</span>
      <span data-testid="query-q">{String(query.q ?? '')}</span>
    </div>
  )
}

function StatefulQueryProbe() {
  const [n, setN] = useState(0)
  return (
    <div>
      <QueryProbe />
      <span data-testid="count">{n}</span>
      <button type="button" data-testid="inc" onClick={() => setN(v => v + 1)}>inc</button>
    </div>
  )
}

function setPath(path: string) {
  window.history.pushState(null, '', path)
}

async function mount(routes: RouteObject[], options?: Record<string, unknown>): Promise<BrowserRouterInstance> {
  const router = createBrowserRouter({ routes, options })
  await act(async () => {
    render(
      <RouterProvider router={router}>
        <Outlet />
      </RouterProvider>,
    )
  })
  return router
}

async function nav(router: BrowserRouterInstance, path: string) {
  await act(async () => {
    router.navigate(path)
    await Promise.resolve()
  })
}

/** jsdom 的 history 遍历是异步的，需等两轮宏任务让 popstate 送达 */
async function traverse(delta: number) {
  await act(async () => {
    window.history.go(delta)
    await new Promise(resolve => setTimeout(resolve, 0))
    await new Promise(resolve => setTimeout(resolve, 0))
    await Promise.resolve()
  })
}

describe('响应式 API 集成回归', () => {
  afterEach(() => {
    cleanup()
  })

  it('query-only 导航（无缓存）：useLocation().search 与 useParams().query 看到新值', async () => {
    setPath('/list?q=1')
    const router = await mount([{ path: '/list', component: QueryProbe }])

    expect(screen.getByTestId('search').textContent).toBe('?q=1')
    expect(screen.getByTestId('query-q').textContent).toBe('1')

    await nav(router, '/list?q=2')

    expect(screen.getByTestId('search').textContent).toBe('?q=2')
    expect(screen.getByTestId('query-q').textContent).toBe('2')

    router.dispose()
  })

  it('query-only 导航（keep-alive 开启）：同缓存实例内 location 仍随导航刷新', async () => {
    setPath('/list?q=1')
    const router = await mount(
      [{ path: '/list', component: QueryProbe }],
      { cache: { limit: 10 } },
    )

    expect(screen.getByTestId('query-q').textContent).toBe('1')

    await nav(router, '/list?q=2')

    expect(screen.getByTestId('search').textContent).toBe('?q=2')
    expect(screen.getByTestId('query-q').textContent).toBe('2')

    router.dispose()
  })

  it('缓存页复活：状态保留（同实例）且 location 新鲜（新 query），两者必须同时成立', async () => {
    setPath('/list?q=1')
    const router = await mount(
      [
        { path: '/list', component: StatefulQueryProbe },
        { path: '/other', component: () => <div data-testid="other">other</div> },
      ],
      { cache: { limit: 10 } },
    )

    await act(async () => {
      screen.getByTestId('inc').click()
    })
    expect(screen.getByTestId('count').textContent).toBe('1')

    await nav(router, '/other')
    expect(screen.getByTestId('other')).toBeTruthy()

    await nav(router, '/list?q=2')

    /** 状态还在 → 确实是同一个缓存实例；query 已新 → location 没被引用复用冻住 */
    expect(screen.getByTestId('count').textContent).toBe('1')
    expect(screen.getByTestId('query-q').textContent).toBe('2')
    expect(screen.getByTestId('search').textContent).toBe('?q=2')

    router.dispose()
  })

  it('缓存叶子的 useLocation({ scope: cache })：同 key 不同 search 复活时随之刷新', async () => {
    function CacheScopeProbe() {
      const cacheLocation = useLocation({ scope: 'cache' })
      return <span data-testid="cache-search">{cacheLocation.search}</span>
    }

    setPath('/list?q=1')
    const router = await mount(
      [
        { path: '/list', component: CacheScopeProbe },
        { path: '/other', component: () => <div data-testid="other">other</div> },
      ],
      { cache: { limit: 10 } },
    )

    expect(screen.getByTestId('cache-search').textContent).toBe('?q=1')

    /** 同 key（默认 cacheKey 为 pathname）直接换 query */
    await nav(router, '/list?q=2')
    expect(screen.getByTestId('cache-search').textContent).toBe('?q=2')

    /** 离开再带新 query 复活 */
    await nav(router, '/other')
    await nav(router, '/list?q=3')
    expect(screen.getByTestId('cache-search').textContent).toBe('?q=3')

    router.dispose()
  })

  it('hash-only 导航（keep-alive 开启）：useLocation().hash 看到新值', async () => {
    setPath('/list#a')
    const router = await mount(
      [{ path: '/list', component: QueryProbe }],
      { cache: { limit: 10 } },
    )

    expect(screen.getByTestId('hash').textContent).toBe('#a')

    await nav(router, '/list#b')

    expect(screen.getByTestId('hash').textContent).toBe('#b')

    router.dispose()
  })

  it('参数导航：/users/1 → /users/2 叶子的 useParams().params 更新', async () => {
    function UserProbe() {
      const { params } = useParams()
      return <span data-testid="user-id">{String(params.id)}</span>
    }

    setPath('/users/1')
    const router = await mount([{ path: '/users/:id', component: UserProbe }])

    expect(screen.getByTestId('user-id').textContent).toBe('1')

    await nav(router, '/users/2')

    expect(screen.getByTestId('user-id').textContent).toBe('2')

    router.dispose()
  })

  it('useRouter：导航不触发重渲染，但事件时读 router.location 必须新鲜（活 getter 防冻结）', async () => {
    let renders = 0
    const readPathname = vi.fn()

    function RouterProbe() {
      renders++
      const router = useRouter()
      return (
        <button
          type="button"
          data-testid="read"
          onClick={() => readPathname(router?.location.pathname)}
        >
          read
        </button>
      )
    }

    setPath('/a')
    const router = createBrowserRouter({
      routes: [
        { path: '/a', component: () => <div>A</div> },
        { path: '/b', component: () => <div>B</div> },
      ],
    })
    await act(async () => {
      render(
        <RouterProvider router={router}>
          <RouterProbe />
          <Outlet />
        </RouterProvider>,
      )
    })
    const rendersAfterMount = renders

    await nav(router, '/b')

    expect(renders).toBe(rendersAfterMount)

    await act(async () => {
      screen.getByTestId('read').click()
    })
    expect(readPathname).toHaveBeenLastCalledWith('/b')

    router.dispose()
  })

  it('router.subscribe（真实实例）：导航推送新 location，退订后不再推送', async () => {
    setPath('/a')
    const router = await mount([
      { path: '/a', component: () => <div>A</div> },
      { path: '/b', component: () => <div>B</div> },
    ])

    const received: LocationLike[] = []
    const unsubscribe = router.subscribe(location => received.push(location))

    await nav(router, '/b')

    expect(received.at(-1)?.pathname).toBe('/b')

    const countBefore = received.length
    unsubscribe()

    await nav(router, '/a')

    expect(received.length).toBe(countBefore)

    router.dispose()
  })

  it('浏览器后退（popstate）：useLocation 跟随更新', async () => {
    function PathProbe() {
      const { pathname } = useLocation()
      return <span data-testid="pathname">{pathname}</span>
    }

    setPath('/a')
    const router = await mount([
      { path: '/a', component: PathProbe },
      { path: '/b', component: PathProbe },
    ])

    await nav(router, '/b')
    expect(screen.getByTestId('pathname').textContent).toBe('/b')

    await traverse(-1)

    expect(screen.getByTestId('pathname').textContent).toBe('/a')

    router.dispose()
  })
})
