import type { ReactElement } from 'react'
import type { LocationLike } from '../types'
import type { CacheMap } from './cache'
import { renderHook } from '@testing-library/react'
import { createElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LRUCache } from '../utils/LRUCache'
import { getCachedElement, updateCache, useCacheMap } from './cache'

describe('updateCache', () => {
  let cache: CacheMap
  let mockElement: ReactElement
  let mockLocation: LocationLike

  beforeEach(() => {
    cache = new LRUCache(100)
    mockElement = createElement('div', null, 'Test')
    mockLocation = { pathname: '/test', search: '?q=1', hash: '#hash' }
  })

  it('应该添加新元素到缓存', () => {
    updateCache(cache, 'key1', mockElement, mockLocation, 10)

    expect(cache.size).toBe(1)
    expect(cache.has('key1')).toBe(true)
    const entry = cache.get('key1')
    expect(entry?.element).toBe(mockElement)
    expect(entry?.key).toBe('key1')
    expect(entry?.location).toEqual(mockLocation)
  })

  it('应该在 effectiveLimit 为 undefined 时不添加缓存', () => {
    updateCache(cache, 'key1', mockElement, mockLocation, undefined)

    expect(cache.size).toBe(0)
  })

  it('应该不更新已存在的缓存项', () => {
    const oldElement = createElement('div', null, 'Old')
    updateCache(cache, 'key1', oldElement, mockLocation, 10)
    const oldEntry = cache.get('key1')

    const newElement = createElement('div', null, 'New')
    updateCache(cache, 'key1', newElement, mockLocation, 10)

    expect(cache.size).toBe(1)
    const entry = cache.get('key1')
    expect(entry?.element).toBe(oldElement) // 应该保持旧元素
    expect(entry).toBe(oldEntry) // 应该是同一个引用
  })

  it('应该在超过限制时删除最久未使用的项', () => {
    const element1 = createElement('div', null, '1')
    const element2 = createElement('div', null, '2')
    const element3 = createElement('div', null, '3')
    const element4 = createElement('div', null, '4')

    // 添加第一个元素
    updateCache(cache, 'key1', element1, mockLocation, 3)

    // 添加第二个元素
    updateCache(cache, 'key2', element2, mockLocation, 3)

    // 添加第三个元素
    updateCache(cache, 'key3', element3, mockLocation, 3)

    expect(cache.size).toBe(3)

    // 添加第四个元素，LRUCache 会自动删除最久未使用的（key1，因为它是第一个添加的）
    updateCache(cache, 'key4', element4, mockLocation, 3)

    expect(cache.size).toBe(3)
    expect(cache.has('key1')).toBe(false) // 最久未使用的应该被删除
    expect(cache.has('key2')).toBe(true)
    expect(cache.has('key3')).toBe(true)
    expect(cache.has('key4')).toBe(true)
  })

  it('应该根据访问顺序删除最久未使用的', () => {
    const element1 = createElement('div', null, '1')
    const element2 = createElement('div', null, '2')
    const element3 = createElement('div', null, '3')
    const element4 = createElement('div', null, '4')

    updateCache(cache, 'key1', element1, mockLocation, 3)
    updateCache(cache, 'key2', element2, mockLocation, 3)
    updateCache(cache, 'key3', element3, mockLocation, 3)

    // 访问 key1，LRUCache 会自动将其移到最新位置
    getCachedElement(cache, 'key1')

    // 添加第四个元素，应该删除 key2（最久未使用，因为 key1 刚被访问过）
    updateCache(cache, 'key4', element4, mockLocation, 3)

    expect(cache.has('key1')).toBe(true) // 刚访问过，不应该被删除
    expect(cache.has('key2')).toBe(false) // 最久未使用，应该被删除
    expect(cache.has('key3')).toBe(true)
    expect(cache.has('key4')).toBe(true)
  })
})

describe('getCachedElement', () => {
  let cache: CacheMap
  let mockElement: ReactElement
  let mockLocation: LocationLike

  beforeEach(() => {
    cache = new LRUCache(100)
    mockElement = createElement('div', null, 'Test')
    mockLocation = { pathname: '/foo', search: '', hash: '' }
  })

  it('应该返回缓存中的元素', () => {
    cache.set('key1', {
      key: 'key1',
      element: mockElement,
      lastShown: Date.now(),
      location: mockLocation,
    })

    const result = getCachedElement(cache, 'key1')

    expect(result).toBe(mockElement)
  })

  it('应该在缓存不存在时返回 undefined', () => {
    const result = getCachedElement(cache, 'nonexistent')

    expect(result).toBeUndefined()
  })

  it('应该更新 lastShown 时间戳', () => {
    const initialTime = 1000
    cache.set('key1', {
      key: 'key1',
      element: mockElement,
      lastShown: initialTime,
      location: mockLocation,
    })

    vi.useFakeTimers()
    vi.setSystemTime(2000)

    getCachedElement(cache, 'key1')

    const entry = cache.get('key1')
    expect(entry?.lastShown).toBe(2000)

    vi.useRealTimers()
  })

  it('应该在命中时更新缓存项的 location', () => {
    cache.set('key1', {
      key: 'key1',
      element: mockElement,
      lastShown: Date.now(),
      location: mockLocation,
    })

    const newLocation = { pathname: '/bar', search: '?a=1', hash: '#1' }
    getCachedElement(cache, 'key1', newLocation)

    const entry = cache.get('key1')
    expect(entry?.location).toEqual(newLocation)
    expect(entry?.location).not.toBe(mockLocation)
  })
})

describe('useCacheMap', () => {
  it('应该返回稳定的 LRUCache 引用', () => {
    const { result, rerender } = renderHook(() => useCacheMap(10))

    const firstCache = result.current
    rerender()
    const secondCache = result.current

    expect(firstCache).toBe(secondCache) // 应该是同一个引用
  })

  it('应该返回 LRUCache 实例', () => {
    const { result } = renderHook(() => useCacheMap(10))

    expect(result.current).toBeInstanceOf(LRUCache)
  })

  it('应该使用传入的 maxCacheLen', () => {
    const { result } = renderHook(() => useCacheMap(5))

    expect(result.current.maxCacheLen).toBe(5)
  })
})
