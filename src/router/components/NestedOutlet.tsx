import type { ReactElement } from 'react'
import type { LocationLike, RouteObject, RouterOptions } from '../types'
import { useMemo } from 'react'
import { renderRouteComponent } from '../renderer/route-loader'
import { renderRouteChain } from '../renderer/route-matcher'
import { matchRoutes } from '../utils'

/**
 * 嵌套节点 Outlet：渲染子路由
 */
export function NestedOutlet({
  parentRoute,
  location,
  options,
}: {
  parentRoute: RouteObject
  location: LocationLike
  options: RouterOptions
}): ReactElement | null {
  const childRoute = useMemo(() => {
    if (!parentRoute.children || parentRoute.children.length === 0) {
      return null
    }

    // 找到匹配的子路由
    const match = matchRoutes(parentRoute.children, location.pathname, options.routeConfig, parentRoute)

    if (!match) {
      return null
    }

    const childRouteObj = match.route

    // 如果子路由还有子路由，需要继续嵌套渲染
    // 检查路由链，看是否还有更深层的嵌套
    if (match.routeChain && match.routeChain.length > 1) {
      // 找到当前子路由在路由链中的位置
      const currentIndex = match.routeChain.findIndex(r => r === childRouteObj)
      if (currentIndex >= 0 && currentIndex < match.routeChain.length - 1) {
        // 还有更深层的嵌套，递归渲染
        const remainingChain = match.routeChain.slice(currentIndex)
        return renderRouteChain(remainingChain, 0, match, options)
      }
    }

    // 没有更深层的嵌套，直接渲染子路由组件
    // 使用 match 中的参数（已经包含了所有路由链的参数）
    const params = match?.params ?? {}
    const loadingComponent = childRouteObj.loadingComponent ?? options.loadingComponent
    return renderRouteComponent(childRouteObj.component, params, loadingComponent, childRouteObj.layoutComponent)
  }, [parentRoute, location.pathname, options.routeConfig, options.loadingComponent])

  return childRoute || null
}
