import { useContext } from 'react'
import { LocationCtx } from '../context'
import type { LocationLike } from '../types'

/**
 * 获取当前位置
 * @returns 位置对象，如果 context 为 null 则返回空对象
 */
export function useLocation(): LocationLike {
  const location = useContext(LocationCtx)
  return location ?? { pathname: '', search: '', hash: '' }
}
