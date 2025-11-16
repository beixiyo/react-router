import { matchPattern } from './match'

/**
 * 判断路径是否应该被缓存
 *
 * 注意：include 和 exclude 的互斥验证应该在调用此函数之前完成（通过 getCacheConfig）
 * 此函数只负责路径匹配逻辑，不进行互斥验证
 *
 * @param pathname 路径名
 * @param include 包含模式列表（如果提供，只有匹配的路径才会被缓存）
 * @param exclude 排除模式列表（如果提供，匹配的路径不会被缓存）
 * @returns 是否应该缓存
 */
export function shouldCache(
  pathname: string,
  include?: (string | RegExp)[] | undefined,
  exclude?: (string | RegExp)[] | undefined,
): boolean {
  // 如果只有 exclude，匹配的不缓存，不匹配的缓存
  if (exclude && exclude.length > 0) {
    return !exclude.some(p => matchPattern(pathname, p))
  }

  // 如果只有 include，只有匹配的才缓存
  if (include && include.length > 0) {
    return include.some(p => matchPattern(pathname, p))
  }

  // 默认不缓存（两者都不存在）
  return false
}
