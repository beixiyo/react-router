import { act, cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { KeepAlive } from './KeepAlive'
import { useActiveEffect, useDeactiveEffect } from './hooks'
import { KeepAliveProvider } from './KeepAliveProvider'

/**
 * KeepAlive 激活 / 失活生命周期：active 触发激活，失活与卸载都触发 deactive
 * 锁定「无 cleanup 导致被淘汰的活跃页收不到 deactive」的修复
 */

function Probe({ events }: { events: string[] }) {
  useActiveEffect('K', () => events.push('active'))
  useDeactiveEffect('K', () => events.push('deactive'))
  return <div data-testid="probe">probe</div>
}

function Tree({ active, events }: { active: boolean, events: string[] }) {
  return (
    <KeepAliveProvider>
      <KeepAlive uniqueKey="K" active={active}>
        <Probe events={events} />
      </KeepAlive>
    </KeepAliveProvider>
  )
}

describe('keepAlive 激活/失活生命周期', () => {
  afterEach(() => {
    cleanup()
  })

  it('激活时触发 active；卸载时触发 deactive（修复前卸载不触发）', () => {
    const events: string[] = []
    const { unmount } = render(<Tree active events={events} />)
    expect(events).toEqual(['active'])

    act(() => {
      unmount()
    })
    expect(events).toContain('deactive')
  })

  it('active 由 true → false 时触发 deactive', () => {
    const events: string[] = []
    const { rerender } = render(<Tree active events={events} />)
    expect(events).toEqual(['active'])

    act(() => {
      rerender(<Tree active={false} events={events} />)
    })
    expect(events).toContain('deactive')
  })
})
