import type { BrowserRouterInstance, RouteObject, RouterOptions } from '../types'
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useRouteTransition } from '../components/KeepAlive/hooks'
import { Outlet } from '../components/Outlet'
import { createBrowserRouter } from '../create-browser-router'
import { RouterProvider } from '../router'

/**
 * 路由级过渡粒度：RouteObject.transition 覆盖全局
 * - false：单独关闭该路由的过渡（useRouteTransition 返回 null，立即切换）
 * - 对象：与全局字段级合并；全局未配置时也可单路由开启
 */

function Page({ name }: { name: string }) {
  const transition = useRouteTransition()
  return (
    <div data-testid={`page-${name}`}>
      <span data-testid={`${name}-phase`}>{transition?.phase ?? 'none'}</span>
    </div>
  )
}

const PageA = () => <Page name="a" />
const PageB = () => <Page name="b" />

function setPath(pathname: string) {
  window.history.replaceState(null, '', pathname)
}

async function mount(routes: RouteObject[], options?: RouterOptions): Promise<BrowserRouterInstance> {
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

describe('路由级过渡配置', () => {
  beforeEach(() => {
    setPath('/a')
  })

  afterEach(() => {
    cleanup()
  })

  it('transition: false 单独关闭该路由：useRouteTransition 为 null，其余路由沿用全局', async () => {
    const routes: RouteObject[] = [
      { path: '/a', component: PageA },
      { path: '/b', component: PageB, transition: false },
    ]
    const router = await mount(routes, {
      cache: { limit: 10 },
      transition: { exitTimeout: 5000, enterTimeout: 5000 },
    })

    // /a 沿用全局：初始进场处于 entering 窗口
    expect(screen.getByTestId('a-phase').textContent).toBe('entering')

    await nav(router, '/b')
    // /b 显式关闭：无过渡上下文，立即稳定展示
    expect(screen.getByTestId('b-phase').textContent).toBe('none')

    router.dispose()
  })

  it('全局未配置时，路由级配置可单独开启过渡', async () => {
    const routes: RouteObject[] = [
      { path: '/a', component: PageA },
      { path: '/b', component: PageB, transition: { enterTimeout: 5000, exitTimeout: 5000 } },
    ]
    const router = await mount(routes, { cache: { limit: 10 } })

    // /a 无任何过渡配置
    expect(screen.getByTestId('a-phase').textContent).toBe('none')

    await nav(router, '/b')
    // /b 单独开启：进入 entering 窗口
    expect(screen.getByTestId('b-phase').textContent).toBe('entering')

    router.dispose()
  })

  it('离开「关闭过渡的路由」进入「开启过渡的路由」：进场动画正常', async () => {
    const routes: RouteObject[] = [
      { path: '/a', component: PageA, transition: false },
      { path: '/b', component: PageB },
    ]
    const router = await mount(routes, {
      cache: { limit: 10 },
      transition: { exitTimeout: 5000, enterTimeout: 5000 },
    })

    expect(screen.getByTestId('a-phase').textContent).toBe('none')

    await nav(router, '/b')
    expect(screen.getByTestId('b-phase').textContent).toBe('entering')

    router.dispose()
  })
})
