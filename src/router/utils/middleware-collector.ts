import type { Middleware, RouteObject } from '../types'

/**
 * 收集中间件链（父到子）
 * @param all 路由树
 * @param target 命中的路由
 * @returns 中间件数组
 */
export function collectMiddlewares(all: RouteObject[], target: RouteObject): Middleware[] {
  const chain: Middleware[] = []

  function dfs(nodes: RouteObject[], stack: Middleware[]) {
    for (const r of nodes) {
      const nextStack = [...stack, ...(r.middlewares ?? [])]
      if (r === target) {
        chain.push(...nextStack)
        return true
      }

      if (r.children && dfs(r.children, nextStack))
        return true
    }
    return false
  }

  dfs(all, [])
  return chain
}
