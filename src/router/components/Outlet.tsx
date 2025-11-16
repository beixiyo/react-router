import type { ReactElement } from 'react'
import type { LocationLike } from '../types'
import { useContext } from 'react'
import { OutletContext, RouterConfigCtx } from '../context'
import { useLocation } from '../hooks/use-location'
import { NestedOutlet } from './NestedOutlet'
import { RootOutlet } from './RootOutlet'

/**
 * Outlet 组件：统一的路由渲染组件
 * - 在根节点使用时，渲染整个路由树
 * - 在嵌套节点使用时，渲染匹配的子路由
 */
export function Outlet(): ReactElement {
  const config = useContext(RouterConfigCtx)
  const parentOutlet = useContext(OutletContext)
  const location = useLocation() as LocationLike

  if (!config) {
    throw new Error('Outlet must be used within RouterProvider')
  }

  const { routes, options } = config

  // 如果是根节点（没有父路由 Context），渲染整个路由树
  if (!parentOutlet) {
    return <RootOutlet routes={routes} location={location} options={options} />
  }

  // 如果是嵌套节点，渲染子路由
  return <NestedOutlet parentRoute={parentOutlet.parentRoute} location={location} options={options} />
}
