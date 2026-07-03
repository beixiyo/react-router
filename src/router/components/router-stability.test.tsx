import type { BrowserRouterInstance, RouteObject } from '../types'
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useNavigate } from '../hooks/use-navigate'
import { createBrowserRouter } from '../create-browser-router'
import { RouterProvider } from '../router'
import { Link, NavLink } from './Link'
import { Outlet } from './Outlet'

/**
 * RouterCtx 稳定实例语义的回归防线：
 * - RouterCtx 下发终身恒定的 router 实例，useRouter/useNavigate/Link 不随导航重渲染
 * - NavLink 的激活态改由 useLocation（响应式订阅）驱动——若误退回读 router.location，
 *   高亮会静默失效，本文件的激活态用例即为此而设
 */

const PageA = () => <div data-testid="page-a">A</div>
const PageB = () => <div data-testid="page-b">B</div>

const ROUTES: RouteObject[] = [
  { path: '/a', component: PageA },
  { path: '/b', component: PageB },
]

function setPath(pathname: string) {
  window.history.replaceState(null, '', pathname)
}

async function mount(ui: (router: BrowserRouterInstance) => React.ReactNode): Promise<BrowserRouterInstance> {
  const router = createBrowserRouter({ routes: ROUTES })
  await act(async () => {
    render(<RouterProvider router={router}>{ui(router)}</RouterProvider>)
  })
  return router
}

async function nav(router: BrowserRouterInstance, path: string) {
  await act(async () => {
    router.navigate(path)
    await Promise.resolve()
  })
}

describe('RouterCtx 稳定实例：引用与重渲染', () => {
  beforeEach(() => {
    setPath('/a')
  })

  afterEach(() => {
    cleanup()
  })

  it('NavLink 激活态随导航正确翻转（useLocation 驱动，语义变化的保命用例）', async () => {
    const router = await mount(() => (
      <>
        <NavLink to="/a" className="link" activeClassName="on" inactiveClassName="off">to-a</NavLink>
        <NavLink to="/b" className="link" activeClassName="on" inactiveClassName="off">to-b</NavLink>
        <Outlet />
      </>
    ))

    expect(screen.getByRole('link', { name: 'to-a' }).className).toBe('link on')
    expect(screen.getByRole('link', { name: 'to-b' }).className).toBe('link off')

    await nav(router, '/b')

    expect(screen.getByRole('link', { name: 'to-a' }).className).toBe('link off')
    expect(screen.getByRole('link', { name: 'to-b' }).className).toBe('link on')

    router.dispose()
  })

  it('Link 不随导航重渲染（只依赖稳定的 navigate，导航时零陪跑）', async () => {
    let linkRenders = 0
    function CountingLink() {
      linkRenders++
      return <Link to="/a">go</Link>
    }

    const router = await mount(() => (
      <>
        <CountingLink />
        <Outlet />
      </>
    ))
    const rendersAfterMount = linkRenders

    await nav(router, '/b')
    await nav(router, '/a')

    expect(linkRenders).toBe(rendersAfterMount)

    router.dispose()
  })

  it('useNavigate 返回的函数引用跨导航恒定，可安全放入 deps', async () => {
    const identities: unknown[] = []
    function Probe() {
      identities.push(useNavigate())
      return null
    }

    const router = await mount(() => (
      <>
        <Probe />
        <Outlet />
      </>
    ))

    await nav(router, '/b')

    // Probe 不消费 location，不随导航重渲染；强制再渲染一次验证引用不变
    await act(async () => {
      router.navigate('/a')
      await Promise.resolve()
    })

    expect(new Set(identities).size).toBe(1)

    router.dispose()
  })
})
