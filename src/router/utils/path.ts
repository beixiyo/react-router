import type { LocationLike } from '../types'

/**
 * 从完整路径中移除基础路径前缀
 *
 * **为什么需要它？**
 * 当应用部署在子路径下时（如 `/app`），浏览器 URL 是完整路径（如 `/app/users/123`），
 * 但路由配置中使用的是相对路径（如 `/users/:id`）。此函数用于从完整路径中提取相对路径，
 * 以便与路由配置进行匹配。
 *
 * **没有会怎么样？**
 * - 如果应用部署在 `/app` 下，访问 `/app/users/123` 时，路由系统会尝试匹配 `/app/users/123`，
 *   但路由配置中只有 `/users/:id`，导致匹配失败
 * - 无法支持应用部署在非根路径的场景
 *
 * **入参和输出示例：**
 *
 * 基础情况：
 * - `stripBase('/users/123', '')` → `'/users/123'` (basePath 为空，直接返回)
 * - `stripBase('/app/users/123', '/app')` → `'/users/123'` (正常移除前缀)
 * - `stripBase('/app', '/app')` → `'/'` (移除后为空，返回根路径)
 *
 * 边界情况：
 * - `stripBase('/app/users', '/app')` → `'/users'` (移除前缀后保留路径)
 * - `stripBase('/other/path', '/app')` → `'/other/path'` (不以 basePath 开头，返回原路径)
 *   注意：这种情况通常会导致路由匹配失败（404），因为路由配置中不包含该路径
 * - `stripBase('/app/', '/app')` → `'/'` (移除前缀后只剩斜杠)
 * - `stripBase('/appusers', '/app')` → `'/appusers'` (不是以 basePath 开头，返回原路径)
 *   注意：这里不会误匹配，因为 `startsWith` 是精确匹配，`/appusers` 不以 `/app` 开头
 * - `stripBase('', '/app')` → `''` (空路径，返回空字符串)
 * - `stripBase('/', '/app')` → `'/'` (根路径，不以 basePath 开头，返回原路径)
 *
 * @param pathname 完整的路径名（来自 window.location.pathname）
 * @param basePath 基础路径前缀（来自 RouterOptions.base）
 * @returns 移除基础路径后的相对路径，如果移除后为空则返回 '/'
 */
export function stripBase(pathname: string, basePath: string): string {
  if (!basePath)
    return pathname
  return pathname.startsWith(basePath)
    ? pathname.slice(basePath.length) || '/'
    : pathname
}

/**
 * 规范化路径，确保以 '/' 开头
 */
export function normalizePathStartSlash(path: string): string {
  if (!path.startsWith('/'))
    return `/${path}`
  return path
}

/**
 * 解析 URL 字符串为 LocationLike 对象
 */
export function parseUrl(path: string): LocationLike {
  const u = new URL(path, window.location.origin)
  return { pathname: u.pathname, search: u.search, hash: u.hash }
}
