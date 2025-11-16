/**
 * 业务层中间件工具
 *
 * 提供常用的中间件工厂函数，用于业务路由配置。
 * 这些工具依赖路由库的类型系统，但不属于路由核心库。
 */
import type { Middleware, MiddlewareContext } from '../router/types'

/**
 * 权限校验中间件工厂函数
 * @param hasAuth 权限检查函数，接收中间件上下文，返回是否有权限
 * @param redirectTo 无权限时重定向目标路径
 * @returns 中间件函数
 */
export function createAuthMiddleware(
  hasAuth: (ctx: MiddlewareContext) => boolean,
  redirectTo: string,
): Middleware {
  return async (ctx, next) => {
    if (!hasAuth(ctx)) {
      ctx.redirect(redirectTo)
      return
    }
    await next()
  }
}
