/**
 * 路由参数测试路由配置
 */
import type { RouteObject } from '../../router/types'
import NestedParamsMultiChildPage from '../../views/nested-multi/[parentId]/child/[childId]/posts/[postId]/page'
import NestedParamsMultiPage from '../../views/nested-multi/[parentId]/page'
import NestedParamsOptChildPage from '../../views/nested-opt/[parentId$]/child/[childId$]/page'
import NestedParamsOptPage from '../../views/nested-opt/[parentId$]/page'
import NestedParamsChildPage from '../../views/nested/[parentId]/child/[childId]/page'
import NestedParamsPage from '../../views/nested/[parentId]/page'
import ParamsMultiPage from '../../views/params-multi/[userId]/posts/[postId]/page'
import ParamsOptPage from '../../views/params-opt/[id$]/page'
import ParamsPage from '../../views/params/[id]/page'
import ParamsIndexPage from '../../views/params/page'

export const paramsRoutes: RouteObject[] = [
  // 无参数路由（索引页）
  {
    path: '/params',
    component: ParamsIndexPage,
  },
  // 必选参数
  {
    path: '/params/:id',
    component: ParamsPage,
  },
  // 可选参数
  {
    path: '/params-opt/:id?',
    component: ParamsOptPage,
  },
  // 多级参数
  {
    path: '/params-multi/:userId/posts/:postId',
    component: ParamsMultiPage,
  },
  // 嵌套路由 - 必选参数
  {
    path: '/nested/:parentId',
    component: NestedParamsPage,
    children: [
      {
        path: '/nested/:parentId/child/:childId',
        component: NestedParamsChildPage,
      },
    ],
  },
  // 嵌套路由 - 可选参数
  {
    path: '/nested-opt/:parentId?',
    component: NestedParamsOptPage,
    children: [
      {
        path: '/nested-opt/:parentId?/child/:childId?',
        component: NestedParamsOptChildPage,
      },
    ],
  },
  // 嵌套路由 - 多级参数
  {
    path: '/nested-multi/:parentId',
    component: NestedParamsMultiPage,
    children: [
      {
        path: '/nested-multi/:parentId/child/:childId/posts/:postId',
        component: NestedParamsMultiChildPage,
      },
    ],
  },
]
