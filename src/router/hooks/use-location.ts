import type { LocationLike } from '../types'
import { useContext, useEffect, useState } from 'react'
import { LocationCtx, RouterCtx } from '../context'

const EMPTY_LOCATION: LocationLike = { pathname: '', search: '', hash: '' }

/**
 * 获取当前位置
 *
 * 默认读取全局当前路由；在 keep-alive 缓存页面内，也会跟随真实路由切换
 *
 * 需要读取缓存 entry 自己的 location 时传入 `{ scope: 'cache' }`
 *
 * @returns 位置对象，如果 context 为 null 则返回空对象
 */
export function useLocation(options: UseLocationOptions = {}): LocationLike {
  const location = useContext(LocationCtx)
  const router = useContext(RouterCtx)
  const scope = options.scope ?? 'current'
  const [currentLocation, setCurrentLocation] = useState<LocationLike>(() => {
    return router?.location ?? location ?? EMPTY_LOCATION
  })

  /**
   * 有 router：订阅实例（引用终身恒定 → 只订阅一次，不随导航退订/重订）
   * deps 刻意不含 ctx location——否则每次上游 Provider 换值都会白白重建一轮订阅
   */
  useEffect(() => {
    if (scope !== 'current' || !router)
      return

    setCurrentLocation(router.location)
    return router.subscribe(nextLocation => setCurrentLocation(nextLocation))
  }, [router, scope])

  /** 无 router 的兜底（如测试里裸用 LocationCtx）：跟随 ctx 值 */
  useEffect(() => {
    if (scope !== 'current' || router)
      return

    setCurrentLocation(location ?? EMPTY_LOCATION)
  }, [router, location, scope])

  return scope === 'cache'
    ? location ?? EMPTY_LOCATION
    : currentLocation
}

export type UseLocationOptions = {
  /**
   * 读取位置来源
   *
   * - `current`: 全局当前路由，跟随真实路由切换
   * - `cache`: 当前 keep-alive 缓存 entry 的位置
   *
   * @default 'current'
   */
  scope?: 'current' | 'cache'
}
