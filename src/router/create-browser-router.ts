import type {
  BrowserRouterInstance,
  CreateBrowserRouterConfig,
  LocationLike,
  MatchResult,
  Middleware,
  MiddlewareContext,
  NavigationGuardContext,
  Router,
  RouterOptions,
} from './types'
import type { NavigateOptions } from './hooks/types'
import { collectMiddlewares, compose, matchRoutes, normalizePathStartSlash, parseHash, parseQuery, parseUrl, stripBase } from './utils'
import { GuardManager } from './utils/guard-manager'
import { buildUrl } from './utils/url'

export function createBrowserRouter(config: CreateBrowserRouterConfig): BrowserRouterInstance {
  const routes = config.routes
  const options: RouterOptions = config.options ?? {}
  const base = options.base ?? ''
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
    const { pathname, search, hash } = window.location
    return {
      pathname: stripBase(pathname, base),
      search,
      hash,
    }
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
        const url = normalizePathStartSlash(p)
        replaceHistory
          ? window.history.replaceState(null, '', base + url)
          : window.history.pushState(null, '', base + url)
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
      window.history.replaceState(null, '', base + resolvedTarget)
    }
    else {
      window.history.pushState(null, '', base + resolvedTarget)
    }
    notify()

    await guardManager.runAfterEach(resolvedToContext, fromContext)
  }

  const onPop = async () => {
    if (disposed)
      return
    const loc = getLocation()
    const target = loc.pathname + loc.search + loc.hash
    try {
      await runNavigation(target, true)
    }
    catch (error) {
      console.error('[Router] Popstate navigation error:', error)
    }
  }

  window.addEventListener('popstate', onPop)

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
    replace: (path: string | number, options?: NavigateOptions) => {
      if (typeof path === 'number') {
        window.history.go(path)
        return
      }
      const fullUrl = buildUrl(path, options)
      runNavigation(fullUrl, true).catch((error) => {
        console.error('[Router] Replace navigation error:', error)
      })
    },
    back: () => window.history.back(),
    get location() {
      return currentLocation
    },
    beforeEach: guard => guardManager.beforeEach(guard),
    beforeResolve: guard => guardManager.beforeResolve(guard),
    afterEach: guard => guardManager.afterEach(guard),
  }

  const router: BrowserRouterInstance = {
    id: crypto.randomUUID(),
    routes,
    options,
    base,
    getLocation: () => currentLocation,
    subscribe: (listener) => {
      subscribers.add(listener)
      return () => subscribers.delete(listener)
    },

    ...navigationAdapter,
    dispose: () => {
      if (disposed)
        return
      disposed = true
      window.removeEventListener('popstate', onPop)
      subscribers.clear()
      guardManager.clear()
    },
  }

  const initialPath = `${currentLocation.pathname}${currentLocation.search}${currentLocation.hash}`
  runNavigation(initialPath, true).catch((error) => {
    console.error('[Router] Initial navigation error:', error)
  })

  return router
}
