import type { URLAdapter } from './create-base-router'
import type {
  BrowserRouterInstance,
  CreateBrowserRouterConfig,
  LocationLike,
} from './types'
import { createBaseRouter } from './create-base-router'
import { stripBase } from './utils'

const browserURLAdapter: URLAdapter = {
  getLocation: (base: string): LocationLike => {
    const { pathname, search, hash } = window.location
    return {
      pathname: stripBase(pathname, base),
      search,
      hash,
    }
  },
  updateURL: (path: string, base: string) => {
    window.history.pushState(null, '', base + path)
  },
  replaceURL: (path: string, base: string) => {
    window.history.replaceState(null, '', base + path)
  },
  redirectURL: (path: string, base: string, replaceHistory: boolean) => {
    if (replaceHistory) {
      window.history.replaceState(null, '', base + path)
    }
    else {
      window.history.pushState(null, '', base + path)
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
  return createBaseRouter(
    {
      routes: config.routes,
      options: config.options,
      urlAdapter: browserURLAdapter,
    },
    (params) => {
      const router: BrowserRouterInstance = {
        id: params.id,
        routes: params.routes,
        options: params.options,
        base: params.base,
        getLocation: params.getLocation,
        subscribe: params.subscribe,
        ...params.navigationAdapter,
        dispose: params.dispose,
      }
      return router
    },
  )
}
