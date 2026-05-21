import { matchPattern } from './match'

/**
 * 判断路径是否应该被缓存
 *
 * - exclude 优先：命中 exclude 则不缓存
 * - include 未传（undefined） → 全量模式，缓存所有路径
 * - include 为空数组 → 不缓存任何路径
 * - include 非空 → 白名单模式，需命中 include 才缓存
 */
export function shouldCache(
  pathname: string,
  include?: (string | RegExp)[] | undefined,
  exclude?: (string | RegExp)[] | undefined,
): boolean {
  if (exclude?.some(p => matchPattern(pathname, p)))
    return false
  if (include === undefined)
    return true
  return include.some(p => matchPattern(pathname, p))
}
