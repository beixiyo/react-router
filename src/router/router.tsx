import type { ReactNode } from 'react'
import type { BrowserRouterInstance, HashRouterInstance, LocationLike, Router } from './types'
import { useEffect, useMemo, useState } from 'react'
import { LocationCtx, RouterConfigCtx, RouterCtx } from './context'
import { setGlobalRouter } from './utils/navigate'

/**
 * 路由器提供者组件
 * 类似 react-router 的 RouterProvider，接收路由配置和选项
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
    setGlobalRouter(router)
    return () => {
      setGlobalRouter(null)
    }
  }, [router])

  const routerValue = useMemo<Router>(() => ({
    navigate: router.navigate,
    replace: router.replace,
    back: router.back,
    location,
    beforeEach: router.beforeEach,
    beforeResolve: router.beforeResolve,
    afterEach: router.afterEach,
  }), [router, location])

  const configValue = useMemo(() => ({
    routes: router.routes,
    options: router.options,
  }), [router])

  return (
    <RouterCtx.Provider value={routerValue}>
      <LocationCtx.Provider value={location}>
        <RouterConfigCtx.Provider value={configValue}>
          { children }
        </RouterConfigCtx.Provider>
      </LocationCtx.Provider>
    </RouterCtx.Provider>
  )
}
