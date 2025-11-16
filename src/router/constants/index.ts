/**
 * 路由默认配置常量
 */
import type { RouteConfig } from '../types'

export const DEFAULT_ROUTE_CONFIG: RouteConfig = {
  sensitive: false,
  strict: false,
  end: true,
  start: true,
  delimiter: '/',
  decode: true,
}

/**
 * 默认缓存数量限制
 */
export const DEFAULT_CACHE_LIMIT = 10
