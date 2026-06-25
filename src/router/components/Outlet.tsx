import type { ReactElement } from 'react'
import type { LocationLike } from '../types'
import { useContext } from 'react'
import { OutletContext, RouterConfigCtx } from '../context'
import { useLocation } from '../hooks/use-location'
import { KeepAliveOutlet } from './KeepAliveOutlet'

/**
 * Outlet 组件：统一的路由渲染组件
 * - 在根节点使用时，渲染整个路由树
 * - 在嵌套节点使用时，渲染匹配的子路由
 *
 * 两种场景都走 KeepAliveOutlet：每一层只 keep-alive 自己这一层的直接子路由，
 * 共享祖先（根布局等）键收敛只挂载一次，发散的叶子页各自保活
 */
export function Outlet(): ReactElement {
  const config = useContext(RouterConfigCtx)
  const parentOutlet = useContext(OutletContext)
  const location = useLocation() as LocationLike

  if (!config) {
    throw new Error('Outlet must be used within RouterProvider')
  }

  const { routes, options } = config

  // 根节点（没有父路由 Context）：以整棵路由表为候选
  if (!parentOutlet) {
    return (
      <KeepAliveOutlet
        candidates={routes}
        location={location}
        options={options}
        isRoot
      />
    )
  }

  // 嵌套节点：以父路由的 children 为候选
  return (
    <KeepAliveOutlet
      candidates={parentOutlet.parentRoute.children ?? []}
      parentRoute={parentOutlet.parentRoute}
      location={location}
      options={options}
      isRoot={false}
    />
  )
}
