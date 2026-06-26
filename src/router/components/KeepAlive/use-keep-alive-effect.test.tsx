import { act, cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { KeepAlive } from './KeepAlive'
import { useRouteKeepAliveEffect } from './hooks'
import { KeepAliveProvider } from './KeepAliveProvider'

/**
 * useRouteKeepAliveEffect：KeepAlive 可见性感知 effect
 *
 * - 激活（首次挂载即 active，或 false→true）执行 effect
 * - 失活（true→false 隐藏）或卸载执行 cleanup
 * - 经 KeepAliveKeyContext 自动取 key，消费者无需手动传
 * - 内部 ref 始终调用最新闭包，无 stale 问题
 * - 未被 KeepAlive 包裹（key 为 undefined）时退化为普通 effect
 */

function Probe({ effect, deactive }: { effect: () => void, deactive: () => void }) {
  useRouteKeepAliveEffect(() => {
    effect()
    return deactive
  })
  return <div data-testid="probe">probe</div>
}

function Tree({
  active,
  effect,
  deactive,
}: {
  active: boolean
  effect: () => void
  deactive: () => void
}) {
  return (
    <KeepAliveProvider>
      <KeepAlive uniqueKey="K" active={active}>
        <Probe effect={effect} deactive={deactive} />
      </KeepAlive>
    </KeepAliveProvider>
  )
}

describe('useRouteKeepAliveEffect', () => {
  afterEach(() => {
    cleanup()
  })

  it('初次挂载即 active 时执行 effect（不执行 cleanup）', () => {
    const effect = vi.fn()
    const deactive = vi.fn()
    render(<Tree active effect={effect} deactive={deactive} />)

    expect(effect).toHaveBeenCalledTimes(1)
    expect(deactive).not.toHaveBeenCalled()
  })

  it('active 由 true → false（隐藏）时执行 cleanup', () => {
    const effect = vi.fn()
    const deactive = vi.fn()
    const { rerender } = render(<Tree active effect={effect} deactive={deactive} />)
    expect(effect).toHaveBeenCalledTimes(1)

    act(() => {
      rerender(<Tree active={false} effect={effect} deactive={deactive} />)
    })

    expect(deactive).toHaveBeenCalledTimes(1)
    expect(effect).toHaveBeenCalledTimes(1)
  })

  it('再激活（false → true）时重新执行 effect', () => {
    const effect = vi.fn()
    const deactive = vi.fn()
    const { rerender } = render(<Tree active effect={effect} deactive={deactive} />)

    act(() => {
      rerender(<Tree active={false} effect={effect} deactive={deactive} />)
    })
    expect(effect).toHaveBeenCalledTimes(1)
    expect(deactive).toHaveBeenCalledTimes(1)

    act(() => {
      rerender(<Tree active effect={effect} deactive={deactive} />)
    })

    expect(effect).toHaveBeenCalledTimes(2)
    expect(deactive).toHaveBeenCalledTimes(1)
  })

  it('卸载时执行 cleanup', () => {
    const effect = vi.fn()
    const deactive = vi.fn()
    const { unmount } = render(<Tree active effect={effect} deactive={deactive} />)
    expect(effect).toHaveBeenCalledTimes(1)

    act(() => {
      unmount()
    })

    expect(deactive).toHaveBeenCalledTimes(1)
  })

  it('多次切换：激活/失活计数严格成对', () => {
    const effect = vi.fn()
    const deactive = vi.fn()
    const { rerender } = render(<Tree active effect={effect} deactive={deactive} />)

    const toggle = (active: boolean) => {
      act(() => {
        rerender(<Tree active={active} effect={effect} deactive={deactive} />)
      })
    }

    toggle(false) // 失活 1
    toggle(true) //  激活 2
    toggle(false) // 失活 2
    toggle(true) //  激活 3

    expect(effect).toHaveBeenCalledTimes(3)
    expect(deactive).toHaveBeenCalledTimes(2)
  })

  it('晚于 KeepAlive 初次激活挂载的后代仍收到初次激活', () => {
    const effect = vi.fn()
    const deactive = vi.fn()

    /** showProbe 控制消费 useRouteKeepAliveEffect 的后代是否挂载，模拟 SplitPane/异步态导致的晚挂载 */
    function LateTree({ active, showProbe }: { active: boolean, showProbe: boolean }) {
      return (
        <KeepAliveProvider>
          <KeepAlive uniqueKey="L" active={active}>
            {showProbe
              ? <Probe effect={effect} deactive={deactive} />
              : null}
          </KeepAlive>
        </KeepAliveProvider>
      )
    }

    /** KeepAlive 已激活，但此刻无消费者：初次 activeEffect 跑完时 Probe 尚未挂载 */
    const { rerender } = render(<LateTree active showProbe={false} />)
    expect(effect).not.toHaveBeenCalled()

    /**
     * 晚挂载 Probe：KeepAlive 初次 activeEffect 早已跑完且 deps 不变不会重跑，
     * 修复后靠 mount 时主动 activate 补上初次激活 → 1 次。
     * 旧实现「只注册不自跑」在此为 0，本断言据此区分新旧。
     */
    act(() => {
      rerender(<LateTree active showProbe />)
    })
    expect(effect).toHaveBeenCalledTimes(1)
    expect(deactive).not.toHaveBeenCalled()

    /** 后续 true → false：执行 cleanup，计数成对（幂等没把正常失活吞掉） */
    act(() => {
      rerender(<LateTree active={false} showProbe />)
    })
    expect(deactive).toHaveBeenCalledTimes(1)
    expect(effect).toHaveBeenCalledTimes(1)

    /** 再 false → true：重新执行 effect，不重复 */
    act(() => {
      rerender(<LateTree active showProbe />)
    })
    expect(effect).toHaveBeenCalledTimes(2)
    expect(deactive).toHaveBeenCalledTimes(1)
  })

  it('最新闭包：再激活执行的是当前最新 effect，cleanup 反映其对应激活时的值', () => {
    /** 每次激活记录 effect 读到的 value，每次失活记录 cleanup 读到的 value */
    const activeSeen: number[] = []
    const cleanupSeen: number[] = []

    function ValueProbe({ value }: { value: number }) {
      useRouteKeepAliveEffect(() => {
        activeSeen.push(value)
        return () => cleanupSeen.push(value)
      })
      return null
    }

    function ValueTree({ active, value }: { active: boolean, value: number }) {
      return (
        <KeepAliveProvider>
          <KeepAlive uniqueKey="V" active={active}>
            <ValueProbe value={value} />
          </KeepAlive>
        </KeepAliveProvider>
      )
    }

    const { rerender } = render(<ValueTree active value={0} />)
    expect(activeSeen).toEqual([0]) // 首次激活读到 0

    /** 仍激活，仅更新 value：effect 不重跑（无再激活），但最新闭包已就位 */
    act(() => {
      rerender(<ValueTree active value={1} />)
    })
    expect(activeSeen).toEqual([0])

    /** 失活：cleanup 读到对应「上一次激活」捕获的 0 */
    act(() => {
      rerender(<ValueTree active={false} value={1} />)
    })
    expect(cleanupSeen).toEqual([0])

    /** 改值后再激活：effect 重跑，读到的是最新 value=2，而非陈旧的 0 */
    act(() => {
      rerender(<ValueTree active value={2} />)
    })
    expect(activeSeen).toEqual([0, 2])

    /** 再失活：cleanup 读到本次激活捕获的 2（未被钉死在首渲染的 0） */
    act(() => {
      rerender(<ValueTree active={false} value={2} />)
    })
    expect(cleanupSeen).toEqual([0, 2])
  })

  it('未被 KeepAlive 包裹（key 为 undefined）时退化为普通 effect', () => {
    const effect = vi.fn()
    const deactive = vi.fn()

    /** 既无 KeepAliveProvider 也无 KeepAlive：KeepAliveKeyContext 取默认 undefined */
    const { unmount } = render(<Probe effect={effect} deactive={deactive} />)
    expect(effect).toHaveBeenCalledTimes(1)
    expect(deactive).not.toHaveBeenCalled()

    act(() => {
      unmount()
    })

    expect(deactive).toHaveBeenCalledTimes(1)
  })

  it('退化模式下：仅 KeepAliveProvider 但无 KeepAlive，仍是普通 effect', () => {
    const effect = vi.fn()
    const deactive = vi.fn()

    const { unmount } = render(
      <KeepAliveProvider>
        <Probe effect={effect} deactive={deactive} />
      </KeepAliveProvider>,
    )
    expect(effect).toHaveBeenCalledTimes(1)
    expect(deactive).not.toHaveBeenCalled()

    act(() => {
      unmount()
    })
    expect(deactive).toHaveBeenCalledTimes(1)
  })
})
