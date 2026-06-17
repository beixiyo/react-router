import type { ReactElement } from 'react'
import type { LocationLike, RouteObject, RouterOptions } from '../types'
import { createElement, useContext, useEffect, useMemo, useReducer } from 'react'
import { LocationCtx, RouterCtx } from '../context'
import { isCacheKeyMatched } from '../renderer/cache-control'
import { getCachedElement, updateCache, useCacheConfig, useCacheMap } from '../renderer/cache'
import { createRouteElement, emptyElement } from '../renderer/route-matcher'
import { matchLayout, matchRoutes } from '../utils'
import { KeepAlive, KeepAliveProvider } from './KeepAlive'

function wrapWithLayout(element: ReactElement, options: RouterOptions, pathname: string): ReactElement {
  const layouts = options.layouts
  if (!layouts?.length)
    return element

  const layout = layouts.find(l => matchLayout(pathname, l))
  if (!layout)
    return element

  return createElement(layout.component, null, element)
}

/**
 * 根节点 Outlet：渲染整个路由树
 */
export function RootOutlet({
  routes,
  location,
  options,
}: {
  routes: RouteObject[]
  location: LocationLike
  options: RouterOptions
}) {
  const { cacheKey, effectiveLimit, eligible } = useCacheConfig(options, location)
  const cache = useCacheMap(effectiveLimit)
  const router = useContext(RouterCtx)
  const [, forceRender] = useReducer(n => n + 1, 0)

  useEffect(() => {
    if (!router)
      return

    return router.subscribeCache((event) => {
      if (event.type === 'clear') {
        cache.clear()
      }
      else {
        for (const key of [...cache.keys()]) {
          if (isCacheKeyMatched(key, event.matcher))
            cache.delete(key)
        }
      }

      forceRender()
    })
  }, [cache, router])

  /**
   * 在 useMemo 中检查缓存，如果缓存命中，直接返回缓存中的元素
   * 这确保相同路径时，React 会复用相同的元素引用，保持缓存状态
   */
  const currentElement = useMemo(() => {
    /** 如果缓存启用且缓存命中，直接返回缓存中的元素 */
    if (eligible && effectiveLimit !== undefined) {
      const cached = getCachedElement(cache, cacheKey, location)
      if (cached) {
        return cached
      }
    }

    /** 缓存未命中，计算新元素 */
    const match = matchRoutes(routes, location.pathname, options.routeConfig)
    let element: ReactElement

    if (!match) {
      const NotFound = options.notFoundComponent
      element = NotFound
        ? (typeof NotFound === 'function'
            ? createElement(NotFound)
            : NotFound)
        : emptyElement('Not Found')
    }
    else {
      element = createRouteElement(match.route, match, options)
    }

    element = wrapWithLayout(element, options, location.pathname)

    /** 如果缓存启用，将新元素存入缓存（包括 NotFound） */
    if (eligible && effectiveLimit !== undefined) {
      updateCache(cache, cacheKey, element, location, effectiveLimit)
    }

    return element
  }, [routes, location.pathname, location.search, location.hash, options.routeConfig, options.notFoundComponent, options.layouts, cacheKey, eligible, effectiveLimit, cache])

  return (
    <KeepAliveProvider>
      { [...cache.values()].map(item => (
        <LocationCtx.Provider key={item.key} value={item.location}>
          <KeepAlive
            uniqueKey={item.key}
            active={item.key === cacheKey && eligible}
          >
            { item.element }
          </KeepAlive>
        </LocationCtx.Provider>
      )) }
      { !eligible && currentElement }
    </KeepAliveProvider>
  )
}
