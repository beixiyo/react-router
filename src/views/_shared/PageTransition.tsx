import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { useRouteTransition } from '../../router'

/**
 * 路由切换退场 / 进场演示：读 useRouteTransition() 的 phase，用纯 CSS transition 做淡入淡出 + 位移
 * 不依赖任何动画库；退场 / 进场动画结束后回调 finishExit / finishEnter，通知路由完成过渡
 *
 * 与 keep-alive 缓存无关——无论页面是否被缓存，只要 RouterOptions.transition 开启，都会走到这里
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const transition = useRouteTransition()
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    if (transition?.phase !== 'entering')
      return

    // 进场先以「未展示」状态挂载一帧，下一帧再切到展示态，CSS transition 才能捕捉到属性变化
    setRevealed(false)
    const raf = requestAnimationFrame(() => setRevealed(true))
    return () => cancelAnimationFrame(raf)
  }, [transition?.phase])

  const isExiting = transition?.phase === 'exiting'
  const isEntering = transition?.phase === 'entering' && !revealed

  /**
   * 有明确前进 / 后退方向（push、浏览器原生前进后退）时走横向滑动，方向感知；
   * replace（守卫重定向、显式 replace）没有「栈方向」语义，退化为竖直淡入淡出
   */
  const direction = transition?.direction ?? 'replace'
  const axis = direction === 'replace'
    ? 'Y'
    : 'X'
  const enterOffset = direction === 'back'
    ? -12
    : 12
  const exitOffset = direction === 'back'
    ? 12
    : -12

  return (
    <div
      className="transition-all duration-300 ease-out"
      style={{
        opacity: isExiting || isEntering
          ? 0
          : 1,
        transform: isExiting
          ? `translate${axis}(${exitOffset}px)`
          : isEntering
            ? `translate${axis}(${enterOffset}px)`
            : `translate${axis}(0)`,
      }}
      onTransitionEnd={() => {
        if (transition?.phase === 'exiting')
          transition.finishExit()
        else if (transition?.phase === 'entering' && revealed)
          transition.finishEnter()
      }}
    >
      { children }
    </div>
  )
}
