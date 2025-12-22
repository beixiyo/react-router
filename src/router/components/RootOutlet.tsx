import type { LocationLike, RouteObject, RouterOptions } from '../types'
import { Activity, useMemo } from 'react'
import { LocationCtx } from '../context'
import { getCachedElement, updateCache, useCacheConfig, useCacheMap } from '../renderer/cache'
import { createRouteElement, emptyElement } from '../renderer/route-matcher'
import { matchRoutes } from '../utils'

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

  // 在 useMemo 中检查缓存，如果缓存命中，直接返回缓存中的元素
  // 这确保相同路径时，React 会复用相同的元素引用，保持缓存状态
  const currentElement = useMemo(() => {
    // 如果缓存启用且缓存命中，直接返回缓存中的元素
    if (eligible && effectiveLimit !== undefined) {
      const cached = getCachedElement(cache, cacheKey, location)
      if (cached) {
        return cached
      }
    }

    // 缓存未命中，计算新元素
    const match = matchRoutes(routes, location.pathname, options.routeConfig)
    if (!match)
      return emptyElement('Not Found')

    // createRouteElement 会自动处理嵌套路由，递归渲染整个路由链
    const element = createRouteElement(match.route, match, options)

    // 如果缓存启用，将新元素存入缓存
    if (eligible && effectiveLimit !== undefined) {
      updateCache(cache, cacheKey, element, location, effectiveLimit)
    }

    return element
  }, [routes, location.pathname, location.search, location.hash, location.hash, options.routeConfig, cacheKey, eligible, effectiveLimit, cache])

  return (
    <>
      { [...cache.values()].map(item => (
        <LocationCtx.Provider key={item.key} value={item.location}>
          <Activity
            mode={item.key === cacheKey && eligible
              ? 'visible'
              : 'hidden'}
          >
            { item.element }
          </Activity>
        </LocationCtx.Provider>
      )) }
      { !eligible && (
        <Activity key="__current__" mode="visible">
          { currentElement }
        </Activity>
      ) }
    </>
  )
}
