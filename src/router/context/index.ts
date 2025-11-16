import type { LocationLike, RouteObject, Router, RouterOptions } from '../types'
import { createContext } from 'react'

export const RouterCtx = createContext<Router | null>(null)
export const LocationCtx = createContext<LocationLike | null>(null)

export const RouterConfigCtx = createContext<RouterConfig | null>(null)
export const OutletContext = createContext<OutletContextValue | null>(null)
export const ParamsContext = createContext<Record<string, string | string[]>>({})

export interface RouterConfig {
  routes: RouteObject[]
  options: RouterOptions
}

/**
 * Outlet Context：用于在父路由组件中传递子路由信息
 */
export interface OutletContextValue {
  parentRoute: RouteObject
  parentPath: string
}
