/**
 * 路由与中间件类型定义
 */
import type { ComponentType, LazyExoticComponent, ReactElement } from 'react'
import type { NavigateOptions } from '../hooks/types'

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
 * 路由器选项
 */
export interface RouterOptions {
  /** 基础路径前缀 */
  base?: string
  /** 页面缓存配置 */
  cache?: boolean | {
    /** 缓存数量限制 @default 10 */
    limit?: number
    /** 缓存包含的路径 */
    include?: (string | RegExp)[]
    /** 缓存排除的路径 */
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
