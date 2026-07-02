import type { BrowserRouterInstance, RouteObject, RouterOptions } from '../types'
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Outlet } from '../components/Outlet'
import { createBrowserRouter } from '../create-browser-router'
import { RouterProvider } from '../router'

/**
 * 开启 transition 后根层 404 的渲染路径：
 * 旧的裸渲染分支被 transitionEnabled 关闭，NotFound 必须经 bypass 槽位渲染，
 * 否则导航到无匹配路径时旧页退场完毕后是空白页（notFoundComponent 成死分支）
 */

const PageA = () => <div data-testid="page-a">A</div>

const ROUTES: RouteObject[] = [
  { path: '/a', component: PageA },
]

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

describe('transition + 根层 404', () => {
  beforeEach(() => {
    setPath('/a')
  })

  afterEach(() => {
    cleanup()
  })

  it('导航到无匹配路径时渲染自定义 notFoundComponent，而非空白', async () => {
    const router = await mount(ROUTES, {
      cache: { limit: 10 },
      transition: { exitTimeout: 5000, enterTimeout: 5000 },
      notFoundComponent: () => <div data-testid="nf">页面不存在</div>,
    })

    await nav(router, '/definitely-not-exists')

    expect(screen.getByTestId('nf')).toBeTruthy()

    router.dispose()
  })

  it('未配置 notFoundComponent 时默认 Not Found 兜底同样有渲染路径', async () => {
    const router = await mount(ROUTES, {
      cache: { limit: 10 },
      transition: { exitTimeout: 5000, enterTimeout: 5000 },
    })

    await nav(router, '/definitely-not-exists')

    expect(screen.getByText('Not Found')).toBeTruthy()

    router.dispose()
  })

  it('404 之后导航回正常路由，页面恢复渲染', async () => {
    const router = await mount(ROUTES, {
      cache: { limit: 10 },
      transition: { exitTimeout: 5000, enterTimeout: 5000 },
      notFoundComponent: () => <div data-testid="nf">页面不存在</div>,
    })

    await nav(router, '/definitely-not-exists')
    expect(screen.getByTestId('nf')).toBeTruthy()

    await nav(router, '/a')
    expect(screen.getByTestId('page-a')).toBeTruthy()

    router.dispose()
  })
})
