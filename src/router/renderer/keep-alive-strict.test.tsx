import type { RouteObject } from '../types'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { StrictMode, useEffect, useState } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Outlet } from '../components/Outlet'
import { createBrowserRouter } from '../create-browser-router'
import { RouterProvider } from '../router'

/**
 * StrictMode 下的 keep-alive 行为
 *
 * StrictMode 会刻意双调用 render 与 effect（mount→cleanup→mount）以暴露非幂等副作用。
 * 本引擎在「渲染体」里写缓存（Map 变更），需保证幂等：双调用不产生重复实例 / 多余淘汰。
 * 因此断言一律用「live 平衡计数」与「DOM 节点数」，而非易受双调用影响的累计挂载数。
 */

let layoutLive = 0

function Layout() {
  useEffect(() => {
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

function Counter({ name }: { name: string }) {
  const [n, setN] = useState(0)
  return (
    <div>
      <span data-testid={`${name}-count`}>{n}</span>
      <button type="button" data-testid={`${name}-inc`} onClick={() => setN(v => v + 1)}>inc</button>
    </div>
  )
}

const sharedLayoutRoutes: RouteObject[] = [
  {
    path: '/',
    component: Layout,
    children: [
      { path: '/cards', component: () => <Counter name="cards" /> },
      { path: '/settings', component: () => <Counter name="settings" /> },
    ],
  },
]

function setPath(pathname: string) {
  window.history.pushState(null, '', pathname)
}

async function mountStrict(routes: RouteObject[], options?: any) {
  const router = createBrowserRouter({ routes, options: { cache: { limit: 10 }, ...options } })
  await act(async () => {
    render(
      <StrictMode>
        <RouterProvider router={router}>
          <Outlet />
        </RouterProvider>
      </StrictMode>,
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

describe('keep-alive 在 StrictMode 下', () => {
  beforeEach(() => {
    layoutLive = 0
    setPath('/cards')
  })
  afterEach(() => {
    cleanup()
  })

  it('共享父布局保持单实例（无重复挂载）', async () => {
    const router = await mountStrict(sharedLayoutRoutes)
    expect(layoutLive).toBe(1)
    expect(screen.getAllByTestId('layout')).toHaveLength(1)

    await nav(router, '/settings')
    await nav(router, '/cards')
    expect(layoutLive).toBe(1)
    expect(screen.getAllByTestId('layout')).toHaveLength(1)

    router.dispose()
  })

  it('叶子状态离开再回来仍保留', async () => {
    const router = await mountStrict(sharedLayoutRoutes)
    fireEvent.click(screen.getByTestId('cards-inc'))
    fireEvent.click(screen.getByTestId('cards-inc'))
    expect(screen.getByTestId('cards-count').textContent).toBe('2')

    await nav(router, '/settings')
    await nav(router, '/cards')
    expect(screen.getByTestId('cards-count').textContent).toBe('2')

    router.dispose()
  })

  it('clearCache 当前页不白屏', async () => {
    const router = await mountStrict(sharedLayoutRoutes)
    expect(screen.queryByTestId('cards-count')).not.toBeNull()

    await act(async () => {
      router.clearCache()
    })
    expect(screen.queryByTestId('cards-count')).not.toBeNull()

    router.dispose()
  })

  it('参数壳收敛为单实例', async () => {
    let shellLive = 0
    function Shell() {
      useEffect(() => {
        shellLive++
        return () => {
          shellLive--
        }
      }, [])
      return <div data-testid="shell"><Outlet /></div>
    }
    const routes: RouteObject[] = [
      { path: '/users/:id', component: Shell, children: [{ path: '/users/:id/p', component: () => <div data-testid="p">p</div> }] },
    ]
    setPath('/users/1/p')
    const router = await mountStrict(routes)
    expect(shellLive).toBe(1)

    await nav(router, '/users/2/p')
    await nav(router, '/users/3/p')
    expect(shellLive).toBe(1)
    expect(screen.getAllByTestId('shell')).toHaveLength(1)

    router.dispose()
  })

  it('LRU 淘汰数正确，双调用不产生多余实例', async () => {
    const live: Record<string, number> = {}
    function Leaf({ name }: { name: string }) {
      useEffect(() => {
        live[name] = (live[name] ?? 0) + 1
        return () => {
          live[name]--
        }
      }, [name])
      return <div data-testid={name}>{name}</div>
    }
    const routes: RouteObject[] = [
      { path: '/x', component: () => <Leaf name="x" /> },
      { path: '/y', component: () => <Leaf name="y" /> },
      { path: '/z', component: () => <Leaf name="z" /> },
    ]
    setPath('/x')
    const router = await mountStrict(routes, { cache: { limit: 2 } })

    await nav(router, '/y')
    await nav(router, '/z') // limit 2 → 淘汰最久未用的 x

    expect(live.x).toBe(0) // x 卸载，live 平衡归零（无残留实例）
    expect(live.y).toBe(1)
    expect(live.z).toBe(1)

    router.dispose()
  })
})
