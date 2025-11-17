import type { ReactNode } from 'react'
import type { LocationLike, RouteObject, Router, RouterOptions } from './types'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LocationCtx, RouterConfigCtx, RouterCtx } from './context'
import { useNavigation } from './hooks/use-navigation'
import { GuardManager } from './utils/guard-manager'
import { setGlobalRouter } from './utils/navigate'

/**
 * 路由器提供者组件
 * 类似 react-router 的 RouterProvider，接收路由配置和选项
 */
export function RouterProvider({
  routes,
  options = {},
  children,
}: {
  routes: RouteObject[]
  options?: RouterOptions
  children: ReactNode
}) {
  const base = options.base ?? ''

  // 创建守卫管理器实例（使用 useRef 保持稳定引用）
  const guardManagerRef = useRef<GuardManager>(new GuardManager())
  const guardManager = guardManagerRef.current

  // 注册初始守卫（从 options 中读取）
  useEffect(() => {
    if (options.beforeEach) {
      guardManager.beforeEach(options.beforeEach)
    }
    if (options.beforeResolve) {
      guardManager.beforeResolve(options.beforeResolve)
    }
    if (options.afterEach) {
      guardManager.afterEach(options.afterEach)
    }
  }, [options.beforeEach, options.beforeResolve, options.afterEach, guardManager])

  const { getLocation, navigateTo } = useNavigation(routes, options, base, guardManager)
  const [location, setLocation] = useState<LocationLike>(getLocation(base))

  const notify = useCallback(() => {
    const loc = getLocation(base)
    setLocation(loc)
  }, [getLocation, base])

  const handleNavigate = useCallback(async (path: string, replace = false) => {
    await navigateTo(path, replace, notify)
  }, [navigateTo, notify])

  // 首次加载时，通过 navigateTo 触发一次导航流程，确保会执行 beforeEach 等守卫
  useEffect(() => {
    const loc = getLocation(base)
    const currentPath = loc.pathname + loc.search + loc.hash
    navigateTo(currentPath, true, notify).catch((error) => {
      console.error('[Router] Initial navigation error:', error)
    })
    // 只在首次挂载和基础路径变化时运行
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base])

  useEffect(() => {
    const onPop = async () => {
      // 获取新的位置
      const newLocation = getLocation(base)
      const currentPath = newLocation.pathname + newLocation.search + newLocation.hash

      // 通过 navigateTo 执行导航，这样会经过守卫
      // 注意：popstate 时浏览器已经改变了 URL，所以我们需要用 replace 模式
      await navigateTo(currentPath, true, notify)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [notify, navigateTo, getLocation, base])

  const router: Router = useMemo(() => ({
    navigate: (path: string) => {
      handleNavigate(path, false).catch((error) => {
        console.error('[Router] Navigation error:', error)
      })
    },
    replace: (path: string) => {
      handleNavigate(path, true).catch((error) => {
        console.error('[Router] Replace error:', error)
      })
    },
    back: () => window.history.back(),
    location,
    beforeEach: guard => guardManager.beforeEach(guard),
    beforeResolve: guard => guardManager.beforeResolve(guard),
    afterEach: guard => guardManager.afterEach(guard),
  }), [location, handleNavigate, guardManager])

  // 设置全局 router 实例，以便在 hook 外也能使用 navigate
  useEffect(() => {
    setGlobalRouter(router)
    return () => {
      setGlobalRouter(null)
    }
  }, [router])

  const value = useMemo(() => ({ ...router, location }), [location, router])
  const configValue = useMemo(() => ({ routes, options }), [routes, options])

  return (
    <RouterCtx.Provider value={ value }>
      <LocationCtx.Provider value={ location }>
        <RouterConfigCtx.Provider value={ configValue }>
          { children }
        </RouterConfigCtx.Provider>
      </LocationCtx.Provider>
    </RouterCtx.Provider>
  )
}
