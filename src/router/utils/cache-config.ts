import type { RouterOptions } from '../types'
import { DEFAULT_CACHE_LIMIT } from '../constants'
import { ERROR_CACHE_INCLUDE_EXCLUDE_MUTUAL } from '../constants/messages'
import { shouldCache } from './cache'

/**
 * 缓存配置对象
 */
export interface CacheConfig {
  /** 缓存数量限制 */
  limit: number
  /** 缓存包含的路径 */
  include?: (string | RegExp)[]
  /** 缓存排除的路径 */
  exclude?: (string | RegExp)[]
}

/**
 * 判断缓存是否全局启用
 *
 * 缓存启用逻辑：
 * - 如果 cache 是 false，禁用缓存
 * - 如果 cache 是 true，启用缓存（默认行为，所有路径都缓存）
 * - 如果 cache 是 object：
 *   - 如果提供了 include 或 exclude，启用缓存（根据规则判断）
 *   - 如果都没有提供，默认不缓存（需要显式设置 cache: true 来启用）
 *
 * @param options 路由器选项
 * @returns 是否启用缓存
 */
export function shouldEnableCache(options: RouterOptions): boolean {
  if (options.cache === false)
    return false
  if (options.cache === true)
    return true

  if (typeof options.cache === 'object') {
    // 如果提供了 include 或 exclude，启用缓存（由 shouldCache 判断具体路径）
    const include = options.cache.include
    const exclude = options.cache.exclude
    if ((include && include.length > 0) || (exclude && exclude.length > 0)) {
      return true
    }
    // 如果都没有提供，默认不缓存
    return false
  }
  // 默认不缓存
  return false
}

/**
 * 提取缓存配置
 *
 * @param options 路由器选项
 * @returns 缓存配置对象
 */
export function getCacheConfig(options: RouterOptions): CacheConfig {
  const limit = typeof options.cache === 'object'
    ? options.cache.limit ?? DEFAULT_CACHE_LIMIT
    : DEFAULT_CACHE_LIMIT
  const include = typeof options.cache === 'object'
    ? options.cache.include
    : undefined
  const exclude = typeof options.cache === 'object'
    ? options.cache.exclude
    : undefined

  // 验证 include 和 exclude 互斥
  if (include && include.length > 0 && exclude && exclude.length > 0) {
    throw new Error(ERROR_CACHE_INCLUDE_EXCLUDE_MUTUAL)
  }

  return {
    limit,
    include,
    exclude,
  }
}

/**
 * 判断特定路径是否应该被缓存
 *
 * 结合全局启用状态和路径匹配规则：
 * - 如果 cache 是 true，所有路径都缓存
 * - 如果 cache 是 object 且有 include/exclude，调用 shouldCache 判断
 * - 如果 cache 是 object 但没有 include/exclude，不缓存
 *
 * @param pathname 路径名
 * @param options 路由器选项
 * @returns 是否应该缓存该路径
 */
export function shouldCacheForPath(pathname: string, options: RouterOptions): boolean {
  // 如果缓存未启用，直接返回 false
  if (!shouldEnableCache(options)) {
    return false
  }

  // 如果 cache 是 true，所有路径都缓存
  if (options.cache === true) {
    return true
  }

  // 如果 cache 是 object，根据 include/exclude 判断
  if (typeof options.cache === 'object') {
    const { include, exclude } = getCacheConfig(options)
    // 如果提供了 include 或 exclude，使用 shouldCache 判断
    if ((include && include.length > 0) || (exclude && exclude.length > 0)) {
      return shouldCache(pathname, include, exclude)
    }
    // 如果都没有提供，不缓存
    return false
  }

  // 默认不缓存
  return false
}
