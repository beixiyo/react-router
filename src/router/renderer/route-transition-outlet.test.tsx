import type { RouteObject } from '../types'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useRouteTransition } from '../components/KeepAlive/hooks'
import { Outlet } from '../components/Outlet'
import { createBrowserRouter } from '../create-browser-router'
import { RouterProvider } from '../router'

/**
 * 路由过渡：与 keep-alive 缓存完全独立
 * - 已缓存路由：切走后旧页仍保留挂载播放退场动画，finishExit 后隐藏但实例保活（可复用）
 * - 未缓存路由：同样有退场窗口，但退场完成后彻底卸载（未缓存语义不变）
 * - 未配置 options.transition：行为与接入前完全一致（立即切换，零开销）
 */

let mountCounts: Record<string, number> = {}
let unmountCounts: Record<string, number> = {}

function Page({ name }: { name: string }) {
  const transition = useRouteTransition()

  useEffect(() => {
    mountCounts[name] = (mountCounts[name] ?? 0) + 1
    return () => {
      unmountCounts[name] = (unmountCounts[name] ?? 0) + 1
    }
  }, [name])

  return (
    <div data-testid={`page-${name}`}>
      <span data-testid={`${name}-phase`}>{transition?.phase ?? 'none'}</span>
      <button type="button" data-testid={`${name}-finish-exit`} onClick={() => transition?.finishExit()}>
        finish-exit
      </button>
    </div>
  )
}

const PageA = () => <Page name="a" />
const PageB = () => <Page name="b" />

function setPath(pathname: string) {
  window.history.pushState(null, '', pathname)
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

async function nav(router: any, path: string) {
  await act(async () => {
    router.navigate(path)
    await Promise.resolve()
  })
}

/**
 * 已缓存的失活页并不会被移出 DOM，而是被 React 内部的 Suspense 挂起机制
 * 以 display:none 隐藏（这正是 keep-alive 得以保留状态的底层原理）
 */
function isHidden(el: HTMLElement) {
  return el.style.display === 'none'
}

describe('路由过渡：缓存无关的退场窗口', () => {
  beforeEach(() => {
    mountCounts = {}
    unmountCounts = {}
    setPath('/a')
  })

  afterEach(() => {
    cleanup()
  })

  it('已缓存路由：切走后旧页仍保留挂载（exiting），finishExit 后隐藏但实例仍保活', async () => {
    const routes: RouteObject[] = [
      { path: '/a', component: PageA },
      { path: '/b', component: PageB },
    ]
    const router = await mount(routes, {
      cache: { limit: 10 },
      transition: { exitTimeout: 5000, enterTimeout: 5000 },
    })

    expect(screen.getByTestId('page-a')).toBeTruthy()

    await nav(router, '/b')
    // 退场窗口内：a、b 应同时可见（crossfade 前提），a 尚未被挂起隐藏
    expect(isHidden(screen.getByTestId('page-a'))).toBe(false)
    expect(screen.getByTestId('a-phase').textContent).toBe('exiting')
    expect(isHidden(screen.getByTestId('page-b'))).toBe(false)
    expect(screen.getByTestId('b-phase').textContent).toBe('entering')

    await act(async () => {
      fireEvent.click(screen.getByTestId('a-finish-exit'))
    })
    // 缓存路由：退场完成后被挂起隐藏（display:none），而非移出 DOM——实例仍保活
    expect(isHidden(screen.getByTestId('page-a'))).toBe(true)

    // 回到 /a：缓存路由，实例应被复用（不重新挂载）
    await nav(router, '/a')
    expect(mountCounts.a).toBe(1)

    router.dispose()
  })

  it('未缓存路由：同样有退场窗口，退场完成后彻底卸载（未缓存语义不变）', async () => {
    const routes: RouteObject[] = [
      { path: '/a', component: PageA },
      { path: '/b', component: PageB },
    ]
    const router = await mount(routes, {
      cache: { limit: 10, exclude: ['/b'] },
      transition: { exitTimeout: 5000, enterTimeout: 5000 },
    })

    await nav(router, '/b')
    expect(mountCounts.b).toBe(1)

    await nav(router, '/a')
    // /b 未缓存：退场窗口内仍应短暂可见
    expect(isHidden(screen.getByTestId('page-b'))).toBe(false)
    expect(screen.getByTestId('b-phase').textContent).toBe('exiting')

    await act(async () => {
      fireEvent.click(screen.getByTestId('b-finish-exit'))
    })
    expect(screen.queryByTestId('page-b')).toBeNull()
    expect(unmountCounts.b).toBe(1)

    // 再次进入 /b：未缓存 → 全新实例
    await nav(router, '/b')
    expect(mountCounts.b).toBe(2)

    router.dispose()
  })

  it('未缓存路由的退场超时兜底：不调用 finishExit，超时后自动彻底卸载', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const routes: RouteObject[] = [
      { path: '/a', component: PageA },
      { path: '/b', component: PageB },
    ]
    const router = await mount(routes, {
      cache: { limit: 10, exclude: ['/b'] },
      transition: { exitTimeout: 300 },
    })

    await nav(router, '/b')
    await nav(router, '/a')
    expect(screen.getByTestId('page-b')).toBeTruthy()

    await act(async () => {
      vi.advanceTimersByTime(300)
    })
    expect(screen.queryByTestId('page-b')).toBeNull()
    expect(unmountCounts.b).toBe(1)

    router.dispose()
    vi.useRealTimers()
  })

  it('未配置 transition 时行为不变：立即切换，不会同时挂载两个页面', async () => {
    const routes: RouteObject[] = [
      { path: '/a', component: PageA },
      { path: '/b', component: PageB },
    ]
    const router = await mount(routes, { cache: { limit: 10 } })

    await nav(router, '/b')
    // 未接入过渡：立即被挂起隐藏，没有中间的「双页同时可见」窗口
    expect(isHidden(screen.getByTestId('page-a'))).toBe(true)
    expect(isHidden(screen.getByTestId('page-b'))).toBe(false)

    router.dispose()
  })
})
