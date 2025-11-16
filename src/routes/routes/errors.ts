import type { RouteObject } from '../../router/types'
import Forbidden from '../../views/403/page'

export const errorRoutes: RouteObject[] = [
  { path: '/403', component: Forbidden },
]
