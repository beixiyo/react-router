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
import type { RouterHistoryState } from './utils/nav-direction'
import { nanoid } from 'nanoid'
import { createRouterCacheController } from './renderer/cache-control'
import { collectMiddlewares, compose, matchRoutes, normalizePathStartSlash, parseHash, parseQuery, parseUrl } from './utils'
import { GuardManager } from './utils/guard-manager'
import { createNavigationDirectionTracker, readNavigationPosition } from './utils/nav-direction'
import { createPushMethod, createReplaceMethod } from './utils/push-replace'
import { buildUrl } from './utils/url'

/** runNavigation 的触发来源 */
type NavigationSource = 'push' | 'replace' | 'popstate'

/**
 * 一次导航的意图描述：来源、popstate 携带的位点、是否为重定向递归
 */
interface NavigationIntent {
  source: NavigationSource
  /** popstate 源在事件第一时间捕获的目标条目位点（其余来源恒为 undefined） */
  incomingPosition?: number
  /** 守卫 / 中间件重定向的递归导航：方向一律记 replace，不触发方向滑动 */
  isRedirect?: boolean
}

/**
 * URL 适配器接口，用于处理不同路由模式下的 URL 操作
 *
 * state 参数：导航方向的位点信息，要求与 URL 在**同一次** pushState / replaceState 中
 * 原子写入（hash 的 `location.hash =` 无法携带 state，允许紧随其后同一同步任务内补写）
 */
export interface URLAdapter {
  /** 获取当前位置 */
  getLocation: (base: string) => LocationLike
  /** 更新 URL（push 模式） */
  updateURL: (path: string, base: string, state?: RouterHistoryState) => void
  /** 替换 URL（replace 模式） */
  replaceURL: (path: string, base: string, state?: RouterHistoryState) => void
  /** 在中间件中重定向时更新 URL */
  redirectURL: (path: string, base: string, replaceHistory: boolean, state?: RouterHistoryState) => void
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
export function createBaseRouter(config: BaseRouterConfig): BaseRouterInstance {
  const routes = config.routes
  const options: RouterOptions = config.options ?? {}
  const base = options.base ?? ''
  const urlAdapter = config.urlAdapter
  const guardManager = new GuardManager()
  const cacheController = createRouterCacheController()
  const directionTracker = createNavigationDirectionTracker()
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

  /** 如果有初始化逻辑，执行它 */
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

  const runNavigation = async (path: string, replaceHistory: boolean, intent?: NavigationIntent): Promise<void> => {
    const source: NavigationSource = intent?.source ?? (replaceHistory
      ? 'replace'
      : 'push')

    /**
     * 守卫 / 中间件重定向的统一入口：方向一律记 replace（无「栈方向」语义，如未登录跳转登录页），
     * source 与 incomingPosition 原样透传——popstate 源被重定向时位点账本仍需与真实历史栈同步
     */
    const redirectTo = (p: string) => runNavigation(p, replaceHistory, {
      source,
      incomingPosition: intent?.incomingPosition,
      isRedirect: true,
    })

    const target = normalizePathStartSlash(path)
    const from = currentLocation
    const to = parseUrl(target)
    const { match } = matchRoute(to.pathname)
    const toContext = buildGuardContext(to, match, from)
    const fromContext = buildGuardContext(from, null, from)

    const beforeEachResult = await guardManager.runBeforeEach(toContext, fromContext)
    if (!beforeEachResult.shouldContinue) {
      if (beforeEachResult.redirectPath) {
        await redirectTo(beforeEachResult.redirectPath)
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
        const stamp = directionTracker.mark(replaceHistory
          ? 'replace'
          : 'push', 'replace')
        urlAdapter.redirectURL(normalizePathStartSlash(p), base, replaceHistory, stamp)
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
          /**
           * 字符串重定向即接管本次导航：必须短路外层，
           * 否则外层会继续 beforeResolve、把 URL 覆写回原目标、并覆盖方向标记
           */
          middlewareCancelled = true
          redirectTo(p).then(resolve).catch(reject)
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
        await redirectTo(beforeResolveResult.redirectPath)
      }
      return
    }

    const resolvedTarget = beforeResolveResult.redirectPath
      ? normalizePathStartSlash(beforeResolveResult.redirectPath)
      : finalTarget
    const resolvedTo = parseUrl(resolvedTarget)
    const resolvedMatch = matchRoute(resolvedTo.pathname)
    const resolvedToContext = buildGuardContext(resolvedTo, resolvedMatch.match, from)

    /**
     * 先按「实际历史操作」结账（popstate 同步位点 / push 递增 / replace 不变），
     * 拿到应写入的位点 state，再与 URL 一并原子写入；
     * 重定向递归通过 override 把方向修正为 replace，但位点仍跟随真实操作
     */
    const stamp = directionTracker.mark(
      source === 'popstate'
        ? { pop: intent?.incomingPosition }
        : replaceHistory
          ? 'replace'
          : 'push',
      intent?.isRedirect
        ? 'replace'
        : undefined,
    )

    if (replaceHistory) {
      urlAdapter.replaceURL(resolvedTarget, base, stamp)
    }
    else {
      urlAdapter.updateURL(resolvedTarget, base, stamp)
    }

    notify()

    await guardManager.runAfterEach(resolvedToContext, fromContext)
  }

  const onLocationChange = async () => {
    if (disposed)
      return
    /**
     * 必须在任何 URL / history.state 变更之前读取：popstate 触发的瞬间，
     * history.state 就是浏览器已经恢复好的目标条目状态；
     * 后续 replaceURL 会用新 state 覆写当前条目，届时再读为时已晚
     */
    const incomingPosition = readNavigationPosition()
    const loc = getLocation()
    const target = loc.pathname + loc.search + loc.hash
    try {
      await runNavigation(target, true, { source: 'popstate', incomingPosition })
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
    get navigationDirection() {
      return directionTracker.current
    },
    beforeEach: guard => guardManager.beforeEach(guard),
    beforeResolve: guard => guardManager.beforeResolve(guard),
    afterEach: guard => guardManager.afterEach(guard),
    clearCache: cacheController.clearCache,
    deleteCache: cacheController.deleteCache,
    subscribeCache: cacheController.subscribeCache,
    subscribe: (listener) => {
      subscribers.add(listener)
      return () => subscribers.delete(listener)
    },
    replace: () => {
      /** 占位符，将在创建 router 实例后替换 */
    },
    push: () => {
      /** 占位符，将在创建 router 实例后替换 */
    },
  }

  /**
   * 用属性描述符合并而非展开：navigationAdapter 上 location / navigationDirection
   * 是「活的 getter」，spread 会在展开那一刻把它们求值成静态值、此后永不更新——
   * 保留 getter 后无需在 notify 里逐字段手动同步
   */
  const router = Object.defineProperties(
    {
      id: nanoid(),
      routes,
      options,
      base,
      getLocation: () => currentLocation,
      dispose: () => {
        if (disposed)
          return
        disposed = true
        removeEventListener()
        subscribers.clear()
        guardManager.clear()
      },
    },
    Object.getOwnPropertyDescriptors(navigationAdapter),
  ) as BaseRouterInstance

  /** 在创建 router 实例后，绑定 push 和 replace 方法 */
  router.push = createPushMethod(router, router)
  router.replace = createReplaceMethod(router, router)

  const initialPath = `${currentLocation.pathname}${currentLocation.search}${currentLocation.hash}`
  runNavigation(initialPath, true).catch((error) => {
    console.error('[Router] Initial navigation error:', error)
  })

  return router
}
