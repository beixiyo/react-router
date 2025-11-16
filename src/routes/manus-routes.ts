import type { RouteObject } from '../router/types'
import { adminRoutes } from './routes/admin'
import { authRoutes } from './routes/auth'
import { dashboardRoutes } from './routes/dashboard'
import { errorRoutes } from './routes/errors'
import { guardsExampleRoutes } from './routes/guards-example'
import { homeRoutes } from './routes/home'
import { lazyRoutes } from './routes/lazy'
import { paramsRoutes } from './routes/params'
import { profileRoutes } from './routes/profile'

export const manusRoutes: RouteObject[] = [
  ...homeRoutes,
  ...profileRoutes,
  ...adminRoutes,
  ...authRoutes,
  ...errorRoutes,
  ...dashboardRoutes,
  ...lazyRoutes,
  ...paramsRoutes,
  ...guardsExampleRoutes,
]
