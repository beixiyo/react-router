import type { URLAdapter } from './create-base-router'
import type {
  CreateHashRouterConfig,
  HashRouterInstance,
  LocationLike,
} from './types'
import { createBaseRouter } from './create-base-router'
import { stripBase } from './utils'

/**
 * 从 hash 中提取路径
 * 例如: '#/dashboard' -> '/dashboard'
 *      '#/dashboard?tab=settings' -> '/dashboard?tab=settings'
 *      '#/dashboard#section' -> '/dashboard#section'
 */
function getPathFromHash(hash: string): string {
  // 移除开头的 # 号
  const path = hash.startsWith('#')
    ? hash.slice(1)
    : hash
  // 如果为空，返回根路径
  return path || '/'
}

/**
 * 从 window.location.hash 获取 LocationLike 对象
 */
function getLocationFromHash(base: string): LocationLike {
  const hash = window.location.hash
  const path = getPathFromHash(hash)

  // 解析路径，提取 pathname, search, hash
  // 注意：这里的 hash 是 URL 的 hash 部分（如 #section），不是路由的 hash
  // 如果 path 是 '/dashboard?tab=settings#section'，需要正确解析
  try {
    // 使用完整的 URL 来解析，包括 search 和 hash
    const url = new URL(path, window.location.origin)

    return {
      pathname: stripBase(url.pathname, base),
      search: url.search,
      hash: url.hash, // URL 的 hash 部分（如 #section）
    }
  }
  catch {
    // 如果解析失败（例如 path 不是有效的 URL 格式），尝试简单解析
    const [pathnameWithSearch, hashPart] = path.split('#', 2)
    const [pathname, search] = pathnameWithSearch.split('?', 2)

    return {
      pathname: stripBase(pathname || '/', base),
      search: search
        ? `?${search}`
        : '',
      hash: hashPart
        ? `#${hashPart}`
        : '',
    }
  }
}

const hashURLAdapter: URLAdapter = {
  getLocation: (base: string): LocationLike => {
    return getLocationFromHash(base)
  },
  updateURL: (path: string, base: string) => {
    // Hash 路由使用 window.location.hash 来设置路径
    // base 在 hash 路由中通常不需要，但为了保持一致性，我们保留它
    const hashPath = base
      ? `${base}${path}`
      : path
    window.location.hash = hashPath
    // hash 改变会自动触发 hashchange 事件
  },
  replaceURL: (path: string, base: string) => {
    // Hash 路由使用 window.location.hash 来设置路径
    // base 在 hash 路由中通常不需要，但为了保持一致性，我们保留它
    const hashPath = base
      ? `${base}${path}`
      : path
    // 使用 history.replaceState 来替换当前历史记录，但不触发 hashchange
    window.history.replaceState(null, '', `#${hashPath}`)
    // 注意：replaceState 不会触发 hashchange，所以需要在外部手动触发 notify
  },
  redirectURL: (path: string, base: string, replaceHistory: boolean) => {
    // Hash 路由使用 window.location.hash 来设置路径
    // base 在 hash 路由中通常不需要，但为了保持一致性，我们保留它
    const hashPath = base
      ? `${base}${path}`
      : path
    if (replaceHistory) {
      // 使用 history.replaceState 来替换当前历史记录，但不触发 hashchange
      window.history.replaceState(null, '', `#${hashPath}`)
    }
    else {
      window.location.hash = hashPath
      // hash 改变会自动触发 hashchange 事件
    }
  },
  setupEventListener: (callback: () => void | Promise<void>) => {
    window.addEventListener('hashchange', callback)
    return () => {
      window.removeEventListener('hashchange', callback)
    }
  },
  initialize: (base: string, getLocation: () => LocationLike): LocationLike => {
    // 初始化：如果 hash 为空，设置默认 hash 为根路径
    if (!window.location.hash || window.location.hash === '#') {
      const defaultPath = base
        ? `${base}/`
        : '/'
      window.location.hash = defaultPath
      // 等待 hash 设置后再获取 location
      return getLocation()
    }
    return getLocation()
  },
}

export function createHashRouter(config: CreateHashRouterConfig): HashRouterInstance {
  return createBaseRouter(
    {
      routes: config.routes,
      options: config.options,
      urlAdapter: hashURLAdapter,
    },
    (params) => {
      const router: HashRouterInstance = {
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
