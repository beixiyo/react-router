import type { RouterOptions } from '../types'
import { describe, expect, it } from 'vitest'
import { ERROR_CACHE_INCLUDE_EXCLUDE_MUTUAL } from '../constants/messages'
import { getCacheConfig, shouldCacheForPath, shouldEnableCache } from './cache-config'

describe('shouldEnableCache', () => {
  it('应该在 cache: false 时禁用缓存', () => {
    const options: RouterOptions = { cache: false }
    expect(shouldEnableCache(options)).toBe(false)
  })

  it('应该在 cache: true 时启用缓存', () => {
    const options: RouterOptions = { cache: true }
    expect(shouldEnableCache(options)).toBe(true)
  })

  it('应该在 cache: object with include 时启用缓存', () => {
    const options: RouterOptions = {
      cache: {
        include: ['/dashboard'],
      },
    }
    expect(shouldEnableCache(options)).toBe(true)
  })

  it('应该在 cache: object with exclude 时启用缓存', () => {
    const options: RouterOptions = {
      cache: {
        exclude: ['/admin'],
      },
    }
    expect(shouldEnableCache(options)).toBe(true)
  })

  it('应该在 cache: object without include/exclude 时禁用缓存', () => {
    const options: RouterOptions = {
      cache: {
        limit: 10,
      },
    }
    expect(shouldEnableCache(options)).toBe(false)
  })

  it('应该在 cache 未定义时禁用缓存', () => {
    const options: RouterOptions = {}
    expect(shouldEnableCache(options)).toBe(false)
  })
})

describe('getCacheConfig', () => {
  it('应该提取缓存配置', () => {
    const options: RouterOptions = {
      cache: {
        limit: 5,
        include: ['/dashboard'],
      },
    }
    const config = getCacheConfig(options)

    expect(config).toEqual({
      limit: 5,
      include: ['/dashboard'],
      exclude: undefined,
    })
  })

  it('应该使用默认 limit', () => {
    const options: RouterOptions = {
      cache: {
        include: ['/dashboard'],
      },
    }
    const config = getCacheConfig(options)

    expect(config.limit).toBe(10) // DEFAULT_CACHE_LIMIT
  })

  it('应该抛出错误当 include 和 exclude 同时存在', () => {
    const options: RouterOptions = {
      cache: {
        include: ['/dashboard'],
        exclude: ['/admin'],
      },
    }

    expect(() => {
      getCacheConfig(options)
    }).toThrow(ERROR_CACHE_INCLUDE_EXCLUDE_MUTUAL)
  })

  it('应该处理 cache: true 的情况', () => {
    const options: RouterOptions = {
      cache: true,
    }
    const config = getCacheConfig(options)

    expect(config).toEqual({
      limit: 10,
      include: undefined,
      exclude: undefined,
    })
  })
})

describe('shouldCacheForPath', () => {
  it('应该在缓存未启用时返回 false', () => {
    const options: RouterOptions = { cache: false }
    expect(shouldCacheForPath('/dashboard', options)).toBe(false)
  })

  it('应该在 cache: true 时对所有路径返回 true', () => {
    const options: RouterOptions = { cache: true }
    expect(shouldCacheForPath('/dashboard', options)).toBe(true)
    expect(shouldCacheForPath('/users', options)).toBe(true)
  })

  it('应该根据 include 模式判断', () => {
    const options: RouterOptions = {
      cache: {
        include: ['/dashboard', '/users'],
      },
    }
    expect(shouldCacheForPath('/dashboard', options)).toBe(true)
    expect(shouldCacheForPath('/users', options)).toBe(true)
    expect(shouldCacheForPath('/posts', options)).toBe(false)
  })

  it('应该根据 exclude 模式判断', () => {
    const options: RouterOptions = {
      cache: {
        exclude: ['/admin'],
      },
    }
    expect(shouldCacheForPath('/dashboard', options)).toBe(true)
    expect(shouldCacheForPath('/admin', options)).toBe(false)
  })

  it('应该支持正则表达式 include', () => {
    const options: RouterOptions = {
      cache: {
        include: [/\/(users|posts)\/\d+/],
      },
    }
    expect(shouldCacheForPath('/users/123', options)).toBe(true)
    expect(shouldCacheForPath('/posts/456', options)).toBe(true)
    expect(shouldCacheForPath('/users/abc', options)).toBe(false)
  })

  it('应该支持正则表达式 exclude', () => {
    const options: RouterOptions = {
      cache: {
        exclude: [/\/admin/],
      },
    }
    expect(shouldCacheForPath('/dashboard', options)).toBe(true)
    expect(shouldCacheForPath('/admin/users', options)).toBe(false)
  })

  it('应该在 cache: object without include/exclude 时返回 false', () => {
    const options: RouterOptions = {
      cache: {
        limit: 10,
      },
    }
    expect(shouldCacheForPath('/dashboard', options)).toBe(false)
  })
})
