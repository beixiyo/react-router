import type { ComponentType, ReactElement } from 'react'
import type { MatchResult, RouteObject, RouterOptions } from '../types'
import { Link } from '../components/Link'
import { OutletContext, ParamsContext } from '../context'
import { renderRouteComponent } from './route-loader'

/**
 * 无参数时的稳定空对象：`?? {}` 每次产新引用会让壳子树的
 * useParams 每导航换新返回值，用户以 params 为 deps 的 effect 空转
 */
const EMPTY_PARAMS: Record<string, string | string[]> = {}

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
  const params = match?.params ?? EMPTY_PARAMS
  const loadingComponent = getLoadingComponent(route, options)

  // 如果是最后一个路由，直接渲染组件（不需要 Outlet）
  if (isLast) {
    return renderRouteComponent(route.component, params, loadingComponent, route.layoutComponent)
  }

  // 如果不是最后一个路由，需要渲染父路由
  // 通过 OutletContext 传递父路由信息，让父路由组件中的 <Outlet /> 能够找到匹配的子路由
  // 注意：子路由会由父路由组件中的 <Outlet /> 自动渲染，不需要在这里渲染
  return (
    <OutletContext.Provider value={{ parentRoute: route, parentPath: route.path }}>
      <ParamsContext.Provider value={params}>
        { renderRouteComponent(route.component, params, loadingComponent, route.layoutComponent) }
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

  // 单个路由：始终用 OutletContext 包裹当前路由
  // 这样组件内部的 <Outlet /> 始终以「当前路由自己的 children」为候选：
  // - 带 children（含直达父路由 bare path）→ 渲染匹配的子路由
  // - 无 children（叶子，包括根路由 '/'）→ 候选为空、渲染空，
  //   避免 <Outlet /> 误继承父级候选 → 反复匹配到同一叶子 → 无限递归（堆栈溢出 / 内存溢出）
  const params = match?.params ?? EMPTY_PARAMS
  const loadingComponent = getLoadingComponent(route, options)

  return (
    <OutletContext.Provider value={{ parentRoute: route, parentPath: route.path }}>
      <ParamsContext.Provider value={params}>
        { renderRouteComponent(route.component, params, loadingComponent, route.layoutComponent) }
      </ParamsContext.Provider>
    </OutletContext.Provider>
  )
}

/**
 * 创建空元素（用于 404 等场景）
 */
export function emptyElement(text = 'Not Found'): ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        padding: '2rem',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          fontSize: '6rem',
          fontWeight: 700,
          lineHeight: 1,
          color: '#1a1a1a',
          letterSpacing: '-0.02em',
        }}
      >
        { text }
      </div>
      <p
        style={{
          marginTop: '1rem',
          fontSize: '1.125rem',
          color: '#666',
        }}
      >
        Page not found
      </p>
      <Link
        to="/"
        style={{
          marginTop: '1.5rem',
          padding: '0.5rem 1.25rem',
          fontSize: '0.9375rem',
          fontWeight: 500,
          color: '#fff',
          backgroundColor: '#1a1a1a',
          border: 'none',
          borderRadius: '0.5rem',
          cursor: 'pointer',
          textDecoration: 'none',
        }}
      >
        Back to home
      </Link>
    </div>
  )
}
