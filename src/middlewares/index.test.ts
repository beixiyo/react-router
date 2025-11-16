import type { MiddlewareContext } from '../router/types'
import { describe, expect, it, vi } from 'vitest'
import { createAuthMiddleware } from './index'

describe('createAuthMiddleware', () => {
  const createMockContext = (): MiddlewareContext => ({
    to: { pathname: '/test', search: '', hash: '' },
    from: { pathname: '/', search: '', hash: '' },
    params: {},
    query: new URLSearchParams(),
    hashQuery: new URLSearchParams(),
    meta: {},
    state: {},
    redirect: vi.fn(),
  })

  it('应该在有权限时继续执行', async () => {
    const middleware = createAuthMiddleware(() => true, '/login')
    const ctx = createMockContext()
    const next = vi.fn(() => Promise.resolve())

    await middleware(ctx, next)

    expect(next).toHaveBeenCalled()
    expect(ctx.redirect).not.toHaveBeenCalled()
  })

  it('应该在无权限时重定向', async () => {
    const middleware = createAuthMiddleware(() => false, '/login')
    const ctx = createMockContext()
    const next = vi.fn(() => Promise.resolve())

    await middleware(ctx, next)

    expect(ctx.redirect).toHaveBeenCalledWith('/login')
    expect(next).not.toHaveBeenCalled()
  })

  it('应该使用上下文进行权限检查', async () => {
    const middleware = createAuthMiddleware((ctx) => {
      return ctx.to.pathname !== '/admin'
    }, '/login')

    const ctx1 = createMockContext()
    ctx1.to.pathname = '/admin'
    const next1 = vi.fn(() => Promise.resolve())
    await middleware(ctx1, next1)
    expect(ctx1.redirect).toHaveBeenCalledWith('/login')

    const ctx2 = createMockContext()
    ctx2.to.pathname = '/dashboard'
    const next2 = vi.fn(() => Promise.resolve())
    await middleware(ctx2, next2)
    expect(next2).toHaveBeenCalled()
  })
})
