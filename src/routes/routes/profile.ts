import type { RouteObject } from '../../router/types'
import { createAuthMiddleware } from '../../middlewares'
import { getUser } from '../../store/auth'
import Profile from '../../views/profile/page'

const requireLogin = createAuthMiddleware(() => !!getUser(), '/login')

export const profileRoutes: RouteObject[] = [
  { path: '/profile', component: Profile, middlewares: [requireLogin] },
]
