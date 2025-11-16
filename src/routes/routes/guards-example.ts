/**
 * 路由守卫示例路由配置
 */
import type { RouteObject } from '../../router/types'
import GuardsExample from '../../views/guards-example/page'

export const guardsExampleRoutes: RouteObject[] = [
  {
    path: '/guards-example',
    component: GuardsExample,
    meta: {
      title: '路由守卫示例',
    },
  },
]
