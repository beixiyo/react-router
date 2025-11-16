import type { NavigateOptions } from '../hooks/types'
import type { Router } from '../types'
import { buildUrl } from './url'

/**
 * 全局 router 实例引用
 * 在 RouterProvider 初始化时会被设置
 */
let globalRouter: Router | null = null

/**
 * 设置全局 router 实例
 * @internal
 */
export function setGlobalRouter(router: Router | null) {
  globalRouter = router
}

/**
 * 获取全局 router 实例
 * @internal
 */
export function getGlobalRouter(): Router | null {
  return globalRouter
}

/**
 * 执行导航的核心逻辑
 * @internal
 */
export function performNavigate(
  router: Router | null,
  to: string | number,
  options?: NavigateOptions,
  warnMessage?: string,
) {
  if (!router) {
    if (warnMessage) {
      console.warn(warnMessage)
    }
    return
  }

  if (typeof to === 'number') {
    // 支持相对导航：-1 表示后退，1 表示前进
    if (to === -1) {
      router.back()
    }
    else {
      // 对于其他数字，使用 history.go
      window.history.go(to)
    }
    return
  }

  // 构建完整的 URL
  const fullUrl = buildUrl(to, options)

  if (options?.replace) {
    router.replace(fullUrl)
  }
  else {
    router.navigate(fullUrl)
  }
}

/**
 * 全局导航函数，可以在 hook 外调用
 *
 * @param to 目标路径或相对导航数字（-1 表示后退，1 表示前进）
 * @param options 导航选项
 *
 * @example
 * ```ts
 * import { navigate } from '@/router'
 *
 * // 普通导航
 * navigate('/dashboard')
 *
 * // 替换当前历史记录
 * navigate('/login', { replace: true })
 *
 * // 带查询参数
 * navigate('/dashboard', { query: { tab: 'settings', page: 1 } })
 *
 * // 带路径参数
 * navigate('/users/:id', { params: { id: '123' } })
 *
 * // 返回上一页
 * navigate(-1)
 *
 * // 前进一页
 * navigate(1)
 * ```
 */
export function navigate(to: string | number, options?: NavigateOptions) {
  performNavigate(
    globalRouter,
    to,
    options,
    'navigate() called outside of RouterProvider. '
    + 'Make sure RouterProvider is mounted before calling navigate().',
  )
}

/**
 * 全局替换导航函数，等同于 navigate(path, { replace: true })
 *
 * @param to 目标路径
 * @param options 导航选项（replace 选项会被忽略，因为此函数本身就是 replace）
 *
 * @example
 * ```ts
 * import { replace } from '@/router'
 *
 * replace('/login')
 * replace('/users/:id', { params: { id: '123' } })
 * ```
 */
export function replace(to: string, options?: Omit<NavigateOptions, 'replace'>) {
  navigate(to, { ...options, replace: true })
}

/**
 * 全局返回函数，等同于 navigate(-1)
 *
 * @example
 * ```ts
 * import { back } from '@/router'
 *
 * back()
 * ```
 */
export function back() {
  navigate(-1)
}
