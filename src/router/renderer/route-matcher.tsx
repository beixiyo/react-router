import type { ComponentType, ReactElement } from 'react'
import type { MatchResult, RouteObject, RouterOptions } from '../types'
import { OutletContext, ParamsContext } from '../context'
import { renderRouteComponent } from './route-loader'

/**
 * 获取 loadingComponent，优先使用路由级别的，否则使用全局的
 */
function getLoadingComponent(route: RouteObject, options?: RouterOptions): ReactElement | ComponentType<any> | undefined {
  return route.loadingComponent ?? options?.loadingComponent
}

/**
 * 递归渲染路由链
 * @param routeChain 路由链（从父到子）
 * @param index 当前渲染的路由索引
 * @param match 匹配结果，包含所有路由的参数
 * @param options 路由器选项（用于获取全局 loadingComponent）
 * @returns React 元素
 */
export function renderRouteChain(
  routeChain: RouteObject[],
  index: number = 0,
  match?: MatchResult,
  options?: RouterOptions,
): ReactElement {
  if (index >= routeChain.length) {
    return <></>
  }

  const route = routeChain[index]
  const isLast = index === routeChain.length - 1

  // 获取当前路由的参数（从 match.params 中提取，但需要根据路由链合并所有参数）
  // 对于嵌套路由，参数会合并在一起
  const params = match?.params ?? {}
  const loadingComponent = getLoadingComponent(route, options)

  // 如果是最后一个路由，直接渲染组件（不需要 Outlet）
  if (isLast) {
    return renderRouteComponent(route.component, params, loadingComponent)
  }

  // 如果不是最后一个路由，需要渲染父路由
  // 通过 OutletContext 传递父路由信息，让父路由组件中的 <Outlet /> 能够找到匹配的子路由
  // 注意：子路由会由父路由组件中的 <Outlet /> 自动渲染，不需要在这里渲染
  return (
    <OutletContext.Provider value={{ parentRoute: route, parentPath: route.path }}>
      <ParamsContext.Provider value={params}>
        { renderRouteComponent(route.component, params, loadingComponent) }
      </ParamsContext.Provider>
    </OutletContext.Provider>
  )
}

/**
 * 创建路由元素
 * 根据匹配结果和路由配置，创建对应的 React 元素
 *
 * @param route 路由对象
 * @param match 匹配结果（包含路由链和参数）
 * @param options 路由器选项（用于获取全局 loadingComponent）
 * @returns React 元素
 */
export function createRouteElement(route: RouteObject, match?: MatchResult, options?: RouterOptions) {
  // 如果有路由链，递归渲染整个路由链
  if (match?.routeChain && match.routeChain.length > 1) {
    return renderRouteChain(match.routeChain, 0, match, options)
  }

  // 单个路由，直接渲染（支持懒加载）
  const params = match?.params ?? {}
  const loadingComponent = getLoadingComponent(route, options)

  // 如果路由有 children，即使当前只匹配父路由，也需要用 OutletContext 包裹
  // 这样父路由组件中的 <Outlet /> 会识别为嵌套节点，调用 NestedOutlet 而不是 RootOutlet
  if (route.children && route.children.length > 0) {
    return (
      <OutletContext.Provider value={{ parentRoute: route, parentPath: route.path }}>
        <ParamsContext.Provider value={params}>
          { renderRouteComponent(route.component, params, loadingComponent) }
        </ParamsContext.Provider>
      </OutletContext.Provider>
    )
  }

  // 对于根路由（path: '/'），即使没有 children，也使用 OutletContext 包裹
  // 这样可以防止根路由组件内部使用 <Outlet /> 时导致无限递归
  if (route.path === '/') {
    return (
      <OutletContext.Provider value={{ parentRoute: route, parentPath: route.path }}>
        <ParamsContext.Provider value={params}>
          { renderRouteComponent(route.component, params, loadingComponent) }
        </ParamsContext.Provider>
      </OutletContext.Provider>
    )
  }

  return renderRouteComponent(route.component, params, loadingComponent)
}

/**
 * 创建空元素（用于 404 等场景）
 */
export function emptyElement(text: string): ReactElement {
  return <div>{ text }</div>
}
