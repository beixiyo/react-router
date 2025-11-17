import type { NavigateOptions } from './types'
import { useContext } from 'react'
import { RouterCtx } from '../context'

/**
 * 获取导航函数
 *
 * @returns 导航函数，接受路径和可选的配置选项
 * @example
 * ```tsx
 * const navigate = useNavigate()
 *
 * // 普通导航
 * navigate('/dashboard')
 *
 * // 替换当前历史记录
 * navigate('/login', { replace: true })
 *
 * // 带路径参数（标准用法：直接写完整路径，推荐）
 * navigate('/users/123')
 * navigate('/users/123/posts/456')
 *
 * // 带路径参数（高级用法：路径模板 + params，适用于动态构建）
 * navigate('/users/:id', { params: { id: '123' } })
 * navigate('/users/:id/posts/:postId', {
 *   params: { id: '123', postId: '456' }
 * })
 *
 * // 带查询参数
 * navigate('/dashboard', { query: { tab: 'settings', page: 1 } })
 *
 * // 带 hash 参数（对象形式）
 * navigate('/dashboard', { hash: { section: 'intro', tab: 'details' } })
 *
 * // 带 hash（字符串形式）
 * navigate('/dashboard', { hash: '#section-intro' })
 *
 * // 组合使用（标准用法）
 * navigate('/users/123/posts/456', {
 *   query: { page: 1, sort: 'desc' },
 *   hash: { section: 'comments' }
 * })
 *
 * // 返回上一页
 * navigate(-1)
 *
 * // 前进一页
 * navigate(1)
 * ```
 */
export function useNavigate() {
  const router = useContext(RouterCtx)

  return (to: string | number, options?: NavigateOptions) => {
    if (!router) {
      console.warn('useNavigate must be used within a RouterProvider')
      return
    }
    router.navigate(to, options)
  }
}
