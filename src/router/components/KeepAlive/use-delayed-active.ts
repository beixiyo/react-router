import type { NavigationDirection, RouteTransitionOptions, RouteTransitionPhase } from './type'
import { useCallback, useEffect, useRef, useState } from 'react'
import { prefersReducedMotion } from '../../utils/prefers-reduced-motion'

const DEFAULT_TIMEOUT = 500

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
  const [phase, setPhase] = useState<RouteTransitionPhase>(() => {
    /** 与 effect 的 skipTransition 判定保持一致，reduced-motion 用户首帧即为终态，不闪一帧隐藏 */
    const skip = !transition
      || (transition.respectReducedMotion !== false && prefersReducedMotion())
    if (skip) {
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

  /** effect 上一次见到的 active：用于识别「挂载即失活 / 配置变更但 active 未变」的重放 */
  const lastActiveRef = useRef(active)

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
    onExitedRef.current?.()
  }, [clearTimer])

  const hasTransition = Boolean(transition)

  useEffect(() => {
    const activeChanged = lastActiveRef.current !== active
    lastActiveRef.current = active

    const mySeq = ++seqRef.current
    clearTimer()
    setCapturedDirection(directionRef.current)

    const skipTransition = !transition
      || (transition.respectReducedMotion !== false && prefersReducedMotion())

    if (skipTransition) {
      setPhase(active
        ? 'entered'
        : 'exited')
      return
    }

    if (active) {
      setPhase('entering')
      timerRef.current = setTimeout(() => {
        if (seqRef.current === mySeq)
          finishEnter()
      }, transition.enterTimeout ?? DEFAULT_TIMEOUT)
    }
    else {
      /**
       * 挂载即失活（或配置变更重放、StrictMode 二次执行）：没有退场可播，
       * 直接落在 exited，不得启动退场窗口——否则会白冻结 exitTimeout 并假触发 onExited
       */
      if (!activeChanged) {
        setPhase('exited')
        return
      }
      setPhase('exiting')
      timerRef.current = setTimeout(() => {
        if (seqRef.current === mySeq)
          finishExit()
      }, transition.exitTimeout ?? DEFAULT_TIMEOUT)
    }

    return clearTimer
  }, [
    active,
    hasTransition,
    transition?.enterTimeout,
    transition?.exitTimeout,
    transition?.respectReducedMotion,
    clearTimer,
    finishEnter,
    finishExit,
  ])

  /** 唯一真相源是 phase：仅在退场彻底完成后才视为失活（exiting 期间保持挂载播动画） */
  const effectiveActive = phase !== 'exited'

  return { effectiveActive, phase, finishEnter, finishExit, direction: capturedDirection }
}
