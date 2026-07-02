import type { RouteObject } from '../types'
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useRouteTransition } from '../components/KeepAlive/hooks'
import { Outlet } from '../components/Outlet'
import { createBrowserRouter } from '../create-browser-router'
import { RouterProvider } from '../router'

/**
 * 导航方向感知：push（forward）/ replace / 浏览器原生后退（back）
 * 与 keep-alive 缓存完全独立，验证 router.navigationDirection 与
 * useRouteTransition().direction 端到端一致
 */

function Page({ name }: { name: string }) {
  const transition = useRouteTransition()
  return (
    <div data-testid={`page-${name}`}>
      <span data-testid={`${name}-phase`}>{transition?.phase ?? 'none'}</span>
      <span data-testid={`${name}-direction`}>{transition?.direction ?? 'none'}</span>
    </div>
  )
}

const PageA = () => <Page name="a" />
const PageB = () => <Page name="b" />

function setPath(pathname: string) {
  window.history.replaceState(null, '', pathname)
}

async function mount(routes: RouteObject[], options?: any) {
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

async function nav(router: any, path: string, opts?: { replace?: boolean }) {
  await act(async () => {
    router.navigate(path, opts)
    await Promise.resolve()
  })
}

async function goBack() {
  await act(async () => {
    window.history.back()
    // jsdom 的历史回退内部排了两层 setTimeout(0) 的宏任务队列才真正落地并派发 popstate，
    // 少等一轮 location/state 还是旧值（实测必须两轮，一轮不够）
    await new Promise(resolve => setTimeout(resolve, 0))
    await new Promise(resolve => setTimeout(resolve, 0))
    await Promise.resolve()
  })
}

describe('导航方向感知：forward / back / replace', () => {
  beforeEach(() => {
    setPath('/a')
  })

  afterEach(() => {
    cleanup()
  })

  it('router.navigate（push）：router.navigationDirection 与两端过渡状态均记为 forward', async () => {
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
    expect(screen.getByTestId('a-direction').textContent).toBe('forward')
    expect(screen.getByTestId('b-direction').textContent).toBe('forward')

    router.dispose()
  })

  it('router.navigate(path, { replace: true })：记为 replace', async () => {
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

  it('浏览器原生后退（history.back）：记为 back', async () => {
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

    await goBack()

    expect(router.navigationDirection).toBe('back')
    expect(screen.getByTestId('a-direction').textContent).toBe('back')

    router.dispose()
  })

  it('连续 push 两次后再后退两次：方向应始终正确（forward, forward, back, back）', async () => {
    const PageC = () => <Page name="c" />
    const routes: RouteObject[] = [
      { path: '/a', component: PageA },
      { path: '/b', component: PageB },
      { path: '/c', component: PageC },
    ]
    const router = await mount(routes, {
      cache: { limit: 10 },
      transition: { exitTimeout: 5000, enterTimeout: 5000 },
    })

    await nav(router, '/b')
    expect(router.navigationDirection).toBe('forward')

    await nav(router, '/c')
    expect(router.navigationDirection).toBe('forward')

    await goBack()
    expect(router.navigationDirection).toBe('back')

    await goBack()
    expect(router.navigationDirection).toBe('back')

    router.dispose()
  })

  it('未配置 transition 时 direction 计算逻辑不受影响（router.navigationDirection 仍正确），但 useRouteTransition 为 null', async () => {
    const routes: RouteObject[] = [
      { path: '/a', component: PageA },
      { path: '/b', component: PageB },
    ]
    const router = await mount(routes, { cache: { limit: 10 } })

    await nav(router, '/b')
    expect(router.navigationDirection).toBe('forward')
    expect(screen.getByTestId('b-direction').textContent).toBe('none')

    router.dispose()
  })
})
