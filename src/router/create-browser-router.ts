import type { URLAdapter } from './create-base-router'
import type {
  BrowserRouterInstance,
  CreateBrowserRouterConfig,
  LocationLike,
} from './types'
import type { RouterHistoryState } from './utils/nav-direction'
import { createBaseRouter } from './create-base-router'
import { stripBase } from './utils'

/**
 * state 携带导航方向的位点，与 URL 在同一次 pushState / replaceState 中原子写入——
 * 不得传 null 覆写，否则条目失点、浏览器前进 / 后退的方向推导会退化
 */
const browserURLAdapter: URLAdapter = {
  getLocation: (base: string): LocationLike => {
    const { pathname, search, hash } = window.location
    return {
      pathname: stripBase(pathname, base),
      search,
      hash,
    }
  },
  updateURL: (path: string, base: string, state?: RouterHistoryState) => {
    window.history.pushState(state ?? null, '', base + path)
  },
  replaceURL: (path: string, base: string, state?: RouterHistoryState) => {
    window.history.replaceState(state ?? null, '', base + path)
  },
  redirectURL: (path: string, base: string, replaceHistory: boolean, state?: RouterHistoryState) => {
    if (replaceHistory) {
      window.history.replaceState(state ?? null, '', base + path)
    }
    else {
      window.history.pushState(state ?? null, '', base + path)
    }
  },
  setupEventListener: (callback: () => void | Promise<void>) => {
    window.addEventListener('popstate', callback)
    return () => {
      window.removeEventListener('popstate', callback)
    }
  },
}

export function createBrowserRouter(config: CreateBrowserRouterConfig): BrowserRouterInstance {
  return createBaseRouter({
    routes: config.routes,
    options: config.options,
    urlAdapter: browserURLAdapter,
  })
}
