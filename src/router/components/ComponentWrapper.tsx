import type { ComponentType, LazyExoticComponent, ReactElement } from 'react'
import type { RouteComponent } from '../types'
import { lazy, memo, Suspense } from 'react'
import { LoadingFallback } from './LoadingFallback'

/**
 * 检查是否是 LazyExoticComponent（React.lazy 返回的类型）
 */
export function isLazyExoticComponent(component: RouteComponent): component is LazyExoticComponent<ComponentType<any>> {
  if (typeof component !== 'object' || component === null) {
    return false
  }

  // 检查是否有 _payload._ioInfo.name === 'lazy'
  // 这是 React 19 中 LazyExoticComponent 的标识
  if ('_payload' in component) {
    const payload = (component as any)._payload
    if (payload && payload._ioInfo?.name === 'lazy') {
      return true
    }
  }

  // 检查是否有 $$typeof（React 18 及更早版本）
  if ('$$typeof' in component) {
    const typeOf = (component as any).$$typeof
    // Symbol(react.lazy) 的检查
    if (typeOf && typeof typeOf === 'symbol' && typeOf.toString().includes('react.lazy')) {
      return true
    }
  }

  return false
}

/**
 * 稳定的包装组件，用于检测和处理动态导入函数
 * 使用 memo 确保组件身份稳定，不影响缓存
 * 通过 props 传递 component，确保组件定义稳定
 */
export const ComponentWrapper = memo(({ component }: { component: RouteComponent }) => {
  const Cmp = component as ComponentType<any>

  // 尝试调用函数来检测是否是动态导入
  // 注意：我们在组件渲染上下文中，所以这是安全的
  try {
    const result = (component as () => any)()

    // 如果返回 Promise，是动态导入
    if (result && typeof result.then === 'function') {
      const LazyCmp = lazy(() => result as Promise<{ default: ComponentType<any> }>)
      return (
        <Suspense fallback={LoadingFallback}>
          <LazyCmp />
        </Suspense>
      )
    }

    // 如果返回 React 元素
    if (result && (typeof result === 'object' && '$$typeof' in result)) {
      return result as ReactElement
    }

    // 否则当作普通组件渲染
    return <Cmp />
  }
  catch (e) {
    // 如果调用失败，可能是 React 组件，直接渲染
    // 如果渲染也失败，错误会被上层错误边界捕获
    return <Cmp />
  }
}, (prevProps, nextProps) => {
  // 自定义比较函数：只有当 component 引用改变时才重新渲染
  // 这确保相同组件引用时，React 会复用组件实例，保持缓存
  return prevProps.component === nextProps.component
})
