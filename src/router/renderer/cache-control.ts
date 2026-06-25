/** keep-alive 缓存删除匹配器 */
export type RouterCacheDeleteMatcher = string | RegExp | ((key: string) => boolean)

/** keep-alive 缓存控制事件 */
export type RouterCacheEvent
  = | { type: 'clear' }
    | { type: 'delete', matcher: RouterCacheDeleteMatcher }

/** keep-alive 缓存控制事件监听器 */
export type RouterCacheListener = (event: RouterCacheEvent) => void

/** 创建 keep-alive 缓存控制器 */
export function createRouterCacheController(): RouterCacheController {
  const listeners = new Set<RouterCacheListener>()

  const emit = (event: RouterCacheEvent) => {
    listeners.forEach((listener) => {
      listener(event)
    })
  }

  return {
    clearCache() {
      emit({ type: 'clear' })
    },
    deleteCache(matcher) {
      emit({ type: 'delete', matcher })
    },
    subscribeCache(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

/** 判断缓存 key 是否匹配删除条件 */
export function isCacheKeyMatched(key: string, matcher: RouterCacheDeleteMatcher): boolean {
  if (typeof matcher === 'string')
    return key === matcher
  if (matcher instanceof RegExp)
    return matcher.test(key)
  return matcher(key)
}

/** keep-alive 缓存控制器 */
export interface RouterCacheController {
  /** 清空所有 keep-alive 页面缓存 */
  clearCache: () => void
  /**
   * 删除匹配指定 key 的 keep-alive 页面缓存
   * 叶子页 key 为 `cacheKey(loc)`（默认 pathname）；布局壳 key 为路由结构化模式（path 原样，如 `/users/:id`）。
   * 字符串为全等匹配，跨参数 / 前缀删除请用 RegExp 或谓词函数
   */
  deleteCache: (matcher: RouterCacheDeleteMatcher) => void
  /** 订阅 keep-alive 页面缓存控制事件 */
  subscribeCache: (listener: RouterCacheListener) => () => void
}
