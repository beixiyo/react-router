import type { LocationLike, MatchResult, Middleware, MiddlewareContext, NavigationGuardContext, RouteObject, RouterOptions } from '../types'
import type { GuardManager } from '../utils/guard-manager'
import { useCallback } from 'react'
import { collectMiddlewares, matchRoutes, normalizePathStartSlash, parseHash, parseQuery, parseUrl, stripBase } from '../utils'
import { compose } from '../utils/middleware'

/**
 * 导航相关的 hook，提取了 RouterProvider 中的导航逻辑
 *
 * @param routes 路由配置
 * @param options 路由器选项
 * @param base 基础路径
 * @param guardManager 守卫管理器实例
 * @returns 导航相关的函数和状态
 */
export function useNavigation(
  routes: RouteObject[],
  options: RouterOptions,
  base: string,
  guardManager: GuardManager,
) {
  const routeConfig = options.routeConfig

  /**
   * 获取当前位置（移除基础路径后的相对路径）
   */
  const getLocation = useCallback((basePath: string): LocationLike => {
    const { pathname, search, hash } = window.location
    return { pathname: stripBase(pathname, basePath), search, hash }
  }, [])

  /**
   * 匹配路由（不创建元素，避免中间件重定向时的性能浪费）
   * @param pathname 路径名
   * @returns 匹配结果和中间件链
   */
  const matchRoute = useCallback((pathname: string): { match: MatchResult | null, chain: Middleware[] } => {
    const match = matchRoutes(routes, pathname, routeConfig)
    if (!match) {
      return { match: null, chain: [] }
    }
    const chain = collectMiddlewares(routes, match.route)
    return { match, chain }
  }, [routes, routeConfig])

  /**
   * 构建导航守卫上下文
   */
  const buildGuardContext = useCallback((
    location: LocationLike,
    match: MatchResult | null,
    fromLocation?: LocationLike,
  ): NavigationGuardContext => {
    return {
      to: location,
      from: fromLocation ?? getLocation(base),
      params: match?.params ?? {},
      query: parseQuery(location.search),
      hashQuery: parseHash(location.hash),
      meta: match?.route.meta,
      route: match?.route,
    }
  }, [base, getLocation])

  /**
   * 导航到指定路径
   * @param path 目标路径
   * @param replace 是否替换当前历史记录（而不是添加新记录）
   * @param onNavigate 导航完成后的回调（用于更新 location 状态）
   */
  const navigateTo = useCallback(async (
    path: string,
    replace: boolean,
    onNavigate: () => void,
  ) => {
    const target = normalizePathStartSlash(path)
    const from = getLocation(base)
    const to = parseUrl(target)

    // 先匹配路由和收集中间件，不创建元素（避免中间件重定向时的性能浪费）
    const { match } = matchRoute(to.pathname)

    // 构建守卫上下文
    const toContext = buildGuardContext(to, match, from)
    const fromContext = buildGuardContext(from, null, from)

    // 1. 执行 beforeEach 守卫
    const beforeEachResult = await guardManager.runBeforeEach(toContext, fromContext)
    if (!beforeEachResult.shouldContinue) {
      if (beforeEachResult.redirectPath) {
        // 重定向
        navigateTo(beforeEachResult.redirectPath, replace, onNavigate)
      }
      // 取消导航
      return
    }

    // 如果 beforeEach 中发生了重定向，使用重定向后的路径
    const finalTarget = beforeEachResult.redirectPath
      ? normalizePathStartSlash(beforeEachResult.redirectPath)
      : target
    const finalTo = parseUrl(finalTarget)
    const finalMatch = matchRoute(finalTo.pathname)
    const finalToContext = buildGuardContext(finalTo, finalMatch.match, from)

    // 2. 执行路由中间件
    const ctx: MiddlewareContext = {
      to: finalTo,
      from,
      params: finalMatch.match?.params ?? {},
      query: parseQuery(finalTo.search),
      hashQuery: parseHash(finalTo.hash),
      meta: finalMatch.match?.route.meta,
      state: {},
      redirect: (p: string) => {
        const url = normalizePathStartSlash(p)
        replace
          ? window.history.replaceState(null, '', base + url)
          : window.history.pushState(null, '', base + url)
        onNavigate()
      },
    }

    // 执行中间件，如果通过则继续
    const run = compose(finalMatch.chain)
    let middlewareCancelled = false
    await new Promise<void>((resolve, reject) => {
      run(ctx, async (p?: string | false) => {
        if (p === false) {
          // 中间件取消导航
          middlewareCancelled = true
          resolve()
          return
        }
        if (typeof p === 'string') {
          // 中间件重定向，递归调用 navigateTo
          navigateTo(p, replace, onNavigate).then(resolve).catch(reject)
          return
        }
        resolve()
      })
    })

    // 如果中间件取消了导航，直接返回
    if (middlewareCancelled) {
      return
    }

    // 3. 执行 beforeResolve 守卫
    const beforeResolveResult = await guardManager.runBeforeResolve(finalToContext, fromContext)
    if (!beforeResolveResult.shouldContinue) {
      if (beforeResolveResult.redirectPath) {
        // 重定向
        navigateTo(beforeResolveResult.redirectPath, replace, onNavigate)
      }
      // 取消导航
      return
    }

    // 如果 beforeResolve 中发生了重定向，使用重定向后的路径
    const resolvedTarget = beforeResolveResult.redirectPath
      ? normalizePathStartSlash(beforeResolveResult.redirectPath)
      : finalTarget
    const resolvedTo = parseUrl(resolvedTarget)
    const resolvedMatch = matchRoute(resolvedTo.pathname)
    const resolvedToContext = buildGuardContext(resolvedTo, resolvedMatch.match, from)

    // 4. 执行导航（更新 history 和 location）
    replace
      ? window.history.replaceState(null, '', base + resolvedTarget)
      : window.history.pushState(null, '', base + resolvedTarget)
    onNavigate()

    // 5. 执行 afterEach 守卫（支持异步）
    await guardManager.runAfterEach(resolvedToContext, fromContext)
  }, [base, getLocation, matchRoute, guardManager, buildGuardContext])

  return {
    getLocation,
    navigateTo,
    matchRoute,
  }
}
