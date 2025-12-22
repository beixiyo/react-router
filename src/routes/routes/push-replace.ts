/**
 * Push/Replace 方法测试路由配置
 */
import type { RouteObject } from '../../router/types'
import PushReplacePage from '../../views/push-replace/page'

export const pushReplaceRoutes: RouteObject[] = [
  {
    path: '/push-replace/:id?',
    component: PushReplacePage,
  },
]
