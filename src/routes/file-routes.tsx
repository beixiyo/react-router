import type { ComponentType } from 'react'
import type { RouteObject } from '../router'
/**
 * 从文件系统自动生成的路由配置
 */
import { genRoutes } from '@jl-org/vite-auto-route'
import { lazy } from 'react'
import { getUser } from '../store/auth'
import Home from '../views'
import { PageTransition } from '../views/_shared/PageTransition'
import { createAuthMiddleware } from './middlewares'

// 创建中间件
const requireLogin = createAuthMiddleware(() => !!getUser(), '/login')
const requireAdmin = createAuthMiddleware(() => getUser()?.role === 'admin', '/403')

/**
 * 路由级统一注入过渡动画：所有页面（含懒加载）都在此处包一层 PageTransition，
 * 页面组件零侵入，新增页面自动获得过渡，无需（也不要）在页面内手动包裹
 */
function withPageTransition(Component: ComponentType<any>): ComponentType<any> {
  return function PageWithTransition(props: any) {
    return (
      <PageTransition>
        <Component {...props} />
      </PageTransition>
    )
  }
}

export const fileRoutes: RouteObject[] = [
  {
    path: '/',
    component: withPageTransition(Home),
    children: genRoutes({
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
              component: withPageTransition(lazy(route.component)),
            }
          }

          // 根路径保持原样（不使用懒加载）
          return {
            ...route,
            component: withPageTransition(route.component),
          }
        }
      },
    }),
  },
]
