import type { ReactElement } from 'react'
import type { LocationLike, RouterOptions } from '../types'
import { useMemo, useRef } from 'react'
import { DEFAULT_CACHE_LIMIT } from '../constants'
import { getCacheConfig, shouldCacheForPath, shouldEnableCache } from '../utils/cache-config'
import { LRUCache } from '../utils/LRUCache'

export interface CacheEntry {
  key: string
  element: ReactElement
  lastShown: number
  location: LocationLike
}

export type CacheMap = LRUCache<string, CacheEntry>

/**
 * 计算缓存配置
 */
export function useCacheConfig(options: RouterOptions, location: LocationLike) {
  const cacheKeyFn = options.cacheKey ?? ((loc: LocationLike) => loc.pathname)
  const stableCacheKeyFn = useMemo(() => cacheKeyFn, [cacheKeyFn])

  // 使用统一函数判断缓存是否启用
  const cacheEnabled = shouldEnableCache(options)
  // 使用统一函数提取缓存配置（包含验证）
  const cacheConfig = getCacheConfig(options)

  // 使用 useMemo 稳定化这些计算值，避免不必要的重新计算
  const { cacheKey, effectiveLimit, eligible } = useMemo(() => {
    const key = stableCacheKeyFn(location)
    // 如果 limit <= 0，禁用缓存
    const effectiveLimit = typeof cacheConfig.limit === 'number' && cacheConfig.limit > 0
      ? cacheConfig.limit
      : undefined
    const effectiveCacheEnabled = cacheEnabled && effectiveLimit !== undefined

    // 使用统一函数判断路径是否应该缓存
    const shouldCacheResult = shouldCacheForPath(location.pathname, options)

    const eligible = effectiveCacheEnabled && shouldCacheResult
    return { cacheKey: key, effectiveLimit, eligible }
  }, [location.pathname, location.search, location.hash, stableCacheKeyFn, cacheConfig.limit, cacheEnabled, options])

  return {
    cacheKey,
    effectiveLimit,
    eligible,
    cacheEnabled,
  }
}

/**
 * 管理缓存 Map
 * @param maxCacheLen 最大缓存长度，如果未提供则使用默认值
 */
export function useCacheMap(maxCacheLen?: number) {
  const cacheRef = useRef<CacheMap | null>(null)
  if (!cacheRef.current) {
    cacheRef.current = new LRUCache<string, CacheEntry>(maxCacheLen ?? DEFAULT_CACHE_LIMIT)
  }
  // 如果 maxCacheLen 变化了，更新它
  if (cacheRef.current.maxCacheLen !== (maxCacheLen ?? DEFAULT_CACHE_LIMIT)) {
    cacheRef.current.maxCacheLen = maxCacheLen ?? DEFAULT_CACHE_LIMIT
  }
  return cacheRef.current
}

/**
 * 更新缓存：添加新元素或更新已存在的元素
 */
export function updateCache(
  cache: CacheMap,
  cacheKey: string,
  element: ReactElement,
  location: LocationLike,
  effectiveLimit?: number,
) {
  if (effectiveLimit === undefined)
    return

  // 更新 maxCacheLen（如果变化了）
  if (cache.maxCacheLen !== effectiveLimit) {
    cache.maxCacheLen = effectiveLimit
  }

  // 如果不存在，添加新元素；LRUCache 会自动处理 LRU 逻辑
  if (!cache.has(cacheKey)) {
    cache.set(cacheKey, {
      key: cacheKey,
      element,
      lastShown: Date.now(),
      location: { ...location },
    })
  }
}

/**
 * 获取缓存中的元素（如果存在）
 * LRUCache 的 get 方法会自动将访问的项移到最新位置
 */
export function getCachedElement(
  cache: CacheMap,
  cacheKey: string,
  currentLocation?: LocationLike,
): ReactElement | undefined {
  const entry = cache.get(cacheKey)
  if (entry) {
    // 更新 lastShown 时间戳（虽然 LRUCache 已经处理了顺序，但保留此字段以保持兼容性）
    entry.lastShown = Date.now()
    if (currentLocation) {
      entry.location = { ...currentLocation }
    }
    return entry.element
  }
  return undefined
}
