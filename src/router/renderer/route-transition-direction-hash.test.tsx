import type { RouteObject } from '../types'
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useRouteTransition } from '../components/KeepAlive/hooks'
import { Outlet } from '../components/Outlet'
import { createHashRouter } from '../create-hash-router'
import { RouterProvider } from '../router'

/**
 * 导航方向感知在 hash 路由模式下同样成立——demo app（src/routes/index.tsx）用的正是 createHashRouter，
 * push 走 `location.hash =`、replace 走 `history.replaceState`，与 browser 模式的 pushState/replaceState
 * 底层机制不同，必须单独验证位点打点逻辑不受影响
 *
 * 「浏览器原生后退」场景未在此文件覆盖：jsdom 对 `location.hash =` 产生的历史记录条目的
 * state 保存并非 spec-compliant（其 navigateToFragment 实现自己注明 "NOT a spec-compliant
 * implementation"），back() 恢复出的条目 state 会丢失，无法在 jsdom 里可靠复现真实浏览器行为。
 * 该场景已通过 route-transition-direction.test.tsx 里 createBrowserRouter（pushState，jsdom 下
 * 行为规范）的用例验证——核心的位点追踪 / markPopState 逻辑在 create-base-router.ts 中与 URL
 * 适配器无关、两种路由模式共用同一套实现，故那份验证同样覆盖了 hash 模式下的方向推导逻辑本身
 */

function Page({ name }: { name: string }) {
  const transition = useRouteTransition()
  return (
    <div data-testid={`page-${name}`}>
      <span data-testid={`${name}-direction`}>{transition?.direction ?? 'none'}</span>
    </div>
  )
}

const PageA = () => <Page name="a" />
const PageB = () => <Page name="b" />

function setHash(pathname: string) {
  window.location.hash = pathname
}

async function mount(routes: RouteObject[], options?: any) {
  const router = createHashRouter({ routes, options })
  await act(async () => {
    render(
      <RouterProvider router={router}>
        <Outlet />
      </RouterProvider>,
    )
  })
  return router
}

async function nav(router: any, path: string, opts?: { replace?: boolean }) {
  await act(async () => {
    router.navigate(path, opts)
    await Promise.resolve()
  })
}

describe('导航方向感知（hash 路由）：forward / replace', () => {
  beforeEach(() => {
    setHash('/a')
  })

  afterEach(async () => {
    cleanup()
    // location.hash 赋值会异步再触发一轮 hashchange 回声，不排空会残留到下一个用例、
    // 与其共享的 window.history 产生串扰（vitest 的 jsdom window 是整个文件共享的）
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
      await new Promise(resolve => setTimeout(resolve, 0))
    })
  })

  it('push（location.hash 赋值）：记为 forward，且自身触发的 hashchange 回声不会把方向冲回 replace', async () => {
    const routes: RouteObject[] = [
      { path: '/a', component: PageA },
      { path: '/b', component: PageB },
    ]
    const router = await mount(routes, {
      cache: { limit: 10 },
      transition: { exitTimeout: 5000, enterTimeout: 5000 },
    })

    await nav(router, '/b')

    expect(router.navigationDirection).toBe('forward')
    expect(screen.getByTestId('b-direction').textContent).toBe('forward')

    router.dispose()
  })

  it('replace（{ replace: true }）：记为 replace', async () => {
    const routes: RouteObject[] = [
      { path: '/a', component: PageA },
      { path: '/b', component: PageB },
    ]
    const router = await mount(routes, {
      cache: { limit: 10 },
      transition: { exitTimeout: 5000, enterTimeout: 5000 },
    })

    await nav(router, '/b', { replace: true })

    expect(router.navigationDirection).toBe('replace')
    expect(screen.getByTestId('b-direction').textContent).toBe('replace')

    router.dispose()
  })
})
