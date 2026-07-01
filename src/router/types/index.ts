/**
 * 路由与中间件类型定义
 */
import type { ComponentType, LazyExoticComponent, ReactElement, ReactNode } from 'react'
import type { RouteTransitionOptions } from '../components/KeepAlive/type'
import type { NavigateOptions } from '../hooks/types'
import type { RouterCacheDeleteMatcher, RouterCacheListener } from '../renderer/cache-control'

/**
 * 表示一个路由项的配置对象
 */
export interface RouteConfig {
  /** 大小写敏感（默认 false） */
  sensitive?: boolean
  /** 严格模式：不允许可选结尾分隔符（默认 false） */
  strict?: boolean
  /** 完全匹配（默认 true） */
  end?: boolean
  /** 从开始匹配（默认 true） */
  start?: boolean
  /** 段分隔符（默认 '/'） */
  delimiter?: string
  /** 是否对参数执行 decodeURIComponent（默认 true） */
  decode?: boolean
}

/**
 * 懒加载组件类型
 * 支持以下形式：
 * - `() => Promise<{ default: ComponentType<any> }>` - 动态导入
 * - `LazyExoticComponent<ComponentType<any>>` - React.lazy 返回的类型
 */
export type LazyComponent
  = | (() => Promise<{ default: ComponentType<any> }>)
    | LazyExoticComponent<ComponentType<any>>

/**
 * 路由组件类型
 * 可以是直接组件或懒加载组件
 */
export type RouteComponent = ComponentType<any> | LazyComponent

export interface RouteObject {
  /** 路由路径，支持参数如 `/users/:id` */
  path: string
  /** 对应渲染的 React 函数组件，支持直接组件或懒加载组件 */
  component: RouteComponent
  /** 可选中间件链，按配置顺序执行 */
  middlewares?: Middleware[]
  /** 可选子路由，用于嵌套路由 */
  children?: RouteObject[]
  /** 可选元信息，用于权限、标题等 */
  meta?: Record<string, unknown>
  /** 路径匹配配置，覆盖全局 */
  config?: RouteConfig
  /** 懒加载时的加载组件，覆盖全局配置 */
  loadingComponent?: ReactElement | ComponentType<any>
  /** 布局组件：用于包裹当前路由组件的外层容器 */
  layoutComponent?: ReactElement | ComponentType<any>
}

/**
 * 中间件上下文对象
 */
export interface MiddlewareContext {
  /** 目标位置对象 */
  to: LocationLike
  /** 源位置对象 */
  from?: LocationLike
  /** 路径参数 */
  params: Record<string, string | string[]>
  /** 查询参数 */
  query: URLSearchParams
  /** 从 hash 解析得到的参数（如 '#a=1&b=2'） */
  hashQuery?: URLSearchParams
  /** 路由元信息 */
  meta?: Record<string, unknown>
  /** 中间件状态对象，允许中间件在上下文中存储状态 */
  state?: Record<string, unknown>
  /** 执行重定向 */
  redirect: (path: string) => void
}

/**
 * 中间件 next 函数（异步）
 * - next(): 继续执行下一个中间件，返回 Promise，等待后续中间件执行完成
 * - next(false): 取消执行，返回 Promise
 * - next(path): 重定向到指定路径，返回 Promise，等待重定向完成
 */
export type MiddlewareNext = (path?: string | false) => Promise<void>

/**
 * 中间件函数签名
 * @param ctx 中间件上下文
 * @param next 控制中间件执行行为的函数
 */
export type Middleware = (
  ctx: MiddlewareContext,
  next: MiddlewareNext,
) => Promise<void>

/**
 * 布局配置：按路径 include/exclude 决定是否使用该布局包裹内容
 * include 为空时视为匹配所有路径；exclude 优先级高于 include
 */
export interface LayoutConfig {
  /** 路径匹配：命中任一则尝试使用此布局；空则匹配全部 */
  include?: (string | RegExp)[]
  /** 路径排除：命中任一则跳过此布局 */
  exclude?: (string | RegExp)[]
  /** 布局组件，接收 children 渲染子内容 */
  component: ComponentType<{ children: ReactNode }>
}

/**
 * 路由器选项
 */
export interface RouterOptions {
  /** 基础路径前缀 */
  base?: string
  /** 页面缓存配置；传 object 即启用缓存机制 */
  cache?: boolean | {
    /** 缓存数量限制 @default 10 */
    limit?: number
    /** 缓存包含的路径；不传则缓存所有路径，传空数组则不缓存 */
    include?: (string | RegExp)[]
    /** 缓存排除的路径；优先于 include，命中则不缓存 */
    exclude?: (string | RegExp)[]
  }
  /** 自定义缓存键生成函数 */
  cacheKey?: (loc: LocationLike) => string
  /** 路径匹配配置 */
  routeConfig?: RouteConfig
  /** 全局前置守卫，在路由跳转前执行 */
  beforeEach?: NavigationGuard
  /** 全局解析守卫，在所有组件内守卫和异步路由组件被解析之后执行 */
  beforeResolve?: NavigationGuard
  /** 全局后置守卫，在路由跳转后执行 */
  afterEach?: AfterEachGuard
  /** 全局懒加载时的加载组件 */
  loadingComponent?: ReactElement | ComponentType<any>
  /** 404 未匹配路由时渲染的组件，支持 ReactElement 或 ComponentType */
  notFoundComponent?: ReactElement | ComponentType<any>
  /** 布局列表：按 pathname 匹配，第一个命中的布局包裹渲染结果 */
  layouts?: LayoutConfig[]
  /**
   * 路由过渡动画配置：传入后路由切换会经过 entering / exiting 窗口而非立即切换，
   * 与 keep-alive 缓存完全独立——未缓存的路由同样能拿到退场窗口
   * 不传（默认）则完全不启用，行为与未接入前一致
   */
  transition?: RouteTransitionOptions
}

/**
 * 位置对象
 */
export interface LocationLike {
  /** 路径名 */
  pathname: string
  /** 查询串 */
  search: string
  /** 哈希 */
  hash: string
}

/**
 * 路由匹配结果
 */
export interface MatchResult {
  /** 命中的路由项 */
  route: RouteObject
  /** 解析出的路径参数 */
  params: Record<string, string | string[]>
  /** 父路由（如果有） */
  parent?: RouteObject
  /** 完整的路由链（从根到当前路由） */
  routeChain?: RouteObject[]
}

/**
 * 移除守卫的函数类型
 */
export type RemoveGuard = () => void

/**
 * Push/Replace 选项（类似 Vue Router）
 */
export interface PushReplaceOptions {
  /** 路径参数，默认会合并到当前 params */
  params?: Record<string, string | number | string[]>
  /** 查询参数，默认会合并到当前 query */
  query?: Record<string, string | number | string[] | undefined>
  /** Hash 参数 */
  hash?: Record<string, string | number | string[] | undefined> | string
  /** 是否替换 params（默认 false，即合并） */
  replaceParams?: boolean
  /** 是否替换 query（默认 false，即合并） */
  replaceQuery?: boolean
}

/**
 * Push 方法类型定义
 */
export type PushMethod = {
  (options?: PushReplaceOptions): void
  (path: string, options?: PushReplaceOptions): void
}

/**
 * Replace 方法类型定义
 */
export type ReplaceMethod = {
  (options?: PushReplaceOptions): void
  (path: string, options?: PushReplaceOptions): void
}

/**
 * 路由器实例接口
 */
export interface Router {
  /** 导航到指定路径（支持相对数字与导航选项） */
  navigate: (to: string | number, options?: NavigateOptions) => void
  /** Replace 导航方法，类似 Vue Router，默认合并 params 和 query */
  replace: ReplaceMethod
  /** Push 导航方法，类似 Vue Router，默认合并 params 和 query */
  push: PushMethod
  /** 返回 */
  back: () => void
  /** 当前位置信息 */
  location: LocationLike
  /** 注册全局前置守卫，返回移除函数 */
  beforeEach: (guard: NavigationGuard) => RemoveGuard
  /** 注册全局解析守卫，返回移除函数 */
  beforeResolve: (guard: NavigationGuard) => RemoveGuard
  /** 注册全局后置守卫，返回移除函数 */
  afterEach: (guard: AfterEachGuard) => RemoveGuard
  /** 清空所有 keep-alive 页面缓存 */
  clearCache: () => void
  /**
   * 删除匹配指定 key 的 keep-alive 页面缓存
   *
   * key 的形态：
   * - 叶子页：`cacheKey(loc)`（默认即 pathname，如 `/users/1/profile`）
   * - 布局壳：路由「结构化模式」，即路由 path 原样（如 `/users/:id`、`/files/**`），
   *   不是导航时的具体路径——传 `/users/1` 删不掉 `/users/:id` 壳
   *
   * 字符串匹配为全等；需按前缀 / 跨参数删除时请用 RegExp 或谓词函数
   */
  deleteCache: (matcher: RouterCacheDeleteMatcher) => void
  /** 订阅 keep-alive 页面缓存控制事件，供 RouterProvider 内部使用 */
  subscribeCache: (listener: RouterCacheListener) => RemoveGuard
  /** 订阅全局位置变化，返回取消订阅函数 */
  subscribe: (listener: (location: LocationLike) => void) => RemoveGuard
}

/**
 * createBrowserRouter 返回的实例类型
 */
export interface BrowserRouterInstance extends Router {
  /** 实例唯一标识 */
  id: string
  /** 原始路由配置 */
  routes: RouteObject[]
  /** 原始配置选项 */
  options: RouterOptions
  /** 基础路径 */
  base: string
  /** 读取当前位置 */
  getLocation: () => LocationLike
  /** 订阅位置变化 */
  subscribe: (listener: (location: LocationLike) => void) => () => void
  /** 释放内部副作用（popstate 监听等） */
  dispose: () => void
}

/**
 * createBrowserRouter 的入参
 */
export interface CreateBrowserRouterConfig {
  routes: RouteObject[]
  options?: RouterOptions
}

/**
 * createHashRouter 返回的实例类型
 */
export interface HashRouterInstance extends Router {
  /** 实例唯一标识 */
  id: string
  /** 原始路由配置 */
  routes: RouteObject[]
  /** 原始配置选项 */
  options: RouterOptions
  /** 基础路径 */
  base: string
  /** 读取当前位置 */
  getLocation: () => LocationLike
  /** 订阅位置变化 */
  subscribe: (listener: (location: LocationLike) => void) => () => void
  /** 释放内部副作用（hashchange 监听等） */
  dispose: () => void
}

/**
 * createHashRouter 的入参
 */
export interface CreateHashRouterConfig {
  routes: RouteObject[]
  options?: RouterOptions
}

/**
 * 路由渲染入口的返回结构
 */
export interface RenderResult {
  /** 当前匹配组件的元素 */
  element: ReactElement
  /** 当前匹配的中间件链（含父级） */
  chain: Middleware[]
  /** 当前匹配结果 */
  match: MatchResult | null
}

/**
 * 导航守卫上下文
 * 提供路由跳转时的上下文信息
 */
export interface NavigationGuardContext {
  /** 目标位置对象 */
  to: LocationLike
  /** 源位置对象 */
  from: LocationLike
  /** 路径参数 */
  params: Record<string, string | string[]>
  /** 查询参数 */
  query: URLSearchParams
  /** 从 hash 解析得到的参数（如 '#a=1&b=2'） */
  hashQuery?: URLSearchParams
  /** 路由元信息 */
  meta?: Record<string, unknown>
  /** 匹配的路由对象 */
  route?: RouteObject
}

/**
 * 导航守卫的 next 函数（异步）
 * - next(): 继续导航，返回 Promise，等待导航完成
 * - next(false): 取消导航，返回 Promise
 * - next(path): 重定向到指定路径，返回 Promise，等待重定向完成
 */
export type GuardNext = (path?: string | false) => Promise<void>

/**
 * 导航守卫函数类型（支持异步）
 * @param to 目标路由上下文
 * @param from 源路由上下文
 * @param next 控制导航行为的函数
 */
export type NavigationGuard = (
  to: NavigationGuardContext,
  from: NavigationGuardContext,
  next: GuardNext,
) => void | Promise<void>

/**
 * 后置守卫函数类型（支持异步，不需要 next 函数）
 * @param to 目标路由上下文
 * @param from 源路由上下文
 */
export type AfterEachGuard = (
  to: NavigationGuardContext,
  from: NavigationGuardContext,
) => void | Promise<void>
