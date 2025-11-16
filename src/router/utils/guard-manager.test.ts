import type { AfterEachGuard, NavigationGuard, NavigationGuardContext } from '../types'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GuardManager } from './guard-manager'

describe('guardManager', () => {
  let guardManager: GuardManager

  const createMockContext = (pathname = '/'): NavigationGuardContext => ({
    to: { pathname, search: '', hash: '' },
    from: { pathname: '/', search: '', hash: '' },
    params: {},
    query: new URLSearchParams(),
    hashQuery: new URLSearchParams(),
    meta: {},
    route: undefined,
  })

  beforeEach(() => {
    guardManager = new GuardManager()
    vi.clearAllMocks()
  })

  describe('守卫注册和移除', () => {
    it('应该注册 beforeEach 守卫', () => {
      const guard: NavigationGuard = vi.fn((_to, _from, next) => next())
      const remove = guardManager.beforeEach(guard)

      expect(remove).toBeTypeOf('function')
    })

    it('应该注册 beforeResolve 守卫', () => {
      const guard: NavigationGuard = vi.fn((_to, _from, next) => next())
      const remove = guardManager.beforeResolve(guard)

      expect(remove).toBeTypeOf('function')
    })

    it('应该注册 afterEach 守卫', () => {
      const guard: AfterEachGuard = vi.fn()
      const remove = guardManager.afterEach(guard)

      expect(remove).toBeTypeOf('function')
    })

    it('应该移除 beforeEach 守卫', async () => {
      const guard: NavigationGuard = vi.fn((_to, _from, next) => next())
      const remove = guardManager.beforeEach(guard)

      remove()

      const to = createMockContext('/test')
      const from = createMockContext()
      await guardManager.runBeforeEach(to, from)

      expect(guard).not.toHaveBeenCalled()
    })

    it('应该移除 beforeResolve 守卫', async () => {
      const guard: NavigationGuard = vi.fn((_to, _from, next) => next())
      const remove = guardManager.beforeResolve(guard)

      remove()

      const to = createMockContext('/test')
      const from = createMockContext()
      await guardManager.runBeforeResolve(to, from)

      expect(guard).not.toHaveBeenCalled()
    })

    it('应该移除 afterEach 守卫', async () => {
      const guard: AfterEachGuard = vi.fn()
      const remove = guardManager.afterEach(guard)

      remove()

      const to = createMockContext('/test')
      const from = createMockContext()
      await guardManager.runAfterEach(to, from)

      expect(guard).not.toHaveBeenCalled()
    })

    it('应该支持多次移除同一个守卫（幂等）', () => {
      const guard: NavigationGuard = vi.fn((_to, _from, next) => next())
      const remove = guardManager.beforeEach(guard)

      remove()
      remove() // 再次移除不应该报错

      expect(guard).not.toHaveBeenCalled()
    })
  })

  describe('runBeforeEach', () => {
    it('应该在没有守卫时继续导航', async () => {
      const to = createMockContext('/test')
      const from = createMockContext()

      const result = await guardManager.runBeforeEach(to, from)

      expect(result.shouldContinue).toBe(true)
      expect(result.redirectPath).toBeUndefined()
    })

    it('应该按顺序执行守卫', async () => {
      const order: number[] = []
      const guard1: NavigationGuard = vi.fn((_to, _from, next) => {
        order.push(1)
        next()
      })
      const guard2: NavigationGuard = vi.fn((_to, _from, next) => {
        order.push(2)
        next()
      })

      guardManager.beforeEach(guard1)
      guardManager.beforeEach(guard2)

      const to = createMockContext('/test')
      const from = createMockContext()
      await guardManager.runBeforeEach(to, from)

      expect(order).toEqual([1, 2])
    })

    it('应该支持守卫重定向', async () => {
      const guard: NavigationGuard = vi.fn((_to, _from, next) => {
        next('/redirect')
      })

      guardManager.beforeEach(guard)

      const to = createMockContext('/test')
      const from = createMockContext()
      const result = await guardManager.runBeforeEach(to, from)

      expect(result.shouldContinue).toBe(false)
      expect(result.redirectPath).toBe('/redirect')
    })

    it('应该支持守卫取消导航', async () => {
      const guard: NavigationGuard = vi.fn((_to, _from, next) => {
        next(false)
      })

      guardManager.beforeEach(guard)

      const to = createMockContext('/test')
      const from = createMockContext()
      const result = await guardManager.runBeforeEach(to, from)

      expect(result.shouldContinue).toBe(false)
      expect(result.redirectPath).toBeUndefined()
    })

    it('应该支持异步守卫', async () => {
      const guard: NavigationGuard = vi.fn(async (_to, _from, next) => {
        await new Promise(resolve => setTimeout(resolve, 10))
        next()
      })

      guardManager.beforeEach(guard)

      const to = createMockContext('/test')
      const from = createMockContext()
      const result = await guardManager.runBeforeEach(to, from)

      expect(result.shouldContinue).toBe(true)
    })

    it('应该处理守卫错误', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const guard: NavigationGuard = vi.fn(() => {
        throw new Error('Guard error')
      })

      guardManager.beforeEach(guard)

      const to = createMockContext('/test')
      const from = createMockContext()
      const result = await guardManager.runBeforeEach(to, from)

      expect(result.shouldContinue).toBe(false)
      expect(consoleErrorSpy).toHaveBeenCalled()

      consoleErrorSpy.mockRestore()
    })

    it('应该警告未调用 next() 的守卫', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const guard: NavigationGuard = vi.fn(() => {
        // 不调用 next()
      })

      guardManager.beforeEach(guard)

      const to = createMockContext('/test')
      const from = createMockContext()
      const result = await guardManager.runBeforeEach(to, from)

      expect(result.shouldContinue).toBe(false)
      expect(consoleWarnSpy).toHaveBeenCalled()

      consoleWarnSpy.mockRestore()
    })

    it('应该警告多次调用 next()', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const guard: NavigationGuard = vi.fn((_to, _from, next) => {
        next()
        next() // 第二次调用
      })

      guardManager.beforeEach(guard)

      const to = createMockContext('/test')
      const from = createMockContext()
      await guardManager.runBeforeEach(to, from)

      expect(consoleWarnSpy).toHaveBeenCalled()

      consoleWarnSpy.mockRestore()
    })

    it('应该在重定向后停止执行后续守卫', async () => {
      const guard1: NavigationGuard = vi.fn((_to, _from, next) => {
        next('/redirect')
      })
      const guard2: NavigationGuard = vi.fn((_to, _from, next) => {
        next()
      })

      guardManager.beforeEach(guard1)
      guardManager.beforeEach(guard2)

      const to = createMockContext('/test')
      const from = createMockContext()
      await guardManager.runBeforeEach(to, from)

      expect(guard1).toHaveBeenCalled()
      expect(guard2).not.toHaveBeenCalled()
    })

    it('应该在取消导航后停止执行后续守卫', async () => {
      const guard1: NavigationGuard = vi.fn((_to, _from, next) => {
        next(false)
      })
      const guard2: NavigationGuard = vi.fn((_to, _from, next) => {
        next()
      })

      guardManager.beforeEach(guard1)
      guardManager.beforeEach(guard2)

      const to = createMockContext('/test')
      const from = createMockContext()
      await guardManager.runBeforeEach(to, from)

      expect(guard1).toHaveBeenCalled()
      expect(guard2).not.toHaveBeenCalled()
    })
  })

  describe('runBeforeResolve', () => {
    it('应该在没有守卫时继续导航', async () => {
      const to = createMockContext('/test')
      const from = createMockContext()

      const result = await guardManager.runBeforeResolve(to, from)

      expect(result.shouldContinue).toBe(true)
    })

    it('应该按顺序执行守卫', async () => {
      const order: number[] = []
      const guard1: NavigationGuard = vi.fn((_to, _from, next) => {
        order.push(1)
        next()
      })
      const guard2: NavigationGuard = vi.fn((_to, _from, next) => {
        order.push(2)
        next()
      })

      guardManager.beforeResolve(guard1)
      guardManager.beforeResolve(guard2)

      const to = createMockContext('/test')
      const from = createMockContext()
      await guardManager.runBeforeResolve(to, from)

      expect(order).toEqual([1, 2])
    })

    it('应该支持守卫重定向', async () => {
      const guard: NavigationGuard = vi.fn((_to, _from, next) => {
        next('/redirect')
      })

      guardManager.beforeResolve(guard)

      const to = createMockContext('/test')
      const from = createMockContext()
      const result = await guardManager.runBeforeResolve(to, from)

      expect(result.shouldContinue).toBe(false)
      expect(result.redirectPath).toBe('/redirect')
    })
  })

  describe('runAfterEach', () => {
    it('应该在没有守卫时不报错', async () => {
      const to = createMockContext('/test')
      const from = createMockContext()

      await expect(guardManager.runAfterEach(to, from)).resolves.not.toThrow()
    })

    it('应该按顺序执行守卫', async () => {
      const order: number[] = []
      const guard1: AfterEachGuard = vi.fn(() => {
        order.push(1)
      })
      const guard2: AfterEachGuard = vi.fn(() => {
        order.push(2)
      })

      guardManager.afterEach(guard1)
      guardManager.afterEach(guard2)

      const to = createMockContext('/test')
      const from = createMockContext()
      await guardManager.runAfterEach(to, from)

      expect(order).toEqual([1, 2])
      expect(guard1).toHaveBeenCalledWith(to, from)
      expect(guard2).toHaveBeenCalledWith(to, from)
    })

    it('应该支持异步守卫', async () => {
      const guard: AfterEachGuard = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
      })

      guardManager.afterEach(guard)

      const to = createMockContext('/test')
      const from = createMockContext()
      await guardManager.runAfterEach(to, from)

      expect(guard).toHaveBeenCalled()
    })

    it('应该处理守卫错误但不中断执行', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const guard1: AfterEachGuard = vi.fn(() => {
        throw new Error('Guard error')
      })
      const guard2: AfterEachGuard = vi.fn()

      guardManager.afterEach(guard1)
      guardManager.afterEach(guard2)

      const to = createMockContext('/test')
      const from = createMockContext()
      await guardManager.runAfterEach(to, from)

      expect(guard1).toHaveBeenCalled()
      expect(guard2).toHaveBeenCalled()
      expect(consoleErrorSpy).toHaveBeenCalled()

      consoleErrorSpy.mockRestore()
    })
  })

  describe('clear', () => {
    it('应该清空所有守卫', async () => {
      const beforeEachGuard: NavigationGuard = vi.fn((_to, _from, next) => next())
      const beforeResolveGuard: NavigationGuard = vi.fn((_to, _from, next) => next())
      const afterEachGuard: AfterEachGuard = vi.fn()

      guardManager.beforeEach(beforeEachGuard)
      guardManager.beforeResolve(beforeResolveGuard)
      guardManager.afterEach(afterEachGuard)

      guardManager.clear()

      const to = createMockContext('/test')
      const from = createMockContext()

      const beforeEachResult = await guardManager.runBeforeEach(to, from)
      const beforeResolveResult = await guardManager.runBeforeResolve(to, from)
      await guardManager.runAfterEach(to, from)

      expect(beforeEachResult.shouldContinue).toBe(true)
      expect(beforeResolveResult.shouldContinue).toBe(true)
      expect(beforeEachGuard).not.toHaveBeenCalled()
      expect(beforeResolveGuard).not.toHaveBeenCalled()
      expect(afterEachGuard).not.toHaveBeenCalled()
    })
  })
})
