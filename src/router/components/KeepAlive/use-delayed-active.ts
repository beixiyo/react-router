import type { NavigationDirection, RouteTransitionOptions, RouteTransitionPhase } from './type'
import { useCallback, useEffect, useRef, useState } from 'react'

const DEFAULT_TIMEOUT = 500

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * 让 `active` 的切换经过一段可控的过渡窗口，而非立即生效：
 * - 失活（true → false）：`effectiveActive` 仍保持 true，直到 finishExit 被调用或超时，才真正转为 false
 * - 激活（false → true）：`effectiveActive` 立即为 true（副作用照常开始），phase 先停在 entering，
 *   直到 finishEnter 被调用或超时才转为 entered
 *
 * 未传 `transition`，或命中 `prefers-reduced-motion: reduce`（默认遵循）时，
 * 完全退化为「立即切换」，与未接入过渡前行为一致
 */
export function useDelayedActive(
  active: boolean,
  transition?: RouteTransitionOptions,
  onExited?: () => void,
  direction?: NavigationDirection,
) {
  const [effectiveActive, setEffectiveActive] = useState(active)
  const [phase, setPhase] = useState<RouteTransitionPhase>(() => {
    if (!transition) {
      return active
        ? 'entered'
        : 'exited'
    }
    return active
      ? 'entering'
      : 'exited'
  })

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const seqRef = useRef(0)
  const onExitedRef = useRef(onExited)
  onExitedRef.current = onExited

  /** 始终持有最新 direction；只在 active 切换的瞬间被读取快照，避免动画播放中途方向突变 */
  const directionRef = useRef<NavigationDirection>(direction ?? 'replace')
  directionRef.current = direction ?? 'replace'
  const [capturedDirection, setCapturedDirection] = useState<NavigationDirection>(directionRef.current)

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const finishEnter = useCallback(() => {
    clearTimer()
    setPhase('entered')
  }, [clearTimer])

  const finishExit = useCallback(() => {
    clearTimer()
    setPhase('exited')
    setEffectiveActive(false)
    onExitedRef.current?.()
  }, [clearTimer])

  useEffect(() => {
    const mySeq = ++seqRef.current
    clearTimer()
    setCapturedDirection(directionRef.current)

    const skipTransition = !transition
      || (transition.respectReducedMotion !== false && prefersReducedMotion())

    if (skipTransition) {
      setEffectiveActive(active)
      setPhase(active
        ? 'entered'
        : 'exited')
      return
    }

    if (active) {
      setEffectiveActive(true)
      setPhase('entering')
      timerRef.current = setTimeout(() => {
        if (seqRef.current === mySeq)
          finishEnter()
      }, transition.enterTimeout ?? DEFAULT_TIMEOUT)
    }
    else {
      setPhase('exiting')
      timerRef.current = setTimeout(() => {
        if (seqRef.current === mySeq)
          finishExit()
      }, transition.exitTimeout ?? DEFAULT_TIMEOUT)
    }

    return clearTimer
  }, [
    active,
    Boolean(transition),
    transition?.enterTimeout,
    transition?.exitTimeout,
    transition?.respectReducedMotion,
    clearTimer,
    finishEnter,
    finishExit,
  ])

  return { effectiveActive, phase, finishEnter, finishExit, direction: capturedDirection }
}
