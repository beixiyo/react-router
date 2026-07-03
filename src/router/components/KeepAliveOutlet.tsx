import type { ReactElement } from 'react'
import type { BypassSlot } from '../renderer/bypass-transition'
import type { CacheEntry } from '../renderer/cache'
import type { LocationLike, MatchResult, RouteObject, RouterOptions } from '../types'
import { createElement, useContext, useEffect, useMemo, useReducer, useRef } from 'react'
import { LocationCtx, RouterCtx } from '../context'
import { useBypassEntry } from '../renderer/bypass-transition'
import { getCachedElement, setShellEntry, updateCache, useCacheConfig, useCacheMap } from '../renderer/cache'
import { isCacheKeyMatched } from '../renderer/cache-control'
import { createRouteElement, emptyElement } from '../renderer/route-matcher'
import { matchLayout, matchRoutes } from '../utils'
import { resolveTransition, routesHaveTransition } from '../utils/transition-config'
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

/** keep-alive 条目的类别：壳 / 叶子 / 未缓存路由的临时退场槽位 */
type AliveKind = 'shell' | 'leaf' | 'bypass'

/** KeepAlive uniqueKey 的统一编码，避免拼接格式散落多处 */
function makeAliveKey(scopeId: string, kind: AliveKind, key: keyof any, seq: number): string {
  return `${scopeId}::${kind}::${String(key)}#${seq}`
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
 * 用当前参数填充路由 path 模式，得到「本层已消费的具体路径前缀」
 * 仅用于壳的 scope:'cache' 位置：让壳的缓存位置稳定代表自身层级（如 `/users/1`），
 * 而非跟随最深叶子（`/users/1/profile`）来回跳
 */
function fillPath(pattern: string, params: Record<string, string | string[]>): string {
  const filled = pattern
    .replace(/:([A-Z0-9_]+)\??/gi, (_, name: string) => {
      const value = params[name]
      if (Array.isArray(value))
        return value.join('/')
      return value ?? ''
    })
    .replace(/\/{2,}/g, '/')
    .replace(/\/+$/, '')

  return filled || '/'
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

    return element
    /**
     * deps 刻意不含 search / hash：已核实元素创建链路（route-matcher / route-loader）
     * 不消费它们——查询参数经 LocationCtx / useLocation 订阅送达页面；
     * 若纳入，仅 search 变化的导航也会重建整棵元素树、击穿 Wrapper memo
     */
  }, [match, location.pathname, options.routeConfig, options.notFoundComponent, isRoot, generation])

  /**
   * 本层当前路由实际生效的过渡配置：路由级（就近）与全局字段级合并，
   * 随缓存条目 / bypass 槽位存储——退场中的旧条目用自己的配置播完动画
   *
   * 必须锚定引用：合并会产新对象，未 memo 时每渲染换新 →
   * 击穿 memo(KeepAlive) 并让 RouteTransitionContext 每渲染广播
   */
  const levelRoute = match
    ? (isShell
        ? getMatchHead(match)
        : match.route)
    : undefined
  const levelTransition = useMemo(
    () => (levelRoute
      ? resolveTransition(levelRoute, options)
      : options.transition),
    [levelRoute, options],
  )

  /**
   * 渲染期同步缓存（幂等）：把当前层要保活的元素写入对应缓存
   * 放在渲染体而非 useMemo —— 避免 memo 命中 bail-out 时缓存不被回填（白屏根因）
   */
  let currentInCache = false
  if (match && levelKey !== undefined && liveElement && cacheActive) {
    if (isShell) {
      // 壳：刷新元素（参数跟随导航），保持单实例
      // 缓存位置用「自身已消费的路径前缀」而非当前最深叶子路径，
      // 使壳内 useLocation({ scope: 'cache' }) 稳定代表本层级
      const shellLocation: LocationLike = {
        pathname: fillPath(getMatchHead(match).path, match.params ?? {}),
        search: location.search,
        hash: location.hash,
      }
      setShellEntry(shellCache, levelKey, liveElement, shellLocation, levelTransition)
      currentInCache = true
    }
    else if (eligible) {
      // 叶子：插入即冻结（保留状态），命中则仅刷新顺序 / location
      if (!leafCache.has(levelKey))
        updateCache(leafCache, levelKey, liveElement, location, effectiveLimit, levelTransition)
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

  /**
   * 未缓存路由的退场窗口：全局或任一路由配置了过渡即启用（某路由 `transition: false`
   * 只关闭自己的动画，离开「有过渡的路由」仍需要退场槽位就位）；
   * 全部未配置时维持原有裸渲染（!currentInCache && liveElement），零行为差异
   *
   * 根层无匹配（404）同样走 bypass 展示 NotFound——旧的裸渲染分支在启用过渡后被关闭，
   * 若不给 404 槽位，notFoundComponent 将没有任何渲染路径（空白页）
   */
  const transitionEnabled = useMemo(
    () => Boolean(options.transition) || routesHaveTransition(candidates),
    [options.transition, candidates],
  )
  const bypassKey = !transitionEnabled || currentInCache
    ? null
    : (match && levelKey !== undefined)
        ? `${isShell
          ? 'shell'
          : 'leaf'}:${levelKey}`
        : (!match && isRoot)
            ? '__notfound__'
            : null
  const { current: bypassCurrent, exiting: bypassExiting, onExited: onBypassExited } = useBypassEntry(bypassKey, liveElement, levelTransition)

  /** 当前导航方向快照，随 router 通知同一渲染批次更新，透传给每个 KeepAlive 供其在 active 切换瞬间捕获 */
  const navigationDirection = router?.navigationDirection

  const renderCachedEntry = (kind: 'shell' | 'leaf', item: CacheEntry, active: boolean) => (
    <LocationCtx.Provider key={`${item.key}#${item.seq ?? 0}`} value={item.location}>
      <KeepAlive
        uniqueKey={makeAliveKey(scopeId, kind, item.key, item.seq ?? 0)}
        active={active}
        transition={item.transition}
        direction={navigationDirection}
      >
        { item.element }
      </KeepAlive>
    </LocationCtx.Provider>
  )

  const bypassSlots = [bypassExiting, bypassCurrent].filter((slot): slot is BypassSlot => slot !== null)

  const content = (
    <KeepAliveProvider>
      { shellEntries.map(item => renderCachedEntry('shell', item, isShell && item.key === levelKey)) }
      { leafEntries.map(item => renderCachedEntry('leaf', item, !isShell && eligible && item.key === levelKey)) }
      { !transitionEnabled && !currentInCache && liveElement }
      {
        /*
         * key 必须只取决于 seq（同一逻辑槽位在 current ⇄ exiting 之间迁移时保持不变），
         * 否则 React 会因 key 变化而卸载重挂，白白丢失「仍保留挂载播放退场动画」的效果
         */
      }
      { transitionEnabled && bypassSlots.map(slot => (
        <KeepAlive
          key={`bypass-${slot.seq}`}
          uniqueKey={makeAliveKey(scopeId, 'bypass', slot.key, slot.seq)}
          active={slot === bypassCurrent}
          transition={slot.transition}
          direction={navigationDirection}
          onExited={slot === bypassExiting
            ? onBypassExited
            : undefined}
        >
          { slot.element }
        </KeepAlive>
      )) }
    </KeepAliveProvider>
  )

  // 全局布局（options.layouts）在缓存之外、整层只包裹一次 → 单实例，
  // 不随每个被缓存的页面复制（否则其副作用 / 订阅会按缓存页数重复运行）
  return isRoot
    ? wrapWithLayout(content, options, location.pathname)
    : content
}
