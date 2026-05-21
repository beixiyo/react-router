import type { RouterOptions } from '../types'
import { DEFAULT_CACHE_LIMIT } from '../constants'
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
 * - 如果 cache 是 true，启用缓存（所有路径都缓存）
 * - 如果 cache 是 object，启用缓存（通过 include/exclude 控制哪些路径缓存）
 * - 未设置 cache → 不缓存
 *
 * @param options 路由器选项
 * @returns 是否启用缓存
 */
export function shouldEnableCache(options: RouterOptions): boolean {
  if (options.cache === false)
    return false
  if (options.cache === true)
    return true
  if (typeof options.cache === 'object')
    return true

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
 * - 如果 cache 是 object，调用 shouldCache 判断（include 为空视为全部缓存）
 *
 * @param pathname 路径名
 * @param options 路由器选项
 * @returns 是否应该缓存该路径
 */
export function shouldCacheForPath(pathname: string, options: RouterOptions): boolean {
  if (!shouldEnableCache(options))
    return false

  if (options.cache === true)
    return true

  if (typeof options.cache === 'object') {
    const { include, exclude } = getCacheConfig(options)
    return shouldCache(pathname, include, exclude)
  }

  return false
}
