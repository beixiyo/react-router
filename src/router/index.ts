/**
 * 路由系统统一导出
 *
 * 导出所有外部需要使用的 API、组件、Hooks 和类型
 */

export * from './components/Link'

// 组件
export * from './components/Outlet'
// Hooks
export * from './hooks'

// 核心 API
export * from './router'

// 类型定义
export * from './types'

// 全局导航函数（可在 hook 外调用）
export { back, navigate, replace } from './utils/navigate'
