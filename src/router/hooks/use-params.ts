import { useContext, useMemo } from 'react'
import { ParamsContext } from '../context'
import { parseHash, parseQuery, searchParamsToObject } from '../utils'
import { useLocation } from './use-location'

/**
 * 获取当前路由的参数、查询参数和 hash
 * @returns 包含 params、query、hash 的对象
 * @example
 * ```tsx
 * const { params, query, hash } = useParams()
 * // params: { id: '123' } - 路由参数
 * // query: { name: 'test', age: '20' } - URL 查询参数 (?name=test&age=20)
 * // hash: { section: 'intro' } - Hash 参数 (#section=intro)
 * ```
 */
export function useParams(): {
  params: Record<string, string | string[]>
  query: Record<string, string | string[]>
  hash: Record<string, string | string[]>
} {
  const params = useContext(ParamsContext)
  const location = useLocation()

  return useMemo(() => {
    const queryParams = location?.search
      ? parseQuery(location.search)
      : new URLSearchParams()
    const hashParams = location?.hash
      ? parseHash(location.hash)
      : new URLSearchParams()

    return {
      params: params ?? {},
      query: searchParamsToObject(queryParams),
      hash: searchParamsToObject(hashParams),
    }
  }, [params, location?.search, location?.hash])
}
