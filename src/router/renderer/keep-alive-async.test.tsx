import type { RouteObject } from '../types'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { lazy, useEffect, useState } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Outlet } from '../components/Outlet'
import { createBrowserRouter } from '../create-browser-router'
import { createHashRouter } from '../create-hash-router'
import { RouterProvider } from '../router'

/**
 * keep-alive 与异步 / 懒加载 / hash 路由 / 中间件重定向 / 全局布局的交互
 * 以及一处「固有限制」的文档化测试（隐藏页不卸载、副作用不清理）
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

describe('keep-alive 异步 / 懒加载 / hash / 中间件 / 布局', () => {
  beforeEach(() => {
    layoutLive = 0
    setPath('/cards')
  })
  afterEach(() => {
    cleanup()
    window.location.hash = ''
  })

  it('懒加载叶子 keep-alive：离开再回来保留状态', async () => {
    const LazyLeaf = lazy(async () => ({ default: () => <Counter name="lazy" /> }))
    const routes: RouteObject[] = [
      {
        path: '/',
        component: Layout,
        children: [
          { path: '/lazy', component: LazyLeaf },
          { path: '/other', component: () => <div data-testid="other">other</div> },
        ],
      },
    ]
    setPath('/lazy')
    // 自定义 loadingComponent，避免默认骨架屏在 jsdom 调用 Web Animations API
    const router = await mount(routes, { cache: { limit: 10 }, loadingComponent: () => <div data-testid="loading">loading</div> })

    // 等待懒加载解析
    const counted = await screen.findByTestId('lazy-count')
    expect(counted.textContent).toBe('0')
    fireEvent.click(screen.getByTestId('lazy-inc'))
    expect(screen.getByTestId('lazy-count').textContent).toBe('1')

    await nav(router, '/other')
    await nav(router, '/lazy')
    // 已加载的懒组件被 keep-alive 保留，状态仍在
    expect(screen.getByTestId('lazy-count').textContent).toBe('1')

    router.dispose()
  })

  it('hash 路由下 keep-alive 正常（共享布局单实例、状态保留）', async () => {
    window.location.hash = '#/cards'
    const router = createHashRouter({ routes: sharedLayoutRoutes, options: { cache: { limit: 10 } } })
    await act(async () => {
      render(
        <RouterProvider router={router}>
          <Outlet />
        </RouterProvider>,
      )
    })
    expect(layoutLive).toBe(1)
    fireEvent.click(screen.getByTestId('cards-inc'))
    expect(screen.getByTestId('cards-count').textContent).toBe('1')

    await nav(router, '/settings')
    await nav(router, '/cards')
    expect(layoutLive).toBe(1)
    expect(screen.getByTestId('cards-count').textContent).toBe('1')

    router.dispose()
  })

  it('beforeEach 守卫重定向到已缓存页时保留其状态', async () => {
    const routes: RouteObject[] = [
      {
        path: '/',
        component: Layout,
        children: [
          { path: '/cards', component: () => <Counter name="cards" /> },
          { path: '/guarded', component: () => <div data-testid="g">g</div> },
        ],
      },
    ]
    setPath('/cards')
    const router = await mount(routes, {
      cache: { limit: 10 },
      beforeEach: (to: any, _from: any, next: any) => {
        // 守卫首参是导航上下文，目标位置在 to.to
        if (to.to.pathname === '/guarded')
          next('/cards')
        else
          next()
      },
    })
    fireEvent.click(screen.getByTestId('cards-inc'))
    expect(screen.getByTestId('cards-count').textContent).toBe('1')

    // 导航到受守卫路由 → 重定向回 /cards（重定向为嵌套异步，需多刷一拍）
    await act(async () => {
      router.navigate('/guarded')
      await new Promise(resolve => setTimeout(resolve, 0))
    })
    expect(screen.queryByTestId('g')).toBeNull() // 没停在 guarded
    expect(screen.getByTestId('cards-count').textContent).toBe('1') // 缓存的 cards 保留

    router.dispose()
  })

  it('options.layouts 全局布局 + keep-alive 共存，叶子状态保留', async () => {
    const AppLayout = ({ children }: { children: React.ReactNode }) => (
      <div data-testid="app-layout">{children}</div>
    )
    const routes: RouteObject[] = [
      { path: '/cards', component: () => <Counter name="cards" /> },
      { path: '/settings', component: () => <Counter name="settings" /> },
    ]
    setPath('/cards')
    const router = await mount(routes, { cache: { limit: 10 }, layouts: [{ component: AppLayout }] })
    expect(screen.getAllByTestId('app-layout').length).toBeGreaterThanOrEqual(1)
    fireEvent.click(screen.getByTestId('cards-inc'))
    expect(screen.getByTestId('cards-count').textContent).toBe('1')

    await nav(router, '/settings')
    await nav(router, '/cards')
    expect(screen.getByTestId('cards-count').textContent).toBe('1')

    router.dispose()
  })

  it('（固有限制）切走后隐藏的 keep-alive 页仍保持挂载、副作用不清理', async () => {
    let aLive = 0
    function PageA() {
      useEffect(() => {
        aLive++
        return () => {
          aLive--
        }
      }, [])
      return <div data-testid="a">a</div>
    }
    const routes: RouteObject[] = [
      { path: '/a', component: PageA },
      { path: '/b', component: () => <div data-testid="b">b</div> },
    ]
    setPath('/a')
    const router = await mount(routes, { cache: { limit: 10 } })
    expect(aLive).toBe(1)

    await nav(router, '/b')
    // 这是 Suspense 式 keep-alive 的固有取舍：隐藏页未卸载，effect（定时器 / 订阅）仍在运行
    // 这里固化该行为，避免日后误判为新 bug；真正暂停需 React Activity / Offscreen
    expect(aLive).toBe(1)
    expect(screen.getByTestId('a')).toBeTruthy()

    router.dispose()
  })
})
