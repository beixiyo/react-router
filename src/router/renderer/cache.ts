import type { ReactElement } from 'react'
import type { LocationLike, RouterOptions } from '../types'
import type { RouteTransitionOptions } from '../types/transition'
import { useMemo, useRef } from 'react'
import { DEFAULT_CACHE_LIMIT } from '../constants'
import { getCacheConfig, shouldCacheForPath, shouldEnableCache } from '../utils/cache-config'
import { LRUCache } from '../utils/LRUCache'

export interface CacheEntry {
  key: string
  element: ReactElement
  lastShown: number
  location: LocationLike
  /**
   * 条目创建序号。clearCache / deleteCache 后被移除再重建的条目会拿到新序号，
   * 上层据此变更 React key 让其原地重新挂载（状态重置），而非沿用旧实例
   */
  seq?: number
  /**
   * 本条目生效的过渡配置（路由级与全局合并后的结果），随条目存储——
   * 退场中的旧条目用自己的配置播完动画，不受新路由配置影响
   */
  transition?: RouteTransitionOptions
}

export type CacheMap = LRUCache<string, CacheEntry>

/** 全局自增序号，仅用于区分「同 key 但已被清/删后重建」的缓存条目 */
let entrySeq = 0

/** 默认缓存键：模块级常量，保证未配置 cacheKey 时下游 useMemo 的 deps 引用稳定 */
const DEFAULT_CACHE_KEY = (loc: LocationLike) => loc.pathname

/**
 * 位置三字段值比较：条目 location 只在值真正变化时才换新引用，
 * 避免值相等的新对象经 LocationCtx 击穿活跃子树的所有 memo
 */
function isSameLocation(a: LocationLike | undefined, b: LocationLike): boolean {
  return !!a
    && a.pathname === b.pathname
    && a.search === b.search
    && a.hash === b.hash
}

/**
 * 计算缓存配置
 */
export function useCacheConfig(options: RouterOptions, location: LocationLike) {
  const stableCacheKeyFn = options.cacheKey ?? DEFAULT_CACHE_KEY

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
  // 如果 maxCacheLen 变化了，更新它并立即裁剪到新上限
  if (cacheRef.current.maxCacheLen !== (maxCacheLen ?? DEFAULT_CACHE_LIMIT)) {
    cacheRef.current.maxCacheLen = maxCacheLen ?? DEFAULT_CACHE_LIMIT
    cacheRef.current.trim()
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
  transition?: RouteTransitionOptions,
) {
  if (effectiveLimit === undefined)
    return

  // 更新 maxCacheLen（如果变化了）并裁剪到新上限
  if (cache.maxCacheLen !== effectiveLimit) {
    cache.maxCacheLen = effectiveLimit
    cache.trim()
  }

  // 如果不存在，添加新元素；LRUCache 会自动处理 LRU 逻辑
  // 叶子页一旦缓存即冻结元素（保留状态），不刷新——参数已由 pathname 维度的 key 区分
  if (!cache.has(cacheKey)) {
    cache.set(cacheKey, {
      key: cacheKey,
      element,
      lastShown: Date.now(),
      location: { ...location },
      seq: entrySeq++,
      transition,
    })
  }
}

/**
 * 写入 / 刷新「壳」缓存条目
 *
 * 与叶子缓存不同，壳（共享祖先 / 布局）每次都用最新元素覆盖，使其在保持单实例的同时，
 * 参数 / splat 跟随当前导航刷新（修复被缓存壳参数过期问题）。
 * 复用已有条目的 seq → React key 不变 → 实例与本地状态得以保留，仅更新参数上下文。
 */
export function setShellEntry(
  shellCache: Map<string, CacheEntry>,
  cacheKey: string,
  element: ReactElement,
  location: LocationLike,
  transition?: RouteTransitionOptions,
) {
  const prev = shellCache.get(cacheKey)

  /** 全部字段等值则复用旧条目：引用不变 → 上层 memo 完整 bail-out（非导航渲染零波及） */
  if (prev
    && prev.element === element
    && prev.transition === transition
    && isSameLocation(prev.location, location)) {
    return
  }

  shellCache.set(cacheKey, {
    key: cacheKey,
    element,
    lastShown: Date.now(),
    location: isSameLocation(prev?.location, location)
      ? prev!.location
      : { ...location },
    seq: prev?.seq ?? entrySeq++,
    transition,
  })
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
    // 值真正变化才换引用（如同 key 叶子带不同 search 复活），否则沿用旧对象不惊动 LocationCtx 消费者
    if (currentLocation && !isSameLocation(entry.location, currentLocation)) {
      entry.location = { ...currentLocation }
    }
    return entry.element
  }
  return undefined
}
