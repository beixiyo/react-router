import type { RouteObject } from '../../router/types'
import { createAuthMiddleware } from '../../middlewares'
import { getUser } from '../../store/auth'
import Admin from '../../views/admin/page'

const requireLogin = createAuthMiddleware(() => !!getUser(), '/login')
const requireAdmin = createAuthMiddleware(() => getUser()?.role === 'admin', '/403')

export const adminRoutes: RouteObject[] = [
  { path: '/admin', component: Admin, middlewares: [requireLogin, requireAdmin] },
]
