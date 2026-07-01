/**
 * 路由系统统一导出
 *
 * 导出所有外部需要使用的 API、组件、Hooks 和类型
 */

// keep-alive 缓存页可见性感知 effect（KeepAlive 组件本身由路由内部使用，不对外导出）
export { useRouteKeepAliveEffect, useRouteTransition } from './components/KeepAlive/hooks'
export type { KeepAliveEffectCallback, RouteTransitionOptions, RouteTransitionPhase, RouteTransitionState } from './components/KeepAlive/type'

// 组件
export * from './components/Link'
export * from './components/Outlet'
export * from './create-browser-router'
export * from './create-hash-router'

// Hooks
export * from './hooks'
// 核心 API
export * from './router'

// 类型定义
export * from './types'

export { push, replace } from './utils/push-replace'
