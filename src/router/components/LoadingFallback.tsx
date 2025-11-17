import { useEffect, useRef } from 'react'

/**
 * 默认的加载回退组件
 * 用于 Suspense 的 fallback 属性
 */
export function LoadingFallback() {
  const spinnerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const spinner = spinnerRef.current
    if (!spinner)
      return

    // 使用 Web Animations API 创建旋转动画
    const animation = spinner.animate(
      [
        { transform: 'rotate(0deg)' },
        { transform: 'rotate(360deg)' },
      ],
      {
        duration: 1000,
        iterations: Infinity,
        easing: 'linear',
      },
    )

    return () => {
      animation.cancel()
    }
  }, [])

  return (
    <div
      style={{
        padding: '1rem',
        color: '#a3a3a3',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '200px',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div
          ref={spinnerRef}
          style={{
            display: 'inline-block',
            width: '2rem',
            height: '2rem',
            border: '4px solid rgba(255, 255, 255, 0.2)',
            borderTopColor: 'rgba(255, 255, 255, 0.6)',
            borderRadius: '50%',
            marginBottom: '0.5rem',
          }}
        />
      </div>
    </div>
  )
}
