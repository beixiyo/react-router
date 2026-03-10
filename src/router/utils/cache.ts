import { matchPattern } from './match'

/**
 * 判断路径是否应该被缓存
 *
 * 缓存与布局不同，必须显式指定 include 才缓存，未指定或空数组不缓存：
 * - include 必须有至少一个模式，否则不缓存
 * - exclude 优先：命中 exclude 则不缓存
 * - 需命中 include 才缓存
 *
 * @param pathname 路径名
 * @param include 包含模式列表（必填，指定才缓存）
 * @param exclude 排除模式列表（可选，命中则不缓存）
 * @returns 是否应该缓存
 */
export function shouldCache(
  pathname: string,
  include?: (string | RegExp)[] | undefined,
  exclude?: (string | RegExp)[] | undefined,
): boolean {
  if (!include?.length)
    return false
  if (exclude?.some(p => matchPattern(pathname, p)))
    return false
  return include.some(p => matchPattern(pathname, p))
}
