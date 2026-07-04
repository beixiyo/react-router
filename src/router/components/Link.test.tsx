import type { BrowserRouterInstance, RouteObject } from '../types'
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { createBrowserRouter } from '../create-browser-router'
import { RouterProvider } from '../router'
import { NavLink } from './Link'

/**
 * NavLink 激活匹配：默认前缀匹配（父路径在子路由下仍激活），`end` 切换精确匹配
 * 前缀匹配按路径段边界，`/users` 不误命中 `/users-admin`，根路径 `/` 仅在自身激活
 */

const ROUTES: RouteObject[] = [
  { path: '/', component: () => <div>home</div> },
  { path: '/users', component: () => <div>users</div> },
  { path: '/users/:id', component: () => <div>user</div> },
  { path: '/users-admin', component: () => <div>admin</div> },
]

function setPath(pathname: string) {
  window.history.replaceState(null, '', pathname)
}

async function mountAt(pathname: string, ui: React.ReactNode): Promise<BrowserRouterInstance> {
  setPath(pathname)
  const router = createBrowserRouter({ routes: ROUTES })
  await act(async () => {
    render(<RouterProvider router={router}>{ui}</RouterProvider>)
  })
  return router
}

function classOf(name: string): string {
  return screen.getByRole('link', { name }).className
}

describe('NavLink 激活匹配', () => {
  afterEach(() => {
    cleanup()
  })

  it('默认前缀匹配：父路径在自身激活', async () => {
    const router = await mountAt('/users', (
      <NavLink to="/users" className="link" activeClassName="on" inactiveClassName="off">users</NavLink>
    ))
    expect(classOf('users')).toBe('link on')
    router.dispose()
  })

  it('默认前缀匹配：父路径在子路由下仍激活', async () => {
    const router = await mountAt('/users/1', (
      <NavLink to="/users" className="link" activeClassName="on" inactiveClassName="off">users</NavLink>
    ))
    expect(classOf('users')).toBe('link on')
    router.dispose()
  })

  it('end 精确匹配：父路径在子路由下不激活', async () => {
    const router = await mountAt('/users/1', (
      <NavLink to="/users" end className="link" activeClassName="on" inactiveClassName="off">users</NavLink>
    ))
    expect(classOf('users')).toBe('link off')
    router.dispose()
  })

  it('end 精确匹配：路径完全相等时激活', async () => {
    const router = await mountAt('/users', (
      <NavLink to="/users" end className="link" activeClassName="on" inactiveClassName="off">users</NavLink>
    ))
    expect(classOf('users')).toBe('link on')
    router.dispose()
  })

  it('前缀匹配按路径段边界：/users 不误命中 /users-admin', async () => {
    const router = await mountAt('/users-admin', (
      <NavLink to="/users" className="link" activeClassName="on" inactiveClassName="off">users</NavLink>
    ))
    expect(classOf('users')).toBe('link off')
    router.dispose()
  })

  it('根路径 / 前缀匹配下仅在自身激活，不点亮其它路由', async () => {
    const router = await mountAt('/users', (
      <NavLink to="/" className="link" activeClassName="on" inactiveClassName="off">home</NavLink>
    ))
    expect(classOf('home')).toBe('link off')
    router.dispose()
  })

  it('根路径 / 在自身激活', async () => {
    const router = await mountAt('/', (
      <NavLink to="/" className="link" activeClassName="on" inactiveClassName="off">home</NavLink>
    ))
    expect(classOf('home')).toBe('link on')
    router.dispose()
  })

  it('to 带 query 时只按 pathname 匹配（忽略 ?query）', async () => {
    const router = await mountAt('/users', (
      <NavLink to="/users?tab=active" className="link" activeClassName="on" inactiveClassName="off">users</NavLink>
    ))
    expect(classOf('users')).toBe('link on')
    router.dispose()
  })

  it('to 带 hash 时只按 pathname 匹配（忽略 #hash）', async () => {
    const router = await mountAt('/users', (
      <NavLink to="/users#profile" className="link" activeClassName="on" inactiveClassName="off">users</NavLink>
    ))
    expect(classOf('users')).toBe('link on')
    router.dispose()
  })

  it('尾斜杠两侧归一：end 精确匹配下 /users/ 与 /users 视为一致', async () => {
    const router = await mountAt('/users/', (
      <NavLink to="/users" end className="link" activeClassName="on" inactiveClassName="off">users</NavLink>
    ))
    expect(classOf('users')).toBe('link on')
    router.dispose()
  })

  it('空 to 不点亮（视为不匹配，而非匹配全站）', async () => {
    const router = await mountAt('/users', (
      <NavLink to="" className="link" activeClassName="on" inactiveClassName="off">empty</NavLink>
    ))
    // 空 href 的 <a> 无 link role，按文本取元素校验类名即可
    expect(screen.getByText('empty').className).toBe('link off')
    router.dispose()
  })
})
