/**
 * 中间件组合与执行器
 *
 * 提供 Koa 风格的异步中间件组合，按配置顺序执行。
 * 使用示例：
 * const run = compose([m1, m2])
 * await run(ctx, (path) => { if (path) redirect(path) })
 */
import type { Middleware, MiddlewareContext, MiddlewareNext } from '../types'
import { ERROR_NEXT_CALLED_MULTIPLE_TIMES } from '../constants/messages'

/**
 * 组合中间件为一个执行器
 * @param middlewares 中间件数组（按配置顺序）
 * @returns 执行器函数
 */
export function compose(middlewares: Middleware[]) {
  return async function run(
    ctx: MiddlewareContext,
    next: MiddlewareNext,
  ): Promise<void> {
    let index = -1
    let cancelled = false

    async function dispatch(i: number, path?: string | false): Promise<void> {
      // 如果已经取消，停止执行
      if (cancelled) {
        return
      }

      // 如果传入了 false，取消执行
      if (path === false) {
        cancelled = true
        await next(false)
        return
      }

      // 如果传入了路径，触发重定向
      if (typeof path === 'string') {
        await next(path)
        return
      }

      if (i <= index)
        throw new Error(ERROR_NEXT_CALLED_MULTIPLE_TIMES)
      index = i

      const fn = middlewares[i]
      if (!fn) {
        await next()
        return
      }

      await fn(ctx, (p?: string | false) => {
        // dispatch 将作为 next 函数，继续递归执行下一个中间件
        return dispatch(i + 1, p)
      })
    }

    await dispatch(0)
  }
}
