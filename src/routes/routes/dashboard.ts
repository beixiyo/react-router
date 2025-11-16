/**
 * Dashboard 嵌套路由配置示例
 */
import type { RouteObject } from '../../router/types'
import DashboardOverview from '../../views/dashboard/index/page'
import Dashboard from '../../views/dashboard/page'
import DashboardProfile from '../../views/dashboard/profile/page'
import DashboardSettings from '../../views/dashboard/settings/page'

export const dashboardRoutes: RouteObject[] = [
  {
    path: '/dashboard',
    component: Dashboard,
    children: [
      {
        path: '/dashboard/index',
        component: DashboardOverview,
      },
      {
        path: '/dashboard/settings',
        component: DashboardSettings,
      },
      {
        path: '/dashboard/profile',
        component: DashboardProfile,
      },
    ],
  },
]
