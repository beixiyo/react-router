import type { RouteObject } from '../types'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useEffect, useState } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Outlet } from '../components/Outlet'
import { createBrowserRouter } from '../create-browser-router'
import { useParams } from '../hooks/use-params'
import { RouterProvider } from '../router'

/**
 * keep-alive 逐层缓存：共享祖先只挂载一次，发散叶子各自保活
 * 复现并锁定原 bug——按 cacheKey 缓存整条路由链会把共享父布局复制成多实例
 */

let layoutMounts = 0
let layoutLive = 0
let mountCounts: Record<string, number> = {}

function Layout() {
  useEffect(() => {
    layoutMounts++
    layoutLive++
    return () => {
      layoutLive--
    }
  }, [])
  return (
    <div data-testid="layout">
      <Outlet />
    </div>
  )
}

/** 带本地计数状态的叶子页，用于验证 keep-alive 是否真正保留状态 / 是否新建实例 */
function Counter({ name }: { name: string }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    mountCounts[name] = (mountCounts[name] ?? 0) + 1
  }, [name])
  return (
    <div>
      <span data-testid={`${name}-count`}>{n}</span>
      <button type="button" data-testid={`${name}-inc`} onClick={() => setN(v => v + 1)}>inc</button>
    </div>
  )
}

const Cards = () => <Counter name="cards" />
const Settings = () => <Counter name="settings" />

function setPath(pathname: string) {
  window.history.pushState(null, '', pathname)
}

async function mount(routes: RouteObject[], options?: any) {
  const router = createBrowserRouter({ routes, options: { cache: { limit: 10 }, ...options } })
  await act(async () => {
    render(
      <RouterProvider router={router}>
        <Outlet />
      </RouterProvider>,
    )
  })
  return router
}

async function nav(router: any, path: string) {
  await act(async () => {
    router.navigate(path)
    await Promise.resolve()
  })
}

const sharedLayoutRoutes: RouteObject[] = [
  {
    path: '/',
    component: Layout,
    children: [
      { path: '/cards', component: Cards },
      { path: '/settings', component: Settings },
    ],
  },
]

describe('keep-alive 逐层缓存', () => {
  beforeEach(() => {
    layoutMounts = 0
    layoutLive = 0
    mountCounts = {}
    setPath('/cards')
  })

  afterEach(() => {
    cleanup()
  })

  it('共享父布局在子路由间切换只挂载一次', async () => {
    const router = await mount(sharedLayoutRoutes)
    expect(layoutLive).toBe(1)

    await nav(router, '/settings')
    expect(screen.getByTestId('settings-count')).toBeTruthy()
    expect(layoutLive).toBe(1)
    expect(layoutMounts).toBe(1)

    await nav(router, '/cards')
    await nav(router, '/settings')
    expect(layoutLive).toBe(1)
    expect(layoutMounts).toBe(1)

    router.dispose()
  })

  it('叶子页状态在离开再回来后保留（keep-alive 生效）', async () => {
    const router = await mount(sharedLayoutRoutes)

    fireEvent.click(screen.getByTestId('cards-inc'))
    fireEvent.click(screen.getByTestId('cards-inc'))
    expect(screen.getByTestId('cards-count').textContent).toBe('2')

    await nav(router, '/settings')
    expect(screen.getByTestId('settings-count').textContent).toBe('0')

    await nav(router, '/cards')
    // 回到 cards：keep-alive 应保留之前的计数，且不应重新挂载
    expect(screen.getByTestId('cards-count').textContent).toBe('2')
    expect(mountCounts.cards).toBe(1)

    router.dispose()
  })

  it('不同参数的叶子是各自独立的实例', async () => {
    function Item() {
      const { params } = useParams()
      return <Counter name={`item-${params.id}`} />
    }
    const routes: RouteObject[] = [
      {
        path: '/',
        component: Layout,
        children: [
          { path: '/item/:id', component: Item },
        ],
      },
    ]
    setPath('/item/1')
    const router = await mount(routes)

    fireEvent.click(screen.getByTestId('item-1-inc'))
    expect(screen.getByTestId('item-1-count').textContent).toBe('1')

    await nav(router, '/item/2')
    // 不同参数 → 新实例，计数从 0 开始；父布局仍单实例
    expect(screen.getByTestId('item-2-count').textContent).toBe('0')
    expect(layoutLive).toBe(1)

    await nav(router, '/item/1')
    // 回到 item/1：原实例保活，计数仍是 1，未重新挂载
    expect(screen.getByTestId('item-1-count').textContent).toBe('1')
    expect(mountCounts['item-1']).toBe(1)

    router.dispose()
  })

  it('clearCache 后叶子被重新挂载（状态重置）', async () => {
    const router = await mount(sharedLayoutRoutes)

    fireEvent.click(screen.getByTestId('cards-inc'))
    expect(screen.getByTestId('cards-count').textContent).toBe('1')
    expect(mountCounts.cards).toBe(1)

    await nav(router, '/settings')
    await act(async () => {
      router.clearCache()
    })
    await nav(router, '/cards')

    // 清缓存后回到 cards：全新实例（重新挂载），计数归零
    expect(mountCounts.cards).toBe(2)
    expect(screen.getByTestId('cards-count').textContent).toBe('0')

    router.dispose()
  })

  it('cacheKey 变化时叶子被视为新页面（会话隔离），父布局不受影响', async () => {
    let session = 'a'
    const router = await mount(sharedLayoutRoutes, {
      cacheKey: (loc: any) => (loc.pathname === '/cards' ? `/cards:${session}` : loc.pathname),
    })

    expect(mountCounts.cards).toBe(1)

    // 切换会话后重新进入 /cards：cacheKey 变了 → 新实例
    session = 'b'
    await nav(router, '/settings')
    await nav(router, '/cards')

    expect(mountCounts.cards).toBe(2)
    // 父布局始终单实例
    expect(layoutMounts).toBe(1)
    expect(layoutLive).toBe(1)

    router.dispose()
  })

  it('多级嵌套：根布局与中间布局都只挂载一次', async () => {
    let innerMounts = 0
    function Inner() {
      useEffect(() => {
        innerMounts++
      }, [])
      return (
        <div data-testid="inner">
          <Outlet />
        </div>
      )
    }
    const routes: RouteObject[] = [
      {
        path: '/',
        component: Layout,
        children: [
          {
            path: '/admin',
            component: Inner,
            children: [
              { path: '/admin/users', component: () => <Counter name="users" /> },
              { path: '/admin/roles', component: () => <Counter name="roles" /> },
            ],
          },
        ],
      },
    ]
    setPath('/admin/users')
    const router = await mount(routes)

    expect(layoutLive).toBe(1)
    expect(innerMounts).toBe(1)

    await nav(router, '/admin/roles')
    // 切换 admin 下的子页：根布局与 admin 中间布局都不应被复制
    expect(screen.getByTestId('roles-count')).toBeTruthy()
    expect(layoutLive).toBe(1)
    expect(layoutMounts).toBe(1)
    expect(innerMounts).toBe(1)

    router.dispose()
  })

  it('直达父路由 bare path（不在 include）也不复制父布局', async () => {
    // include 只缓存 /cards；父布局自身路径 '/' 不在名单内
    setPath('/cards')
    const router = await mount(sharedLayoutRoutes, { cache: { limit: 10, include: ['/cards'] } })
    expect(layoutLive).toBe(1)

    // 直达父布局自身路径：它是承载 <Outlet/> 的壳，应复用同一实例而非再生一份
    await nav(router, '/')
    expect(layoutLive).toBe(1)
    expect(layoutMounts).toBe(1)

    await nav(router, '/cards')
    expect(layoutLive).toBe(1)
    expect(layoutMounts).toBe(1)

    router.dispose()
  })

  it('自定义 cacheKey 下，直达父路由 bare path 仍复用同一壳（键不冲突）', async () => {
    setPath('/cards')
    const router = await mount(sharedLayoutRoutes, {
      cache: { limit: 10 },
      cacheKey: (loc: any) => `${loc.pathname}:x`,
    })
    expect(layoutLive).toBe(1)

    // 壳的缓存键走结构化路径（非 cacheKey），bare path 与子路由命中同一键 → 单实例
    await nav(router, '/')
    expect(layoutLive).toBe(1)
    expect(layoutMounts).toBe(1)

    router.dispose()
  })

  it('当前路由不在缓存名单（include）时，共享父布局仍只有一个实例', async () => {
    // include 只缓存 /cards，/settings 是「非缓存」叶子
    setPath('/cards')
    const router = await mount(sharedLayoutRoutes, { cache: { limit: 10, include: ['/cards'] } })
    expect(layoutLive).toBe(1)
    expect(layoutMounts).toBe(1)

    // 切到非缓存叶子：父布局不应被复制成第二份，其 effect / 订阅不应再跑一次
    await nav(router, '/settings')
    expect(screen.getByTestId('settings-count')).toBeTruthy()
    expect(layoutLive).toBe(1)
    expect(layoutMounts).toBe(1)

    // 再切回缓存叶子，父布局依旧单实例
    await nav(router, '/cards')
    expect(layoutLive).toBe(1)
    expect(layoutMounts).toBe(1)

    router.dispose()
  })

  it('从「非缓存」路由进入时，共享父布局也只挂载一次并保持稳定（无需第二次切换才生效）', async () => {
    // 入口就是非缓存叶子 /settings
    setPath('/settings')
    const router = await mount(sharedLayoutRoutes, { cache: { limit: 10, include: ['/cards'] } })
    expect(layoutLive).toBe(1)
    expect(layoutMounts).toBe(1)

    // 来回切换缓存 / 非缓存叶子：祖先始终稳定，从不重新挂载
    await nav(router, '/cards')
    await nav(router, '/settings')
    await nav(router, '/cards')
    expect(layoutLive).toBe(1)
    expect(layoutMounts).toBe(1)

    router.dispose()
  })

  it('多级嵌套 + 非缓存深层叶子：根布局与中间布局都不被复制', async () => {
    let innerMounts = 0
    let innerLive = 0
    function Inner() {
      useEffect(() => {
        innerMounts++
        innerLive++
        return () => {
          innerLive--
        }
      }, [])
      return (
        <div data-testid="inner">
          <Outlet />
        </div>
      )
    }
    const routes: RouteObject[] = [
      {
        path: '/',
        component: Layout,
        children: [
          {
            path: '/admin',
            component: Inner,
            children: [
              { path: '/admin/users', component: () => <Counter name="users" /> },
              { path: '/admin/roles', component: () => <Counter name="roles" /> },
            ],
          },
        ],
      },
    ]
    setPath('/admin/users')
    // include 只缓存 /admin/users；/admin/roles 是同一中间布局下的「非缓存」深层叶子
    const router = await mount(routes, { cache: { limit: 10, include: ['/admin/users'] } })
    expect(layoutLive).toBe(1)
    expect(innerLive).toBe(1)

    await nav(router, '/admin/roles')
    // 切到非缓存深层叶子：根布局与 admin 中间布局都不应被复制成两份
    expect(screen.getByTestId('roles-count')).toBeTruthy()
    expect(layoutLive).toBe(1)
    expect(layoutMounts).toBe(1)
    expect(innerLive).toBe(1)
    expect(innerMounts).toBe(1)

    // 回到缓存叶子，两层布局依旧单实例
    await nav(router, '/admin/users')
    expect(layoutLive).toBe(1)
    expect(innerLive).toBe(1)

    router.dispose()
  })
})
