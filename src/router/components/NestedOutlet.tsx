import type { ReactElement } from 'react'
import type { LocationLike, RouteObject, RouterOptions } from '../types'
import { useMemo } from 'react'
import { OutletContext } from '../context'
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
      // 对于当前 NestedOutlet 对应的 parentRoute，它的匹配子链是相对于自身的：
      // 例如 parentRoute 为 `/`，当前路径为 `/nest-no-param/sub`，
      // 则 match.routeChain 形如 [`/nest-no-param`, `/nest-no-param/sub`]
      //
      // 我们希望先渲染紧接在 parentRoute 之后的那一层（这里是 `/nest-no-param`），
      // 由该层组件内部的 <Outlet /> 再继续通过 NestedOutlet 向下递归渲染更深层级。
      // 因此直接让 renderRouteChain 从整条子链的起点开始渲染即可。
      return renderRouteChain(match.routeChain, 0, match, options)
    }

    // 没有更深层的嵌套，直接渲染子路由组件
    // 使用 match 中的参数（已经包含了所有路由链的参数）
    const params = match?.params ?? {}
    const loadingComponent = childRouteObj.loadingComponent ?? options.loadingComponent
    const element = renderRouteComponent(
      childRouteObj.component,
      params,
      loadingComponent,
      childRouteObj.layoutComponent,
    )

    // 如果子路由本身还有 children（尤其是 path === '/' 的根节点），必须提供 OutletContext
    // 否则该子路由组件中的 <Outlet /> 会被视为根 Outlet，重新触发 matchRoutes，最终造成无限递归
    if ((childRouteObj.children && childRouteObj.children.length > 0) || childRouteObj.path === '/') {
      return (
        <OutletContext.Provider value={{ parentRoute: childRouteObj, parentPath: childRouteObj.path }}>
          { element }
        </OutletContext.Provider>
      )
    }

    return element
  }, [parentRoute, location.pathname, options.routeConfig, options.loadingComponent])

  return childRoute || null
}
