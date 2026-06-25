import type { RouteObject } from '../types'
import { act, cleanup, render, screen } from '@testing-library/react'
import { useEffect, useState } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Outlet } from '../components/Outlet'
import { createBrowserRouter } from '../create-browser-router'
import { useLocation } from '../hooks/use-location'
import { useParams } from '../hooks/use-params'
import { RouterProvider } from '../router'

/**
 * keep-alive 引擎缺陷回归集
 *
 * 锁定多角度 bug 排查中确认的真实缺陷的修复：
 * - clearCache / deleteCache 当前页白屏（Critical）
 * - 静态 / 动态壳撞键渲染错组件
 * - 被缓存壳参数过期（普通参数 + 通配 splat）
 * - 参数壳过度保活、忽略 include / exclude
 * - 壳被同级叶子挤出 LRU
 * - 404 泄漏上一棵子树
 */

let mountCounts: Record<string, number> = {}

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

function Layout() {
  return (
    <div data-testid="layout">
      <Outlet />
    </div>
  )
}

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

describe('keep-alive 缺陷回归', () => {
  beforeEach(() => {
    mountCounts = {}
  })
  afterEach(() => {
    cleanup()
  })

  it('clearCache 当前页不白屏，原地重新挂载（状态重置）', async () => {
    setPath('/a')
    const router = await mount([
      { path: '/', component: Layout, children: [{ path: '/a', component: () => <Counter name="a" /> }] },
    ])
    expect(screen.getByTestId('a-count')).toBeTruthy()
    expect(mountCounts.a).toBe(1)

    await act(async () => {
      router.clearCache()
    })

    // 修复前：白屏（queryByTestId('a-count') === null，直到切到别的路由再回来才恢复）
    expect(screen.queryByTestId('a-count')).not.toBeNull()
    expect(mountCounts.a).toBe(2) // 原地重新挂载

    router.dispose()
  })

  it('deleteCache(当前叶子 key) 当前页不白屏，只重挂叶子不动壳', async () => {
    let layoutMounts = 0
    function TrackedLayout() {
      useEffect(() => {
        layoutMounts++
      }, [])
      return <div data-testid="layout"><Outlet /></div>
    }
    setPath('/a')
    const router = await mount([
      { path: '/', component: TrackedLayout, children: [{ path: '/a', component: () => <Counter name="a" /> }] },
    ])
    expect(mountCounts.a).toBe(1)
    expect(layoutMounts).toBe(1)

    await act(async () => {
      router.deleteCache('/a')
    })

    expect(screen.queryByTestId('a-count')).not.toBeNull()
    expect(mountCounts.a).toBe(2) // 叶子重挂
    expect(layoutMounts).toBe(1) // 壳不受影响

    router.dispose()
  })

  it('静态壳与动态壳同级不撞键，渲染正确组件', async () => {
    const StaticShell = () => <div data-testid="static-shell"><Outlet /></div>
    const DynShell = () => <div data-testid="dyn-shell"><Outlet /></div>
    const routes: RouteObject[] = [
      { path: '/settings', component: StaticShell, children: [{ path: '/settings/general', component: () => <div data-testid="leaf-general">G</div> }] },
      { path: '/:tab', component: DynShell, children: [{ path: '/:tab/sub', component: () => <div data-testid="leaf-sub">S</div> }] },
    ]
    setPath('/settings/general')
    const router = await mount(routes)
    expect(screen.getByTestId('leaf-general')).toBeTruthy()

    // /settings/sub 实际匹配 /:tab（tab=settings）；修复前 fillPath('/:tab',{tab})='/settings' 撞静态壳缓存
    await nav(router, '/settings/sub')
    expect(screen.getByTestId('dyn-shell')).toBeTruthy()
    expect(screen.getByTestId('leaf-sub')).toBeTruthy()

    router.dispose()
  })

  it('被缓存壳的参数跟随导航刷新（普通参数不再过期）', async () => {
    function Dash() {
      const { params } = useParams()
      return (
        <div>
          <span data-testid="dash-id">{String(params.id)}</span>
          <Outlet />
        </div>
      )
    }
    const routes: RouteObject[] = [
      { path: '/dash', component: Dash, children: [{ path: '/dash/:id', component: () => <div data-testid="leaf">leaf</div> }] },
    ]
    setPath('/dash/1')
    const router = await mount(routes)
    expect(screen.getByTestId('dash-id').textContent).toBe('1')

    await nav(router, '/dash/2')
    // 修复前：壳冻结，仍显示 '1'
    expect(screen.getByTestId('dash-id').textContent).toBe('2')

    router.dispose()
  })

  it('通配壳的 splat 跟随导航刷新（不再冻结）', async () => {
    function FileShell() {
      const { params } = useParams()
      const splat = Array.isArray(params.splat)
        ? params.splat.join('/')
        : params.splat
      return (
        <div>
          <span data-testid="splat">{String(splat)}</span>
          <Outlet />
        </div>
      )
    }
    const routes: RouteObject[] = [
      { path: '/files/**', component: FileShell, children: [{ path: '/files/**', component: () => <div data-testid="fv">v</div> }] },
    ]
    setPath('/files/a/b')
    const router = await mount(routes)
    expect(screen.getByTestId('splat').textContent).toBe('a/b')

    await nav(router, '/files/x/y/z')
    // 修复前：fillPath 不替换 **，键坍塌为 '/files/**'，splat 冻结在 'a/b'
    expect(screen.getByTestId('splat').textContent).toBe('x/y/z')

    router.dispose()
  })

  it('参数壳收敛为单实例，即使 exclude 命中也不复制成多份', async () => {
    let shellLive = 0
    let shellMounts = 0
    function Shell() {
      useEffect(() => {
        shellMounts++
        shellLive++
        return () => {
          shellLive--
        }
      }, [])
      return <div><Outlet /></div>
    }
    const routes: RouteObject[] = [
      { path: '/users/:id', component: Shell, children: [{ path: '/users/:id/profile', component: () => <div data-testid="p">p</div> }] },
    ]
    setPath('/users/1/profile')
    const router = await mount(routes, { cache: { limit: 10, exclude: [/^\/users\/\d+/] } })
    expect(shellLive).toBe(1)

    await nav(router, '/users/2/profile')
    await nav(router, '/users/3/profile')
    await nav(router, '/users/4/profile')
    await nav(router, '/users/5/profile')

    // 修复前：shellLive=5（每个 id 一份，全在后台跑副作用，exclude 被无视）
    expect(shellLive).toBe(1)
    expect(shellMounts).toBe(1)

    router.dispose()
  })

  it('include:[]（cache nothing）下参数壳仍为单实例', async () => {
    let shellLive = 0
    let shellMounts = 0
    function Shell() {
      useEffect(() => {
        shellMounts++
        shellLive++
        return () => {
          shellLive--
        }
      }, [])
      return <div><Outlet /></div>
    }
    const routes: RouteObject[] = [
      { path: '/:section', component: Shell, children: [{ path: '/:section/x', component: () => <div data-testid="x">x</div> }] },
    ]
    setPath('/a/x')
    const router = await mount(routes, { cache: { limit: 10, include: [] } })
    expect(shellLive).toBe(1)

    await nav(router, '/b/x')
    await nav(router, '/c/x')

    // 修复前：shellLive=3（include:[] 对壳形同虚设）
    expect(shellLive).toBe(1)
    expect(shellMounts).toBe(1)

    router.dispose()
  })

  it('壳不被同级叶子的 LRU 淘汰（独立缓存空间）', async () => {
    let shellMounts = 0
    let shellLive = 0
    function Shell() {
      useEffect(() => {
        shellMounts++
        shellLive++
        return () => {
          shellLive--
        }
      }, [])
      return <div data-testid="shell"><Outlet /></div>
    }
    const routes: RouteObject[] = [
      { path: '/grp', component: Shell, children: [{ path: '/grp/inner', component: () => <div data-testid="inner">inner</div> }] },
      { path: '/l1', component: () => <div data-testid="l1">l1</div> },
      { path: '/l2', component: () => <div data-testid="l2">l2</div> },
    ]
    setPath('/grp/inner')
    const router = await mount(routes, { cache: { limit: 2 } })
    expect(shellMounts).toBe(1)

    await nav(router, '/l1')
    await nav(router, '/l2')
    await nav(router, '/grp/inner')

    // 修复前：limit:2 下壳 '/grp' 与叶子 '/l1','/l2' 共用一个 LRU，壳被挤出后重挂 → shellMounts=2
    expect(shellMounts).toBe(1)
    expect(shellLive).toBe(1)

    router.dispose()
  })

  it('同级两个壳各自单实例，来回切换保留', async () => {
    let aLive = 0
    let aMounts = 0
    function ShellA() {
      useEffect(() => {
        aMounts++
        aLive++
        return () => {
          aLive--
        }
      }, [])
      return <div data-testid="sa"><Outlet /></div>
    }
    const ShellB = () => <div data-testid="sb"><Outlet /></div>
    const routes: RouteObject[] = [
      { path: '/a', component: ShellA, children: [{ path: '/a/x', component: () => <div data-testid="ax">ax</div> }] },
      { path: '/b', component: ShellB, children: [{ path: '/b/y', component: () => <div data-testid="by">by</div> }] },
    ]
    setPath('/a/x')
    const router = await mount(routes, { cache: { limit: 1 } })
    expect(aLive).toBe(1)
    expect(aMounts).toBe(1)

    await nav(router, '/b/y')
    // 修复前：limit:1 下壳互相淘汰，ShellA live=0
    expect(aLive).toBe(1)

    await nav(router, '/a/x')
    expect(aMounts).toBe(1) // 修复前：2（重挂）

    router.dispose()
  })

  it('404 不泄漏上一棵子树，旧页副作用被清理', async () => {
    let layoutLive = 0
    function Lay() {
      useEffect(() => {
        layoutLive++
        return () => {
          layoutLive--
        }
      }, [])
      return <div data-testid="lay"><Outlet /></div>
    }
    const routes: RouteObject[] = [
      { path: '/', component: Lay, children: [{ path: '/cards', component: () => <div data-testid="c">c</div> }] },
    ]
    setPath('/cards')
    const router = await mount(routes, { cache: { limit: 10 }, notFoundComponent: () => <div data-testid="nf">NF</div> })
    expect(layoutLive).toBe(1)
    expect(screen.getByTestId('c')).toBeTruthy()

    await nav(router, '/zzz/nope')
    // 修复前：旧 Lay + cards 隐藏在 NotFound 之后仍 mounted（layoutLive 仍为 1，副作用继续跑）
    expect(screen.getByTestId('nf')).toBeTruthy()
    expect(layoutLive).toBe(0)
    expect(screen.queryByTestId('c')).toBeNull()

    // 返回缓存路由仍可用
    await nav(router, '/cards')
    expect(screen.getByTestId('c')).toBeTruthy()
    expect(layoutLive).toBe(1)

    router.dispose()
  })

  it('顶层叶子组件内误用 <Outlet/> 渲染为空，不无限递归', async () => {
    setPath('/solo')
    // 修复前：叶子的 <Outlet/> 继承父级候选 → 反复匹配同一叶子 → 堆栈溢出 / OOM
    const router = await mount([
      { path: '/solo', component: () => <div data-testid="solo">solo<Outlet /></div> },
    ])
    expect(screen.getByTestId('solo')).toBeTruthy()
    router.dispose()
  })

  it('壳下的叶子组件内误用 <Outlet/> 渲染为空，不无限递归', async () => {
    setPath('/page')
    const router = await mount([
      {
        path: '/',
        component: Layout,
        children: [
          { path: '/page', component: () => <div data-testid="page">page<Outlet /></div> },
        ],
      },
    ])
    expect(screen.getByTestId('page')).toBeTruthy()
    router.dispose()
  })

  it('壳的 useLocation({scope:cache}) 稳定代表自身层级，不跟随叶子', async () => {
    function Shell() {
      const loc = useLocation({ scope: 'cache' })
      return (
        <div>
          <span data-testid="shell-cache">{loc.pathname}</span>
          <Outlet />
        </div>
      )
    }
    const routes: RouteObject[] = [
      {
        path: '/',
        component: Shell,
        children: [
          { path: '/a', component: () => <div data-testid="a">a</div> },
          { path: '/b', component: () => <div data-testid="b">b</div> },
        ],
      },
    ]
    setPath('/a')
    const router = await mount(routes)
    expect(screen.getByTestId('shell-cache').textContent).toBe('/')

    await nav(router, '/b')
    // 修复前：壳的 cache location 被叶子覆盖 → 显示 '/b'
    expect(screen.getByTestId('shell-cache').textContent).toBe('/')

    router.dispose()
  })

  it('参数壳的 scope:cache 取自身已消费前缀，并随参数更新', async () => {
    function Shell() {
      const loc = useLocation({ scope: 'cache' })
      return (
        <div>
          <span data-testid="shell-cache">{loc.pathname}</span>
          <Outlet />
        </div>
      )
    }
    const routes: RouteObject[] = [
      {
        path: '/dash/:id',
        component: Shell,
        children: [
          { path: '/dash/:id/profile', component: () => <div data-testid="leaf">leaf</div> },
        ],
      },
    ]
    setPath('/dash/1/profile')
    const router = await mount(routes)
    // 自身消费前缀 '/dash/1'，而非叶子 '/dash/1/profile'
    expect(screen.getByTestId('shell-cache').textContent).toBe('/dash/1')

    await nav(router, '/dash/2/profile')
    expect(screen.getByTestId('shell-cache').textContent).toBe('/dash/2')

    router.dispose()
  })
})
