import type { ReactNode } from 'react'
import type { BrowserRouterInstance, HashRouterInstance, LocationLike } from './types'
import { useEffect, useMemo, useState } from 'react'
import { LocationCtx, RouterConfigCtx, RouterCtx } from './context'
import { setGlobalRouterInstance } from './utils/navigate'

/**
 * 路由器提供者组件
 * 类似 react-router 的 RouterProvider，接收路由配置和选项
 *
 * RouterCtx 直接下发 router 实例：实例引用终身恒定，`location` / `navigationDirection`
 * 是活 getter，读取时永远新鲜——因此 `useRouter()` 消费者**不会**随导航重渲染
 * （Link / useNavigate 等只需要稳定方法的组件零陪跑）。
 * 需要「location 变化触发重渲染」的组件走 {@link useLocation}（由 LocationCtx 驱动）
 */
export function RouterProvider({
  router,
  children,
}: {
  router: BrowserRouterInstance | HashRouterInstance
  children: ReactNode
}) {
  const [location, setLocation] = useState<LocationLike>(() => router.getLocation())

  useEffect(() => {
    return router.subscribe((nextLocation) => {
      setLocation(nextLocation)
    })
  }, [router])

  useEffect(() => {
    setGlobalRouterInstance(router)
    return () => {
      setGlobalRouterInstance(null)
    }
  }, [router])

  const configValue = useMemo(() => ({
    routes: router.routes,
    options: router.options,
  }), [router])

  return (
    <RouterCtx.Provider value={router}>
      <LocationCtx.Provider value={location}>
        <RouterConfigCtx.Provider value={configValue}>
          { children }
        </RouterConfigCtx.Provider>
      </LocationCtx.Provider>
    </RouterCtx.Provider>
  )
}
