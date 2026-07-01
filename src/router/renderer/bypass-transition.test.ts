import { createElement } from 'react'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useBypassEntry } from './bypass-transition'

/**
 * useBypassEntry：未缓存路由的临时退场槽位
 * 体量恒为 1（current + exiting），不参与任何持久化复用
 */

function el(text: string) {
  return createElement('div', null, text)
}

describe('useBypassEntry', () => {
  it('nextKey 为 null 时不产生任何槽位', () => {
    const { result } = renderHook(() => useBypassEntry(null, null))
    expect(result.current.current).toBeNull()
    expect(result.current.exiting).toBeNull()
  })

  it('身份变化：旧 current 挪入 exiting，新的成为 current', () => {
    const { result, rerender } = renderHook(
      ({ key, element }) => useBypassEntry(key, element),
      { initialProps: { key: 'a', element: el('a') } },
    )
    expect(result.current.current?.key).toBe('a')
    expect(result.current.exiting).toBeNull()

    rerender({ key: 'b', element: el('b') })
    expect(result.current.current?.key).toBe('b')
    expect(result.current.exiting?.key).toBe('a')
  })

  it('同一身份、元素引用变化：原地更新 current，不产生 exiting', () => {
    const elA1 = el('a1')
    const elA2 = el('a2')
    const { result, rerender } = renderHook(
      ({ key, element }) => useBypassEntry(key, element),
      { initialProps: { key: 'a', element: elA1 } },
    )
    const seq = result.current.current?.seq

    rerender({ key: 'a', element: elA2 })
    expect(result.current.current?.element).toBe(elA2)
    expect(result.current.current?.seq).toBe(seq)
    expect(result.current.exiting).toBeNull()
  })

  it('onExited 清空 exiting 槽位', () => {
    const { result, rerender } = renderHook(
      ({ key, element }) => useBypassEntry(key, element),
      { initialProps: { key: 'a' as string | null, element: el('a') as any } },
    )
    rerender({ key: 'b', element: el('b') })
    expect(result.current.exiting?.key).toBe('a')

    act(() => {
      result.current.onExited()
    })
    expect(result.current.exiting).toBeNull()
  })

  it('打断：exiting 尚未清空时身份再次变化，旧的 exiting 被直接顶掉', () => {
    const { result, rerender } = renderHook(
      ({ key, element }) => useBypassEntry(key, element),
      { initialProps: { key: 'a', element: el('a') } },
    )
    rerender({ key: 'b', element: el('b') })
    expect(result.current.exiting?.key).toBe('a')

    rerender({ key: 'c', element: el('c') })
    expect(result.current.current?.key).toBe('c')
    // 旧的退场中的 'a' 被直接丢弃，'b' 顶替成为新的退场位
    expect(result.current.exiting?.key).toBe('b')
  })

  it('nextKey 变回 null：当前槽位整体挪入 exiting', () => {
    const { result, rerender } = renderHook(
      ({ key, element }) => useBypassEntry(key, element),
      { initialProps: { key: 'a' as string | null, element: el('a') as any } },
    )
    rerender({ key: null, element: null })
    expect(result.current.current).toBeNull()
    expect(result.current.exiting?.key).toBe('a')
  })
})
