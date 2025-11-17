import type { MatchOptions, PathToRegexpOptions } from 'path-to-regexp'
import type { MatchResult, RouteConfig, RouteObject } from '../types'
import { match as p2rMatch } from 'path-to-regexp'
import { DEFAULT_ROUTE_CONFIG } from '../constants'

/**
 * 合并路由配置
 */
function mergeRouteConfig(base?: RouteConfig, ext?: RouteConfig): RouteConfig {
  return {
    sensitive: ext?.sensitive ?? base?.sensitive ?? DEFAULT_ROUTE_CONFIG.sensitive,
    strict: ext?.strict ?? base?.strict ?? DEFAULT_ROUTE_CONFIG.strict,
    end: ext?.end ?? base?.end ?? DEFAULT_ROUTE_CONFIG.end,
    start: ext?.start ?? base?.start ?? DEFAULT_ROUTE_CONFIG.start,
    delimiter: ext?.delimiter ?? base?.delimiter ?? DEFAULT_ROUTE_CONFIG.delimiter,
    decode: ext?.decode ?? base?.decode ?? DEFAULT_ROUTE_CONFIG.decode,
  }
}

/**
 * 验证路由配置
 */
function validateRouteConfig(cfg: RouteConfig) {
  if (cfg.delimiter && typeof cfg.delimiter !== 'string')
    throw new TypeError('delimiter must be string')
}

// 规范化路由模式，将用户友好的语法转换为 path-to-regexp 能理解的格式
//
// **为什么需要它？**
// path-to-regexp 库使用特定的语法格式，但为了提供更直观的路由模式语法，需要将用户输入的
// 模式转换为库能理解的格式。例如：
// - 双星号 `/**` 表示全路径通配符（类似 React Router 的 splat）
// - 单星号 `/*` 表示单段通配符
// - 问号 `/:param?` 表示可选参数
//
// **没有会怎么样？**
// - 无法使用双星号、单星号等通配符语法
// - 无法使用问号这种可选参数语法
// - 需要用户直接使用 path-to-regexp 的原始语法，降低易用性
//
// **入参和输出示例：**
//
// 全路径通配符（双星号）：
// - `normalizePattern('/files/**')` 返回 `'/files/*splat'`
// - `normalizePattern('/**')` 返回 `'/*splat'`
// - `normalizePattern('/a/**/b')` 返回 `'/a/*splat/b'` (多个双星号都会转换为 *splat)
//
// 单段通配符（单星号）：
// - `normalizePattern('/users/*')` 返回 `'/:splat1'`
// - `normalizePattern('/users/*/posts/*')` 返回 `'/:splat1/:splat2'` (多个单星号会递增编号)
// - `normalizePattern('/*/posts')` 返回 `'/:splat1/posts'`
//
// 可选参数（问号）：
// - `normalizePattern('/users/:id?')` 返回 `'/users/{:id}'`
// - `normalizePattern('/posts/:year?/:month?')` 返回 `'/posts/{:year}/{:month}'`
// - `normalizePattern('/:lang?/about')` 返回 `'/{:lang}/about'`
//
// 组合使用：
// - `normalizePattern('/files/**/download')` 返回 `'/files/*splat/download'`
// - `normalizePattern('/users/:id?/posts/*')` 返回 `'/users/{:id}/:splat1'`
//
// 边界情况：
// - `normalizePattern('/users/:id')` 返回 `'/users/:id'` (普通参数，不转换)
// - `normalizePattern('/')` 返回 `'/'` (根路径，无变化)
// - `normalizePattern('')` 返回 `''` (空字符串，无变化)
// - `normalizePattern('/users/*/posts/**')` 返回 `'/users/:splat1/posts/*splat'` (混合使用)
// - `normalizePattern('/users/:userId?/posts/:postId')` 返回 `'/users/{:userId}/posts/:postId'` (部分可选)
//
// 注意：
// - 单星号的编号从 1 开始，每次遇到新的单星号都会递增
// - 双星号统一转换为 *splat（无编号，因为通常只有一个全路径通配符）
// - 可选参数问号必须紧跟在参数名后，如 `/:id?`，不能有空格

/**
 * 规范化路由模式，将用户友好的语法转换为 path-to-regexp 能理解的格式
 * @param pattern 用户输入的路由模式字符串
 * @returns 转换后的 path-to-regexp 兼容格式
 */
function normalizePattern(pattern: string): string {
  let p = pattern
  // 特殊处理：如果整个模式就是 /*，在 matchPath 中已经处理，这里直接返回
  if (p === '/*') {
    return p
  }
  // 双星号通配符 /** 转换为 /*splat（匹配任意路径）
  // 注意：必须在处理单星号之前处理
  p = p.replace(/\/(\*\*)/g, '/*splat')
  // 单星号通配符 /* 转换为 /:splatN（匹配单个段）
  // 注意：确保不会匹配到 /*splat 中的 /*
  // 对于单独的 /*，在 matchPath 中已经特殊处理
  // 这里的处理是针对路径中的 /*，如 /users/*/posts
  let idx = 0
  p = p.replace(/\/(\*)(?!splat)/g, () => {
    idx += 1
    return `/:splat${idx}`
  })
  // 可选参数 /:id? 转换为 {/:id}（注意顺序，先处理双星号，再处理单星号，最后处理可选参数）
  p = p.replace(/\/(:[A-Za-z0-9_]+)\?/g, '{/$1}')
  return p
}

// 路径匹配与参数解析
//
// **为什么需要它？**
// 这是路由系统的核心匹配函数，负责将 URL 路径与路由模式进行匹配，并提取路径参数。
// 它封装了 path-to-regexp 库，提供了统一的匹配接口，支持多种匹配选项（大小写敏感、完全匹配等）。
//
// **没有会怎么样？**
// - 无法进行路由匹配，整个路由系统无法工作
// - 无法从 URL 中提取动态参数（如 `/users/:id` 中的 `id`）
// - 无法支持灵活的匹配配置（如部分匹配、非严格匹配等）
//
// **入参和输出示例：**
//
// 基础匹配：
// - `matchPath('/users/:id', '/users/123')` → `{ id: '123' }`
// - `matchPath('/users/:id', '/users/123/posts')` → `null` (默认完全匹配)
// - `matchPath('/users/:id', '/users/123/posts', { end: false })` → `{ id: '123' }` (允许部分匹配)
//
// 多个参数：
// - `matchPath('/users/:userId/posts/:postId', '/users/1/posts/2')` → `{ userId: '1', postId: '2' }`
//
// 可选参数（通过 normalizePattern 转换）：
// - `matchPath('/users/:id?', '/users')` → `{ id: undefined }` 或 `{}`
// - `matchPath('/users/:id?', '/users/123')` → `{ id: '123' }`
//
// 通配符（通过 normalizePattern 转换）：
// - `matchPath('/*', '/any/path')` → `{ splat1: 'any/path' }` (单星号 `/*` 转换为 `/:splat1`，键名带数字)
// - `matchPath('/files/**', '/files/a/b/c.txt')` → `{ splat: 'a/b/c.txt' }` (双星号 `/**` 转换为 `/*splat`，键名无数字)
// - `matchPath('/users/*/posts/*', '/users/1/posts/2')` → `{ splat1: '1', splat2: '2' }` (多个单星号递增编号)
//
// 边界情况：
// - `matchPath('/users/:id', '/users')` → `null` (缺少必需参数)
// - `matchPath('/users/:id', '/other/123')` → `null` (路径不匹配)
// - `matchPath('/', '/')` → `{}` (根路径匹配)
// - `matchPath('/users/:id', '/users/')` → `null` (默认严格模式，不允许尾随斜杠)
// - `matchPath('/users/:id', '/users/', { strict: false })` → `{ id: undefined }` 或 `{}`
//
// 大小写敏感：
// - `matchPath('/Users/:id', '/users/123')` → `{ id: '123' }` (默认不敏感)
// - `matchPath('/Users/:id', '/users/123', { sensitive: true })` → `null` (大小写不匹配)
//
// 非起始匹配（start: false）：
// - `matchPath('/users', '/app/users', { start: false })` → `{}` (从中间开始匹配)
//
// URL 编码参数：
// - `matchPath('/users/:name', '/users/John%20Doe')` → `{ name: 'John Doe' }` (自动解码)
// - `matchPath('/users/:name', '/users/John%20Doe', { decode: false })` → `{ name: 'John%20Doe' }` (不解码)

/**
 * @param pattern 路由模式，支持 path-to-regexp 语法，如 `/users/:id`、`/files/**`、`/posts/:id?`
 * @param pathname 目标路径（通常是去除 base 后的相对路径）
 * @param cfg 可选的匹配配置，覆盖默认配置
 * @returns 匹配成功返回参数字典，失败返回 null。参数值可能是字符串或字符串数组（对于重复参数）
 */
export function matchPath(pattern: string, pathname: string, cfg?: RouteConfig): Record<string, string | string[]> | null {
  // 特殊处理空路径
  if (pattern === '' && pathname === '') {
    return null
  }

  // 特殊处理单星号通配符 /* - 匹配任意路径
  if (pattern === '/*') {
    if (pathname === '/') {
      return { splat1: '' }
    }
    return { splat1: pathname.slice(1) }
  }

  const config = mergeRouteConfig(DEFAULT_ROUTE_CONFIG, cfg)
  validateRouteConfig(config)

// 特殊处理根路径在允许部分匹配时的情况：
// path-to-regexp 对 `'/'` 模式即便在 `end: false` 时也只会匹配精确的 `'/'`
// 这会导致带 children 的根路由无法被识别成“父节点”，下游像 NestedOutlet
// 这样的组件就拿不到正确的 parentRoute，从而阻断子路由渲染或造成递归。
// 根路径本身没有参数，因此在允许部分匹配时可以直接认为命中。
  if (pattern === '/' && config.end === false) {
    return pathname.startsWith('/')
      ? {}
      : null
  }

  const normalized = normalizePattern(pattern)
  const options: MatchOptions & PathToRegexpOptions = {
    sensitive: !!config.sensitive,
    end: config.end !== false,
    delimiter: config.delimiter ?? '/',
    decode: config.decode === false
      ? false
      : decodeURIComponent,
  }

  const fn = p2rMatch(normalized, options)
  let res = fn(pathname)

  if (!res && config.start === false) {
    const segs = pathname.split('/').filter(Boolean)
    for (let i = 1; i < segs.length && !res; i++) {
      const sub = `/${segs.slice(i).join('/')}`
      res = fn(sub)
    }
  }
  if (!res)
    return null
  return res.params as Record<string, string | string[]>
}

/**
 * 递归匹配路由
 * @param routes 路由数组
 * @param pathname 当前路径
 * @param global 全局路由配置
 * @param parent 父路由（用于嵌套路由）
 * @param routeChain 当前路由链（从根到当前）
 * @returns 匹配结果或 null
 */
export function matchRoutes(
  routes: RouteObject[],
  pathname: string,
  global?: RouteConfig,
  parent?: RouteObject,
  routeChain: RouteObject[] = [],
): MatchResult | null {
  for (const route of routes) {
    // 如果路由有子路由，先尝试用 end: false 匹配父路由（允许匹配子路径）
    const routeConfig = mergeRouteConfig(DEFAULT_ROUTE_CONFIG, mergeRouteConfig(global, route.config))
    let m: Record<string, string | string[]> | null = null

    if (route.children && route.children.length) {
      // 对于有子路由的路由，使用 end: false 来匹配，以便能够匹配子路径
      const parentConfig = { ...routeConfig, end: false }
      m = matchPath(route.path, pathname, parentConfig)

      if (m) {
        const currentChain = [...routeChain, route]
        // 尝试匹配子路由
        const childRes = matchRoutes(route.children, pathname, global, route, currentChain)
        if (childRes)
          return childRes

        // 如果子路由不匹配，检查父路由本身是否匹配（使用原始配置）
        const exactMatch = matchPath(route.path, pathname, routeConfig)
        if (exactMatch) {
          return { route, params: exactMatch, parent, routeChain: currentChain }
        }
      }
    }
    else {
      // 没有子路由的路由，使用原始配置匹配
      m = matchPath(route.path, pathname, routeConfig)
      if (m) {
        const currentChain = [...routeChain, route]
        return { route, params: m, parent, routeChain: currentChain }
      }
    }
  }

  return null
}

/**
 * 匹配路径模式（字符串或正则表达式）
 * @param pathname 要匹配的路径
 * @param pattern 模式（字符串或正则表达式）
 * @returns 是否匹配
 */
export function matchPattern(pathname: string, pattern: string | RegExp): boolean {
  if (typeof pattern === 'string') {
    return pathname === pattern
  }
  return pattern.test(pathname)
}
