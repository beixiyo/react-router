/**
 * 从文件系统自动生成的路由配置
 */
import { genRoutes } from '@jl-org/vite-auto-route'
import { lazy } from 'react'
import { createAuthMiddleware } from '../middlewares'
import { getUser } from '../store/auth'
import Home from '../views'

// 创建中间件
const requireLogin = createAuthMiddleware(() => !!getUser(), '/login')
const requireAdmin = createAuthMiddleware(() => getUser()?.role === 'admin', '/403')

export const fileRoutes = genRoutes({
  // 使用 customizeRoute 自定义路由项，例如添加 middleware
  customizeRoute: (_context) => {
    return (route) => {
      // 根据路径添加 middleware
      if (route.path === '/admin') {
        route.middlewares = [requireLogin, requireAdmin]
      }
      else if (route.path === '/profile') {
        route.middlewares = [requireLogin]
      }

      // 也可以添加其他自定义字段，如 meta
      if (route.path === '/dashboard') {
        route.meta = { title: 'Dashboard', requiresAuth: true }
      }

      if (route.path === '/profile') {
        route.loadingComponent = () => <div>profile 自定义 Loading...</div>
      }

      // 对于非根路径的路由，使用懒加载
      if (route.path !== '/') {
        return {
          ...route,
          component: lazy(route.component),
        }
      }

      // 根路径保持原样（不使用懒加载）
      return route
    }
  },
  extendRoutes(routes) {
    routes.push({
      path: '/',
      component: Home,
    } as any)
    return routes
  },
}) as any
