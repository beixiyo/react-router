import type { ComponentType, ReactElement } from 'react'
import type { RouteComponent } from '../types'
import { Suspense } from 'react'
import { ComponentWrapper, isLazyExoticComponent } from '../components/ComponentWrapper'
import { LoadingFallback } from '../components/LoadingFallback'
import { ParamsContext } from '../context'

/**
 * 渲染路由组件（支持懒加载）
 * 支持两种懒加载形式：
 * 1. LazyExoticComponent（用户使用 React.lazy()）- 推荐方式
 * 2. 动态导入函数 () => Promise<{ default: ComponentType }> - 自动用 lazy 包装
 *
 * @param component 路由组件（可能是普通组件、懒加载组件或动态导入函数）
 * @param params 路由参数
 * @returns React 元素
 */
export function renderRouteComponent(component: RouteComponent, params: Record<string, string | string[]> = {}): ReactElement {
  // 如果已经是 LazyExoticComponent，需要用 Suspense 包裹
  if (isLazyExoticComponent(component)) {
    const LazyCmp = component
    return (
      <ParamsContext.Provider value={params}>
        <Suspense fallback={LoadingFallback}>
          <LazyCmp />
        </Suspense>
      </ParamsContext.Provider>
    )
  }

  // 如果是函数，需要检测是 React 组件还是动态导入函数
  if (typeof component === 'function') {
    // 检查是否是类组件
    const isClassComponent = 'prototype' in component && component.prototype?.isReactComponent
    if (!isClassComponent) {
      // 不是类组件，可能是函数组件或动态导入函数
      // 使用稳定的包装组件来检测和处理
      return (
        <ParamsContext.Provider value={params}>
          <ComponentWrapper component={component} />
        </ParamsContext.Provider>
      )
    }
  }

  // 普通组件或类组件直接渲染
  const Cmp = component as ComponentType<any>
  return (
    <ParamsContext.Provider value={params}>
      <Cmp />
    </ParamsContext.Provider>
  )
}
