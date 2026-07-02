import type { BrowserRouterInstance, Middleware, RouteObject, RouterOptions } from '../types'
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useRouteTransition } from '../components/KeepAlive/hooks'
import { Outlet } from '../components/Outlet'
import { createBrowserRouter } from '../create-browser-router'
import { RouterProvider } from '../router'
import { readNavigationPosition } from '../utils/nav-direction'

/**
 * 导航方向感知：push（forward）/ replace / 浏览器原生前进后退（forward / back）
 * 与 keep-alive 缓存完全独立，验证 router.navigationDirection 与
 * useRouteTransition().direction 端到端一致
 *
 * 重点覆盖「位点随 URL 原子写入、被 pop 过的条目不失点」：
 * back → forward → back 这类多次往返序列曾因 replaceURL 抹掉位点而整体退化为 replace
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
const PageC = () => <Page name="c" />

const ROUTES: RouteObject[] = [
  { path: '/a', component: PageA },
  { path: '/b', component: PageB },
  { path: '/c', component: PageC },
]

const TRANSITION_OPTS: RouterOptions = {
  cache: { limit: 10 },
  transition: { exitTimeout: 5000, enterTimeout: 5000 },
}

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

async function nav(router: BrowserRouterInstance, path: string, opts?: { replace?: boolean }) {
  await act(async () => {
    router.navigate(path, opts)
    await Promise.resolve()
  })
}

/**
 * jsdom 的历史前进 / 后退内部排了两层 setTimeout(0) 的宏任务队列才真正落地并派发 popstate，
 * 少等一轮 location/state 还是旧值（实测必须两轮，一轮不够）
 */
async function traverse(delta: number) {
  await act(async () => {
    window.history.go(delta)
    await new Promise(resolve => setTimeout(resolve, 0))
    await new Promise(resolve => setTimeout(resolve, 0))
    await Promise.resolve()
  })
}

const goBack = () => traverse(-1)
const goForward = () => traverse(1)

describe('导航方向感知：forward / back / replace', () => {
  beforeEach(() => {
    setPath('/a')
  })

  afterEach(() => {
    cleanup()
  })

  it('router.navigate（push）：router.navigationDirection 与两端过渡状态均记为 forward', async () => {
    const router = await mount(ROUTES, TRANSITION_OPTS)

    await nav(router, '/b')

    expect(router.navigationDirection).toBe('forward')
    expect(screen.getByTestId('a-direction').textContent).toBe('forward')
    expect(screen.getByTestId('b-direction').textContent).toBe('forward')

    router.dispose()
  })

  it('router.navigate(path, { replace: true })：记为 replace', async () => {
    const router = await mount(ROUTES, TRANSITION_OPTS)

    await nav(router, '/b', { replace: true })

    expect(router.navigationDirection).toBe('replace')
    expect(screen.getByTestId('b-direction').textContent).toBe('replace')

    router.dispose()
  })

  it('浏览器原生后退（history.back）：记为 back，且被 pop 到的条目位点保留（随 URL 原子写回）', async () => {
    const router = await mount(ROUTES, TRANSITION_OPTS)

    await nav(router, '/b')
    expect(router.navigationDirection).toBe('forward')

    await goBack()

    expect(router.navigationDirection).toBe('back')
    expect(screen.getByTestId('a-direction').textContent).toBe('back')
    // 位点没有被 popstate 流程抹掉——这是 back → forward → back 能持续正确的前提
    expect(readNavigationPosition()).toBe(0)

    router.dispose()
  })

  it('back → forward → back：被 pop 过的条目再次往返，方向持续正确', async () => {
    const router = await mount(ROUTES, TRANSITION_OPTS)

    await nav(router, '/b')
    await nav(router, '/c')

    await goBack()
    expect(router.navigationDirection).toBe('back')

    await goForward()
    expect(router.navigationDirection).toBe('forward')

    await goBack()
    expect(router.navigationDirection).toBe('back')

    router.dispose()
  })

  it('连续 push 两次后再后退两次：方向应始终正确（forward, forward, back, back）', async () => {
    const router = await mount(ROUTES, TRANSITION_OPTS)

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
    const router = await mount(ROUTES, { cache: { limit: 10 } })

    await nav(router, '/b')
    expect(router.navigationDirection).toBe('forward')
    expect(screen.getByTestId('b-direction').textContent).toBe('none')

    router.dispose()
  })
})

describe('重定向与方向 / 位点账本', () => {
  beforeEach(() => {
    setPath('/a')
  })

  afterEach(() => {
    cleanup()
  })

  it('push 中被守卫重定向：方向记 replace，但实际新增了条目 → 位点递增，随后真实后退不被误判为回声', async () => {
    const router = await mount(ROUTES, {
      ...TRANSITION_OPTS,
      beforeEach: (to, _from, next) => {
        if (to.to.pathname === '/c')
          next('/b')
        else
          next()
      },
    })

    await nav(router, '/c')
    // 重定向落地 /b，方向无「栈方向」语义
    expect(router.navigationDirection).toBe('replace')
    expect(screen.getByTestId('page-b')).toBeTruthy()
    // 实际执行的是 push（新增条目），位点必须与 /a 不同
    expect(readNavigationPosition()).toBe(1)

    await goBack()
    // 相邻条目位点不同，真实后退不会被「回声」分支吞掉
    expect(router.navigationDirection).toBe('back')

    router.dispose()
  })

  it('中间件 next(path) 字符串重定向：短路外层，URL 落在重定向目标且方向记 replace', async () => {
    const redirectMiddleware: Middleware = async (_ctx, next) => {
      await next('/b')
    }
    const routes: RouteObject[] = [
      { path: '/a', component: PageA },
      { path: '/b', component: PageB },
      { path: '/c', component: PageC, middlewares: [redirectMiddleware] },
    ]
    const router = await mount(routes, TRANSITION_OPTS)

    await nav(router, '/c')

    // 外层不得继续执行并把 URL 覆写回 /c
    expect(window.location.pathname).toBe('/b')
    expect(router.location.pathname).toBe('/b')
    expect(router.navigationDirection).toBe('replace')
    expect(screen.getByTestId('page-b')).toBeTruthy()

    router.dispose()
  })
})
