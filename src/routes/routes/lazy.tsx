import type { ComponentType } from 'react'
/**
 * 懒加载路由配置示例
 */
import type { RouteObject } from '../../router/types'
import { lazy, Suspense } from 'react'

// 方式 1: 使用 React.lazy() - 推荐方式
// 添加延迟以便看到加载效果
const LazyPage = lazy(() => {
  return new Promise<{ default: ComponentType<any> }>((resolve) => {
    setTimeout(() => {
      resolve(import('../../views/lazy/page'))
    }, 2000) // 延迟 800ms
  })
})

export const lazyRoutes: RouteObject[] = [
  {
    path: '/lazy',
    // 方式 1: 直接传入 React.lazy() 创建的组件（会自动用 Suspense 包裹，使用默认的 LoadingFallback）
    component: LazyPage,
  },
  {
    path: '/lazy-direct',
    // 方式 2: 直接传入动态导入函数（会自动用 lazy 包装并用 Suspense 包裹，使用默认的 LoadingFallback）
    component: () => import('../../views/lazy/page'),
  },
  {
    path: '/lazy-custom',
    // 方式 3: 如果想自定义 fallback，可以自己包裹 Suspense（不会使用默认的 LoadingFallback）
    component: () => (
      <Suspense fallback={<div>自定义加载中...</div>}>
        <LazyPage />
      </Suspense>
    ),
  },
]
