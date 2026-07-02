import type { HashRouterInstance, RouteObject, RouterOptions } from '../types'
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useRouteTransition } from '../components/KeepAlive/hooks'
import { Outlet } from '../components/Outlet'
import { createHashRouter } from '../create-hash-router'
import { RouterProvider } from '../router'
import { readNavigationPosition } from '../utils/nav-direction'

/**
 * 导航方向感知在 hash 路由模式下同样成立——demo app（src/routes/index.tsx）用的正是 createHashRouter，
 * push 走 `location.hash =`、replace 走 `history.replaceState`，与 browser 模式的 pushState/replaceState
 * 底层机制不同，必须单独验证
 *
 * hash 独有的关键点：`location.hash =` 赋值会异步自触发一次 hashchange 回声，回声走完整的
 * popstate 流程——位点必须在回声处理后仍保留在条目上（随 replaceURL 原子写回），
 * 否则所有 push 过的条目失点，浏览器前进 / 后退方向全部退化为 replace（曾在真实 Chromium 中复现）
 *
 * 「浏览器原生后退」场景未在此文件覆盖：jsdom 对 hash 条目的 state 保存并非 spec-compliant
 * （navigateToFragment 自注 "NOT a spec-compliant implementation"），back() 恢复的条目 state 会丢失。
 * 位点比较逻辑本身与适配器无关，由 route-transition-direction.test.tsx（browser 模式）验证；
 * 此处补足 hash 特有的「回声后位点仍在」这一环
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

const ROUTES: RouteObject[] = [
  { path: '/a', component: PageA },
  { path: '/b', component: PageB },
]

const TRANSITION_OPTS: RouterOptions = {
  cache: { limit: 10 },
  transition: { exitTimeout: 5000, enterTimeout: 5000 },
}

function setHash(pathname: string) {
  window.location.hash = pathname
}

async function mount(routes: RouteObject[], options?: RouterOptions): Promise<HashRouterInstance> {
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

async function nav(router: HashRouterInstance, path: string, opts?: { replace?: boolean }) {
  await act(async () => {
    router.navigate(path, opts)
    await Promise.resolve()
  })
}

/** 排空 `location.hash =` 异步派发的 hashchange 回声（jsdom 需两轮宏任务） */
async function drainHashEcho() {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0))
    await new Promise(resolve => setTimeout(resolve, 0))
  })
}

describe('导航方向感知（hash 路由）：forward / replace / 回声不失点', () => {
  beforeEach(() => {
    setHash('/a')
  })

  afterEach(async () => {
    cleanup()
    // 不排空会残留回声到下一个用例、与共享的 window.history 产生串扰
    await drainHashEcho()
  })

  it('push（location.hash 赋值）：记为 forward，且自身触发的 hashchange 回声不会把方向冲回 replace', async () => {
    const router = await mount(ROUTES, TRANSITION_OPTS)

    await nav(router, '/b')

    expect(router.navigationDirection).toBe('forward')
    expect(screen.getByTestId('b-direction').textContent).toBe('forward')

    router.dispose()
  })

  it('push 回声处理完毕后，条目位点仍保留（不被回声流程的 replaceURL 抹掉）', async () => {
    const router = await mount(ROUTES, TRANSITION_OPTS)

    await nav(router, '/b')
    await drainHashEcho()

    // 回声走 popstate 流程时 replaceURL 会整体覆写 state——位点必须随之原子写回
    expect(readNavigationPosition()).toBeTypeOf('number')
    expect(router.navigationDirection).toBe('forward')

    router.dispose()
  })

  it('replace（{ replace: true }）：记为 replace', async () => {
    const router = await mount(ROUTES, TRANSITION_OPTS)

    await nav(router, '/b', { replace: true })

    expect(router.navigationDirection).toBe('replace')
    expect(screen.getByTestId('b-direction').textContent).toBe('replace')

    router.dispose()
  })
})
