import { useContext } from 'react'
import { LocationCtx } from '../context'

/**
 * 获取当前位置
 */
export function useLocation() {
  return useContext(LocationCtx)
}
