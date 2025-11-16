import type { ReactElement } from 'react'

/**
 * 默认的加载回退组件
 * 用于 Suspense 的 fallback 属性
 */
export const LoadingFallback: ReactElement = (
  <div className="p-4 text-neutral-400 flex items-center justify-center min-h-[200px]">
    <div className="text-center">
      <div className="inline-block w-8 h-8 border-4 border-white/20 border-t-white/60 rounded-full animate-spin mb-2"></div>
      <div>加载中...</div>
    </div>
  </div>
)
