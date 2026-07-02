import type { ReactElement } from 'react'
import { useCallback, useRef, useState } from 'react'

/**
 * 未缓存路由的临时退场槽位：只有「当前」与「正在退场」两个位置，不参与任何 LRU 复用
 */
export interface BypassSlot {
  key: string
  element: ReactElement
  seq: number
}

/** 退场槽位集合：{@link useBypassEntry} 返回值的组成部分 */
export interface BypassSlots {
  current: BypassSlot | null
  exiting: BypassSlot | null
}

/**
 * 为「未进入 keep-alive 缓存」的路由提供退场窗口
 *
 * 缓存条目切走后一直保留挂载（只是被 Suspense 挂起），天然能延迟卸载播放退场动画；
 * 未缓存的叶子 / 壳没有持久 Map 兜底，身份一变旧元素就会被同步移出渲染树，插不进退场态。
 * 这里维护一个体量恒为 1、不持久化的退场槽位：旧内容临时挪进 exiting 播完动画即彻底丢弃——
 * 不影响「未缓存路由再次进入即为全新实例」的既有语义
 *
 * 用「渲染期间按 props 调整 state」的方式同步完成槽位切换，避免多渲染一帧的闪烁
 *
 * @param nextKey 本次渲染应展示的身份；`null` 表示当前无需 bypass 展示（走缓存或无匹配）
 * @param element 对应身份的元素；`nextKey` 非空时必传
 */
export function useBypassEntry(nextKey: string | null, element: ReactElement | null): BypassSlots & { onExited: () => void } {
  const seqRef = useRef(0)
  const [slots, setSlots] = useState<BypassSlots>({ current: null, exiting: null })

  let next = slots

  if (nextKey === null) {
    if (slots.current)
      next = { current: null, exiting: slots.current }
  }
  else if (slots.current?.key !== nextKey) {
    next = {
      current: { key: nextKey, element: element as ReactElement, seq: ++seqRef.current },
      // 打断即顶掉仍在退场中的旧槽位：同一时刻只保留一个退场位，旧的直接失去继续挂载的机会
      exiting: slots.current,
    }
  }
  else if (slots.current.element !== element) {
    next = { ...slots, current: { ...slots.current, element: element as ReactElement } }
  }

  if (next !== slots) {
    setSlots(next)
  }

  const onExited = useCallback(() => {
    /** 幂等：opacity/transform 等多属性会触发多次 transitionend，重复调用不产生多余提交 */
    setSlots(s => (s.exiting === null
      ? s
      : { ...s, exiting: null }))
  }, [])

  return { ...next, onExited }
}
