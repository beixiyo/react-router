import type { NavigateOptions } from '../hooks/types'
import type { BrowserRouterInstance, HashRouterInstance, PushMethod, PushReplaceOptions, ReplaceMethod, Router } from '../types'
import { matchRoutes } from './match'
import { getGlobalRouter, getGlobalRouterInstance } from './navigate'
import { parseQuery } from './parser'
import { searchParamsToObject } from './url'

/**
 * 合并两个对象，支持数组值
 */
function mergeParams(
  current: Record<string, string | string[]>,
  newParams: Record<string, string | number | string[] | undefined>,
  replace: boolean = false,
): Record<string, string | number | string[]> {
  if (replace) {
    // 覆盖模式：只保留新参数，过滤掉 undefined
    const result: Record<string, string | number | string[]> = {}
    for (const [key, value] of Object.entries(newParams)) {
      if (value !== undefined && value !== null) {
        result[key] = value
      }
    }
    return result
  }
  else {
    // 合并模式：先复制当前参数，再添加新参数
    const result: Record<string, string | number | string[]> = { ...current }
    for (const [key, value] of Object.entries(newParams)) {
      if (value !== undefined && value !== null) {
        result[key] = value
      }
      else {
        // 如果值为 undefined，删除该参数
        delete result[key]
      }
    }
    return result
  }
}

/**
 * 获取当前路由的 params
 */
function getCurrentParams(
  routerInstance: BrowserRouterInstance | HashRouterInstance,
): Record<string, string | string[]> {
  const location = routerInstance.location
  if (!location?.pathname) {
    return {}
  }

  // 使用路由配置匹配当前路径以获取 params
  const match = matchRoutes(
    routerInstance.routes,
    location.pathname,
    routerInstance.options.routeConfig,
  )

  return match?.params || {}
}

/**
 * 处理 push/replace 的公共逻辑
 */
function processNavigation(
  router: Router,
  routerInstance: BrowserRouterInstance | HashRouterInstance,
  pathOrOptions?: string | PushReplaceOptions,
  options?: PushReplaceOptions,
  isReplace: boolean = false,
): void {
  const location = routerInstance.getLocation()
  const currentQuery = location?.search
    ? searchParamsToObject(parseQuery(location.search))
    : {}

  // 判断第一个参数是 path 还是 options
  let targetPath: string
  let opts: PushReplaceOptions

  if (typeof pathOrOptions === 'string') {
    targetPath = pathOrOptions
    opts = options || {}
  }
  else {
    // 如果没有提供 path，使用当前 pathname
    targetPath = location?.pathname || '/'
    opts = pathOrOptions || {}
  }

  // 处理 params
  let finalParams: Record<string, string | number | string[]> | undefined
  if (opts.params) {
    if (typeof pathOrOptions === 'string') {
      // 如果提供了 path，params 直接用于替换 path 中的占位符
      finalParams = opts.params
    }
    else {
      // 如果没有提供 path，合并到当前 params
      const currentParams = getCurrentParams(routerInstance)
      finalParams = mergeParams(currentParams, opts.params, opts.replaceParams)
    }
  }

  // 处理 query
  let finalQuery: Record<string, string | number | string[] | undefined> | undefined
  if (opts.query) {
    finalQuery = mergeParams(currentQuery, opts.query, opts.replaceQuery)
  }
  else if (!opts.replaceQuery) {
    // 如果没有提供新 query 且不是替换模式，保留当前 query
    finalQuery = currentQuery
  }

  // 构建导航选项
  const navigateOptions: NavigateOptions = {
    params: finalParams,
    query: finalQuery,
    hash: opts.hash,
    replace: isReplace,
  }

  // 直接调用 navigate 方法，传入 replace 选项，避免循环调用
  router.navigate(targetPath, navigateOptions)
}

/**
 * 创建 push 方法，绑定到 router 实例
 * @internal
 */
export function createPushMethod(
  router: Router,
  routerInstance: BrowserRouterInstance | HashRouterInstance,
): PushMethod {
  return (
    pathOrOptions?: string | PushReplaceOptions,
    options?: PushReplaceOptions,
  ) => {
    processNavigation(router, routerInstance, pathOrOptions, options, false)
  }
}

/**
 * 创建 replace 方法，绑定到 router 实例
 * @internal
 */
export function createReplaceMethod(
  router: Router,
  routerInstance: BrowserRouterInstance | HashRouterInstance,
): ReplaceMethod {
  return (
    pathOrOptions?: string | PushReplaceOptions,
    options?: PushReplaceOptions,
  ) => {
    processNavigation(router, routerInstance, pathOrOptions, options, true)
  }
}

/**
 * Push 导航方法，类似 Vue Router
 * 默认合并 params 和 query，可通过配置项支持覆盖
 *
 * @param options 导航选项
 * @example
 * ```ts
 * import { push } from '@/router'
 *
 * // 合并 query 参数
 * push({ query: { page: 2 } })
 *
 * // 覆盖 query 参数
 * push({ query: { page: 2 }, replaceQuery: true })
 *
 * // 合并 params（需要知道当前路由路径模板）
 * push({ params: { id: '456' } })
 *
 * // 覆盖 params
 * push({ params: { id: '456' }, replaceParams: true })
 *
 * // 组合使用
 * push({
 *   params: { id: '456' },
 *   query: { page: 2, sort: 'desc' },
 *   hash: { section: 'comments' }
 * })
 * ```
 */
export function push(options?: PushReplaceOptions): void
/**
 * Push 导航方法，类似 Vue Router
 * 支持指定路径，默认合并 params 和 query
 *
 * @param path 目标路径
 * @param options 导航选项
 * @example
 * ```ts
 * import { push } from '@/router'
 *
 * // 指定路径并合并 query
 * push('/users/123', { query: { page: 2 } })
 *
 * // 指定路径并覆盖 query
 * push('/users/123', { query: { page: 2 }, replaceQuery: true })
 * ```
 */
export function push(path: string, options?: PushReplaceOptions): void
export function push(
  pathOrOptions?: string | PushReplaceOptions,
  options?: PushReplaceOptions,
): void {
  const router = getGlobalRouter()
  const routerInstance = getGlobalRouterInstance()
  if (!router || !routerInstance) {
    console.warn(
      'push() called outside of RouterProvider. '
      + 'Make sure RouterProvider is mounted before calling push().',
    )
    return
  }

  processNavigation(router, routerInstance, pathOrOptions, options, false)
}

/**
 * Replace 导航方法，类似 Vue Router
 * 默认合并 params 和 query，可通过配置项支持覆盖
 *
 * @param options 导航选项
 * @example
 * ```ts
 * import { replace } from '@/router'
 *
 * // 合并 query 参数
 * replace({ query: { page: 2 } })
 *
 * // 覆盖 query 参数
 * replace({ query: { page: 2 }, replaceQuery: true })
 * ```
 */
export function replace(options?: PushReplaceOptions): void
/**
 * Replace 导航方法，类似 Vue Router
 * 支持指定路径，默认合并 params 和 query
 *
 * @param path 目标路径
 * @param options 导航选项
 * @example
 * ```ts
 * import { replace } from '@/router'
 *
 * // 指定路径并合并 query
 * replace('/users/123', { query: { page: 2 } })
 *
 * // 指定路径并覆盖 query
 * replace('/users/123', { query: { page: 2 }, replaceQuery: true })
 * ```
 */
export function replace(path: string, options?: PushReplaceOptions): void
export function replace(
  pathOrOptions?: string | PushReplaceOptions,
  options?: PushReplaceOptions,
): void {
  const router = getGlobalRouter()
  const routerInstance = getGlobalRouterInstance()
  if (!router || !routerInstance) {
    console.warn(
      'replace() called outside of RouterProvider. '
      + 'Make sure RouterProvider is mounted before calling replace().',
    )
    return
  }

  processNavigation(router, routerInstance, pathOrOptions, options, true)
}
