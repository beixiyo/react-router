import type { RouteObject } from '../../router/types'
import Login from '../../views/login/page'

export const authRoutes: RouteObject[] = [
  { path: '/login', component: Login },
]
