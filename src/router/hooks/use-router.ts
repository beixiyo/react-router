import { useContext } from 'react'
import { RouterCtx } from '../context'

/**
 * 获取路由器实例
 */
export function useRouter() {
  return useContext(RouterCtx)
}
