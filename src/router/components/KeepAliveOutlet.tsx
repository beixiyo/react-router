import type { ReactElement } from 'react'
import type { CacheEntry } from '../renderer/cache'
import type { LocationLike, MatchResult, RouteObject, RouterOptions } from '../types'
import { createElement, useContext, useEffect, useMemo, useReducer, useRef } from 'react'
import { LocationCtx, RouterCtx } from '../context'
import { getCachedElement, setShellEntry, updateCache, useCacheConfig, useCacheMap } from '../renderer/cache'
import { isCacheKeyMatched } from '../renderer/cache-control'
import { createRouteElement, emptyElement } from '../renderer/route-matcher'
import { matchLayout, matchRoutes } from '../utils'
import { KeepAlive, KeepAliveProvider } from './KeepAlive'

/**
 * 用 layouts 配置包裹元素（仅根层使用）
 */
function wrapWithLayout(element: ReactElement, options: RouterOptions, pathname: string): ReactElement {
  const layouts = options.layouts
  if (!layouts?.length)
    return element

  const layout = layouts.find(l => matchLayout(pathname, l))
  if (!layout)
    return element

  return createElement(layout.component, null, element)
}

/** 本层匹配链的「头节点」：本层实际负责渲染的那个路由 */
function getMatchHead(match: MatchResult): RouteObject {
  return match.routeChain?.[0] ?? match.route
}

/**
 * 本层当前匹配渲染的是「壳」还是「叶子页」
 *
 * - 壳（承载 `<Outlet/>` 的共享祖先 / 布局）：匹配链不止一节（下面还有更深匹配），
 *   或 head 路由本身带 children（直达父路由 bare path 时虽无子路由命中，它仍是壳）
 * - 叶子：最深、不含 `<Outlet/>` 的页面
 */
function isShellMatch(match: MatchResult): boolean {
  const chain = match.routeChain ?? [match.route]
  return chain.length > 1 || !!chain[0]?.children?.length
}

/**
 * 计算「本层」的 keep-alive 缓存键
 *
 * - 叶子层：用 `cacheKey(loc)`（或默认 pathname），保留按会话 / 参数隔离的语义
 * - 壳层：用 head 的「结构化路由模式」（route.path 原样，含 `:param` / `**` 占位）：
 *   · 同一壳的不同参数实例（`/users/1`、`/users/2`）收敛为同一键 → 单实例、参数随导航刷新
 *   · 静态 `/settings` 与动态 `/:tab` 这类同级路由模式天然不同 → 不会撞键渲染错组件
 */
function computeLevelKey(match: MatchResult, location: LocationLike, options: RouterOptions): string {
  if (isShellMatch(match))
    return getMatchHead(match).path

  return options.cacheKey?.(location) ?? location.pathname
}

/**
 * 逐层 keep-alive 的统一渲染引擎（根 Outlet 与嵌套 Outlet 共用）
 *
 * 每一层只缓存 / keep-alive「自己这一层的直接子路由」，并把「壳」与「叶子」分治：
 *
 * - 壳（共享祖先 / 布局）：按路由模式收敛为单实例，放进独立的 shellCache（不参与叶子 LRU 淘汰），
 *   元素每次渲染刷新 → 始终单挂载、副作用不重复，同时参数 / splat 跟随当前导航更新；
 * - 叶子页：按 cacheKey 走 LRU 缓存并遵循 include / exclude，切走再切回保留状态
 *
 * 当前层要展示的元素始终在「渲染体」中被回填进缓存（而非 useMemo 副作用），
 * 因此 clearCache / deleteCache 后能立即回填、不会白屏；被清掉的条目以新 seq 重新挂载（状态重置）
 */
export function KeepAliveOutlet({
  candidates,
  parentRoute,
  location,
  options,
  isRoot,
}: {
  candidates: RouteObject[]
  parentRoute?: RouteObject
  location: LocationLike
  options: RouterOptions
  isRoot: boolean
}): ReactElement {
  const router = useContext(RouterCtx)
  /** generation：clearCache / deleteCache 触发的强制刷新计数，纳入 liveElement 依赖以重建元素 */
  const [generation, forceRender] = useReducer(n => n + 1, 0)

  const match = useMemo(
    () => matchRoutes(candidates, location.pathname, options.routeConfig, parentRoute),
    [candidates, location.pathname, options.routeConfig, parentRoute],
  )

  const { effectiveLimit, eligible, cacheEnabled } = useCacheConfig(options, location)
  /** 缓存是否真正生效（全局启用且 limit 有效） */
  const cacheActive = cacheEnabled && effectiveLimit !== undefined

  /** 叶子页 LRU 缓存：受 limit 约束、遵循 include / exclude */
  const leafCache = useCacheMap(effectiveLimit)
  /**
   * 壳缓存：与叶子分开，不受 limit 淘汰（容量天然由「本层带 children 的候选路由数」界定，静态有限），
   * 键为结构化路由模式 → 同一壳的不同参数收敛为单实例
   */
  const shellCacheRef = useRef<Map<string, CacheEntry> | null>(null)
  if (!shellCacheRef.current)
    shellCacheRef.current = new Map()
  const shellCache = shellCacheRef.current

  /** keep-alive uniqueKey 跨层去重，避免不同层级用同名键时 active/deactive 钩子互相串扰 */
  const scopeId = parentRoute?.path ?? '__root__'

  const isShell = match
    ? isShellMatch(match)
    : false

  const levelKey = useMemo(
    () => (match
      ? computeLevelKey(match, location, options)
      : undefined),
    [match, location.pathname, location.search, location.hash, options],
  )

  /** 订阅缓存控制事件：清 / 删两类缓存后强制重渲染（渲染体会自动回填当前页） */
  useEffect(() => {
    if (!router)
      return

    return router.subscribeCache((event) => {
      if (event.type === 'clear') {
        leafCache.clear()
        shellCache.clear()
      }
      else {
        for (const key of [...leafCache.keys()]) {
          if (isCacheKeyMatched(key, event.matcher))
            leafCache.delete(key)
        }
        for (const key of [...shellCache.keys()]) {
          if (isCacheKeyMatched(key, event.matcher))
            shellCache.delete(key)
        }
      }

      forceRender()
    })
  }, [leafCache, shellCache, router])

  /**
   * 当前匹配的「实时元素」——只构建，不读写缓存
   * 依赖里带上 generation：清 / 删缓存后会重建出全新元素，供被清掉的当前页原地重新挂载
   */
  const liveElement = useMemo<ReactElement | null>(() => {
    let element: ReactElement | null

    if (!match) {
      if (!isRoot)
        return null

      const NotFound = options.notFoundComponent
      element = NotFound
        ? (typeof NotFound === 'function'
            ? createElement(NotFound)
            : NotFound)
        : emptyElement('Not Found')
    }
    else {
      element = createRouteElement(match.route, match, options)
    }

    if (isRoot && element)
      element = wrapWithLayout(element, options, location.pathname)

    return element
  }, [match, location.pathname, location.search, location.hash, options.routeConfig, options.notFoundComponent, options.layouts, isRoot, generation])

  /**
   * 渲染期同步缓存（幂等）：把当前层要保活的元素写入对应缓存
   * 放在渲染体而非 useMemo —— 避免 memo 命中 bail-out 时缓存不被回填（白屏根因）
   */
  let currentInCache = false
  if (match && levelKey !== undefined && liveElement && cacheActive) {
    if (isShell) {
      // 壳：刷新元素（参数跟随导航），保持单实例
      setShellEntry(shellCache, levelKey, liveElement, location)
      currentInCache = true
    }
    else if (eligible) {
      // 叶子：插入即冻结（保留状态），命中则仅刷新顺序 / location
      if (!leafCache.has(levelKey))
        updateCache(leafCache, levelKey, liveElement, location, effectiveLimit)
      else
        getCachedElement(leafCache, levelKey, location)
      currentInCache = true
    }
  }

  /**
   * 根层无匹配（真正的 404 / 死路）时不渲染保活子树，
   * 避免上一棵已缓存子树隐藏在 NotFound 之后继续运行副作用（泄漏）
   */
  const suppressCache = isRoot && !match
  const shellEntries = suppressCache
    ? []
    : [...shellCache.values()]
  const leafEntries = suppressCache
    ? []
    : [...leafCache.values()]

  return (
    <KeepAliveProvider>
      { shellEntries.map(item => (
        <LocationCtx.Provider key={`${item.key}#${item.seq ?? 0}`} value={item.location}>
          <KeepAlive
            uniqueKey={`${scopeId}::shell::${item.key}#${item.seq ?? 0}`}
            active={isShell && item.key === levelKey}
          >
            { item.element }
          </KeepAlive>
        </LocationCtx.Provider>
      )) }
      { leafEntries.map(item => (
        <LocationCtx.Provider key={`${item.key}#${item.seq ?? 0}`} value={item.location}>
          <KeepAlive
            uniqueKey={`${scopeId}::leaf::${item.key}#${item.seq ?? 0}`}
            active={!isShell && eligible && item.key === levelKey}
          >
            { item.element }
          </KeepAlive>
        </LocationCtx.Provider>
      )) }
      { !currentInCache && liveElement }
    </KeepAliveProvider>
  )
}
