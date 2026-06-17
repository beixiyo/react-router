import { describe, expect, it, vi } from 'vitest'
import { createRouterCacheController, isCacheKeyMatched } from './cache-control'

describe('cache-control', () => {
  it('应该派发 clear / delete 缓存事件', () => {
    const controller = createRouterCacheController()
    const listener = vi.fn()

    controller.subscribeCache(listener)
    controller.clearCache()
    controller.deleteCache('/cards')

    expect(listener).toHaveBeenNthCalledWith(1, { type: 'clear' })
    expect(listener).toHaveBeenNthCalledWith(2, { type: 'delete', matcher: '/cards' })
  })

  it('应该支持取消订阅缓存事件', () => {
    const controller = createRouterCacheController()
    const listener = vi.fn()
    const unsubscribe = controller.subscribeCache(listener)

    unsubscribe()
    controller.clearCache()

    expect(listener).not.toHaveBeenCalled()
  })

  it('应该支持多种缓存 key 匹配方式', () => {
    expect(isCacheKeyMatched('/cards', '/cards')).toBe(true)
    expect(isCacheKeyMatched('/cards/1', /^\/cards/)).toBe(true)
    expect(isCacheKeyMatched('/login', key => key.startsWith('/cards'))).toBe(false)
  })
})
