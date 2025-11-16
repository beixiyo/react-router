import { createAuthMiddleware } from '.'
import { getUser } from '../store/auth'

/**
 * 需要登录的中间件
 * 如果用户未登录，重定向到登录页
 */
export const requireLogin = createAuthMiddleware(() => !!getUser(), '/login')

/**
 * 需要管理员权限的中间件
 * 如果用户不是管理员，重定向到 403 页面
 */
export const requireAdmin = createAuthMiddleware(() => getUser()?.role === 'admin', '/403')
