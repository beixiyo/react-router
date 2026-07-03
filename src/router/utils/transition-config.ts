import type { RouteObject, RouterOptions } from '../types'
import type { RouteTransitionOptions } from '../types/transition'

/**
 * 解析某条路由实际生效的过渡配置（就近优先）：
 * - `route.transition === false`：该路由显式关闭过渡 → undefined（立即切换）
 * - `route.transition` 为对象：与全局 `options.transition` 字段级合并，路由字段优先
 * - 未配置：沿用全局
 */
export function resolveTransition(
  route: RouteObject | undefined,
  options: RouterOptions,
): RouteTransitionOptions | undefined {
  const routeTransition = route?.transition

  if (routeTransition === false)
    return undefined

  if (routeTransition)
    return { ...options.transition, ...routeTransition }

  return options.transition
}

/**
 * 路由树里是否存在任一路由级过渡配置
 *
 * 用于决定是否启用过渡渲染机制（bypass 退场槽位等）：
 * 全局未配置但某条路由单独开启时，机制同样需要就位
 */
export function routesHaveTransition(routes: RouteObject[]): boolean {
  return routes.some((route) => {
    /** false 是「显式关闭」而非开启，不计入 */
    if (route.transition)
      return true

    return route.children
      ? routesHaveTransition(route.children)
      : false
  })
}
