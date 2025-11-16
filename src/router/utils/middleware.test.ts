import type { Middleware, MiddlewareContext } from '../types'
import { describe, expect, it, vi } from 'vitest'
import { ERROR_NEXT_CALLED_MULTIPLE_TIMES } from '../constants/messages'
import { compose } from './middleware'

describe('compose', () => {
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

  it('应该按顺序执行中间件', async () => {
    const order: number[] = []
    const m1: Middleware = async (_ctx, next) => {
      order.push(1)
      await next()
      order.push(4)
    }
    const m2: Middleware = async (_ctx, next) => {
      order.push(2)
      await next()
      order.push(3)
    }

    const run = compose([m1, m2])
    const next = vi.fn(() => Promise.resolve())
    await run(createMockContext(), next)

    expect(order).toEqual([1, 2, 3, 4])
    expect(next).toHaveBeenCalled()
  })

  it('应该支持异步中间件', async () => {
    const m1: Middleware = async (_ctx, next) => {
      await new Promise(resolve => setTimeout(resolve, 10))
      await next()
    }

    const run = compose([m1])
    const next = vi.fn(() => Promise.resolve())
    await run(createMockContext(), next)

    expect(next).toHaveBeenCalled()
  })

  it('应该支持重定向', async () => {
    const m1: Middleware = async (_ctx, next) => {
      await next('/redirect')
    }
    const m2: Middleware = async (_ctx, next) => {
      // 不应该执行到这里
      throw new Error('Should not reach here')
    }

    const run = compose([m1, m2])
    const next = vi.fn((path?: string | false) => {
      expect(path).toBe('/redirect')
      return Promise.resolve()
    })
    await run(createMockContext(), next)
  })

  it('应该支持取消执行', async () => {
    const m1: Middleware = async (_ctx, next) => {
      await next(false)
    }
    const m2: Middleware = async (_ctx, next) => {
      // 不应该执行到这里
      throw new Error('Should not reach here')
    }

    const run = compose([m1, m2])
    const next = vi.fn((path?: string | false) => {
      expect(path).toBe(false)
      return Promise.resolve()
    })
    await run(createMockContext(), next)
  })

  it('应该支持空中间件数组', async () => {
    const run = compose([])
    const next = vi.fn(() => Promise.resolve())
    await run(createMockContext(), next)

    expect(next).toHaveBeenCalled()
  })

  it('应该防止多次调用 next', async () => {
    const m1: Middleware = async (_ctx, next) => {
      await next()
      await next() // 第二次调用应该抛出错误
    }

    const run = compose([m1])
    const next = vi.fn(() => Promise.resolve())

    await expect(run(createMockContext(), next)).rejects.toThrow(ERROR_NEXT_CALLED_MULTIPLE_TIMES)
  })

  it('应该支持中间件修改上下文', async () => {
    const m1: Middleware = async (_ctx, next) => {
      await next()
    }

    const run = compose([m1])
    const ctx = createMockContext()
    const next = vi.fn(() => Promise.resolve())

    await run(ctx, next)
  })
})
