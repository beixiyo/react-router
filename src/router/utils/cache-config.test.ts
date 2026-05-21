import type { RouterOptions } from '../types'
import { describe, expect, it } from 'vitest'
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

  it('应该在 cache: object 仅 exclude 时启用缓存', () => {
    const options: RouterOptions = {
      cache: {
        exclude: ['/admin'],
      },
    }
    expect(shouldEnableCache(options)).toBe(true)
  })

  it('应该在 cache: object 仅 limit 时启用缓存', () => {
    const options: RouterOptions = {
      cache: {
        limit: 10,
      },
    }
    expect(shouldEnableCache(options)).toBe(true)
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

  it('应该支持 include 和 exclude 同时存在', () => {
    const options: RouterOptions = {
      cache: {
        include: ['/dashboard', '/users'],
        exclude: ['/admin'],
      },
    }
    const config = getCacheConfig(options)

    expect(config).toEqual({
      limit: 10,
      include: ['/dashboard', '/users'],
      exclude: ['/admin'],
    })
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

  it('应该根据 include + exclude 判断（exclude 优先）', () => {
    const options: RouterOptions = {
      cache: {
        include: ['/dashboard', '/admin'],
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
        include: [/\/dashboard/, /\/admin\/.*/],
        exclude: [/\/admin/],
      },
    }
    expect(shouldCacheForPath('/dashboard', options)).toBe(true)
    expect(shouldCacheForPath('/admin/users', options)).toBe(false)
    expect(shouldCacheForPath('/admin', options)).toBe(false)
  })

  it('应该在 cache: object 仅 limit 时缓存所有路径', () => {
    const options: RouterOptions = {
      cache: {
        limit: 10,
      },
    }
    expect(shouldCacheForPath('/dashboard', options)).toBe(true)
    expect(shouldCacheForPath('/users', options)).toBe(true)
  })

  it('应该在 include 与 exclude 共存时：exclude 优先', () => {
    const options: RouterOptions = {
      cache: {
        include: ['/dashboard', '/users'],
        exclude: ['/admin', '/users/admin'],
      },
    }
    expect(shouldCacheForPath('/dashboard', options)).toBe(true)
    expect(shouldCacheForPath('/users', options)).toBe(true)
    expect(shouldCacheForPath('/admin', options)).toBe(false)
    expect(shouldCacheForPath('/users/admin', options)).toBe(false)
    expect(shouldCacheForPath('/posts', options)).toBe(false)
  })

  it('include 未传时缓存所有路径（除 exclude 外）', () => {
    expect(shouldCacheForPath('/dashboard', { cache: {} })).toBe(true)
    expect(shouldCacheForPath('/dashboard', { cache: { exclude: ['/admin'] } })).toBe(true)
    expect(shouldCacheForPath('/admin', { cache: { exclude: ['/admin'] } })).toBe(false)
  })

  it('include 为空数组时不缓存任何路径', () => {
    expect(shouldCacheForPath('/dashboard', { cache: { include: [] } })).toBe(false)
  })
})
