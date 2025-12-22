import type { NavigateOptions } from './hooks/types'
import type {
  LocationLike,
  MatchResult,
  Middleware,
  MiddlewareContext,
  NavigationGuardContext,
  RouteObject,
  Router,
  RouterOptions,
} from './types'
import { nanoid } from 'nanoid'
import { collectMiddlewares, compose, matchRoutes, normalizePathStartSlash, parseHash, parseQuery, parseUrl } from './utils'
import { GuardManager } from './utils/guard-manager'
import { createPushMethod, createReplaceMethod } from './utils/push-replace'
import { buildUrl } from './utils/url'

/**
 * URL 适配器接口，用于处理不同路由模式下的 URL 操作
 */
export interface URLAdapter {
  /** 获取当前位置 */
  getLocation: (base: string) => LocationLike
  /** 更新 URL（push 模式） */
  updateURL: (path: string, base: string) => void
  /** 替换 URL（replace 模式） */
  replaceURL: (path: string, base: string) => void
  /** 在中间件中重定向时更新 URL */
  redirectURL: (path: string, base: string, replaceHistory: boolean) => void
  /** 设置事件监听器 */
  setupEventListener: (callback: () => void | Promise<void>) => () => void
  /** 初始化逻辑（可选） */
  initialize?: (base: string, getLocation: () => LocationLike) => LocationLike
}

/**
 * 基础路由器配置
 */
export interface BaseRouterConfig {
  routes: RouteObject[]
  options?: RouterOptions
  urlAdapter: URLAdapter
}

/**
 * 基础路由器实例接口
 */
export interface BaseRouterInstance extends Router {
  id: string
  routes: RouteObject[]
  options: RouterOptions
  base: string
  getLocation: () => LocationLike
  subscribe: (listener: (location: LocationLike) => void) => () => void
  dispose: () => void
}

/**
 * 创建基础路由器
 */
export function createBaseRouter<T extends BaseRouterInstance>(
  config: BaseRouterConfig,
  createRouterInstance: (params: {
    id: string
    routes: RouteObject[]
    options: RouterOptions
    base: string
    getLocation: () => LocationLike
    subscribe: (listener: (location: LocationLike) => void) => () => void
    navigationAdapter: Router
    dispose: () => void
  }) => T,
): T {
  const routes = config.routes
  const options: RouterOptions = config.options ?? {}
  const base = options.base ?? ''
  const urlAdapter = config.urlAdapter
  const guardManager = new GuardManager()
  const subscribers = new Set<(location: LocationLike) => void>()
  let disposed = false

  if (options.beforeEach)
    guardManager.beforeEach(options.beforeEach)
  if (options.beforeResolve)
    guardManager.beforeResolve(options.beforeResolve)
  if (options.afterEach)
    guardManager.afterEach(options.afterEach)

  const getLocation = (): LocationLike => {
    return urlAdapter.getLocation(base)
  }

  const notify = () => {
    if (disposed)
      return
    currentLocation = getLocation()
    router.location = currentLocation
    subscribers.forEach((listener) => {
      try {
        listener(currentLocation)
      }
      catch (error) {
        console.error('[Router] Error notifying subscriber:', error)
      }
    })
  }

  let currentLocation = getLocation()

  // 如果有初始化逻辑，执行它
  if (urlAdapter.initialize) {
    currentLocation = urlAdapter.initialize(base, getLocation)
  }

  const matchRoute = (pathname: string): { match: MatchResult | null, chain: Middleware[] } => {
    const match = matchRoutes(routes, pathname, options.routeConfig)
    if (!match)
      return { match: null, chain: [] }
    const chain = collectMiddlewares(routes, match.route)
    return { match, chain }
  }

  const buildGuardContext = (
    location: LocationLike,
    match: MatchResult | null,
    fromLocation?: LocationLike,
  ): NavigationGuardContext => {
    return {
      to: location,
      from: fromLocation ?? getLocation(),
      params: match?.params ?? {},
      query: parseQuery(location.search),
      hashQuery: parseHash(location.hash),
      meta: match?.route.meta,
      route: match?.route,
    }
  }

  const runNavigation = async (path: string, replaceHistory: boolean): Promise<void> => {
    const target = normalizePathStartSlash(path)
    const from = currentLocation
    const to = parseUrl(target)
    const { match } = matchRoute(to.pathname)
    const toContext = buildGuardContext(to, match, from)
    const fromContext = buildGuardContext(from, null, from)

    const beforeEachResult = await guardManager.runBeforeEach(toContext, fromContext)
    if (!beforeEachResult.shouldContinue) {
      if (beforeEachResult.redirectPath) {
        await runNavigation(beforeEachResult.redirectPath, replaceHistory)
      }
      return
    }

    const finalTarget = beforeEachResult.redirectPath
      ? normalizePathStartSlash(beforeEachResult.redirectPath)
      : target
    const finalTo = parseUrl(finalTarget)
    const finalMatch = matchRoute(finalTo.pathname)
    const finalToContext = buildGuardContext(finalTo, finalMatch.match, from)

    const ctx: MiddlewareContext = {
      to: finalTo,
      from,
      params: finalMatch.match?.params ?? {},
      query: parseQuery(finalTo.search),
      hashQuery: parseHash(finalTo.hash),
      meta: finalMatch.match?.route.meta,
      state: {},
      redirect: (p: string) => {
        urlAdapter.redirectURL(normalizePathStartSlash(p), base, replaceHistory)
        notify()
      },
    }

    const run = compose(finalMatch.chain)
    let middlewareCancelled = false
    await new Promise<void>((resolve, reject) => {
      run(ctx, async (p?: string | false) => {
        if (p === false) {
          middlewareCancelled = true
          resolve()
          return
        }
        if (typeof p === 'string') {
          runNavigation(p, replaceHistory).then(resolve).catch(reject)
          return
        }
        resolve()
      })
    })

    if (middlewareCancelled)
      return

    const beforeResolveResult = await guardManager.runBeforeResolve(finalToContext, fromContext)
    if (!beforeResolveResult.shouldContinue) {
      if (beforeResolveResult.redirectPath) {
        await runNavigation(beforeResolveResult.redirectPath, replaceHistory)
      }
      return
    }

    const resolvedTarget = beforeResolveResult.redirectPath
      ? normalizePathStartSlash(beforeResolveResult.redirectPath)
      : finalTarget
    const resolvedTo = parseUrl(resolvedTarget)
    const resolvedMatch = matchRoute(resolvedTo.pathname)
    const resolvedToContext = buildGuardContext(resolvedTo, resolvedMatch.match, from)

    if (replaceHistory) {
      urlAdapter.replaceURL(resolvedTarget, base)
    }
    else {
      urlAdapter.updateURL(resolvedTarget, base)
    }
    notify()

    await guardManager.runAfterEach(resolvedToContext, fromContext)
  }

  const onLocationChange = async () => {
    if (disposed)
      return
    const loc = getLocation()
    const target = loc.pathname + loc.search + loc.hash
    try {
      await runNavigation(target, true)
    }
    catch (error) {
      console.error('[Router] Location change navigation error:', error)
    }
  }

  const removeEventListener = urlAdapter.setupEventListener(onLocationChange)

  const navigationAdapter: Router = {
    navigate: (path: string | number, options?: NavigateOptions) => {
      if (typeof path === 'number') {
        if (path === -1) {
          window.history.back()
        }
        else {
          window.history.go(path)
        }
        return
      }
      const fullUrl = buildUrl(path, options)
      const replaceHistory = options?.replace ?? false
      runNavigation(fullUrl, replaceHistory).catch((error) => {
        console.error('[Router] Navigation error:', error)
      })
    },
    back: () => window.history.back(),
    get location() {
      return currentLocation
    },
    beforeEach: guard => guardManager.beforeEach(guard),
    beforeResolve: guard => guardManager.beforeResolve(guard),
    afterEach: guard => guardManager.afterEach(guard),
    replace: () => {
      // 占位符，将在创建 router 实例后替换
    },
    push: () => {
      // 占位符，将在创建 router 实例后替换
    },
  }

  const router = createRouterInstance({
    id: nanoid(),
    routes,
    options,
    base,
    getLocation: () => currentLocation,
    subscribe: (listener) => {
      subscribers.add(listener)
      return () => subscribers.delete(listener)
    },
    navigationAdapter,
    dispose: () => {
      if (disposed)
        return
      disposed = true
      removeEventListener()
      subscribers.clear()
      guardManager.clear()
    },
  })

  // 在创建 router 实例后，绑定 push 和 replace 方法
  router.push = createPushMethod(router, router)
  router.replace = createReplaceMethod(router, router)

  const initialPath = `${currentLocation.pathname}${currentLocation.search}${currentLocation.hash}`
  runNavigation(initialPath, true).catch((error) => {
    console.error('[Router] Initial navigation error:', error)
  })

  return router
}
