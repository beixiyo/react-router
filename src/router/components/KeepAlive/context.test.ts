import { describe, expect, it } from 'vitest'
import { createKeepAliveRegistry } from './context'

/**
 * keep-alive 激活 / 失活回调注册表：实例隔离 + 按回调精确移除
 * 锁定「模块级全局单例导致跨实例串扰」与「del 删整桶误删同 key 其它回调」两个修复
 */
describe('createKeepAliveRegistry', () => {
  it('不同实例相互隔离：同名 key 不串扰', () => {
    const r1 = createKeepAliveRegistry()
    const r2 = createKeepAliveRegistry()
    const cb1 = () => {}
    const cb2 = () => {}

    r1.registerActiveEffect('shared', cb1)
    r2.registerActiveEffect('shared', cb2)

    expect(r1.findEffect('shared').activeEffect).toEqual([cb1])
    expect(r2.findEffect('shared').activeEffect).toEqual([cb2])
  })

  it('按回调精确移除，不误删同 key 的其它回调', () => {
    const r = createKeepAliveRegistry()
    const cb1 = () => {}
    const cb2 = () => {}

    r.registerActiveEffect('k', cb1)
    r.registerActiveEffect('k', cb2)
    r.delActiveEffect('k', cb1)

    expect(r.findEffect('k').activeEffect).toEqual([cb2])
  })

  it('不传 callback 删除整个 key；不传 key 清空全部', () => {
    const r = createKeepAliveRegistry()
    r.registerActiveEffect('k', () => {})
    r.registerActiveEffect('k2', () => {})

    r.delActiveEffect('k')
    expect(r.findEffect('k').activeEffect).toEqual([])
    expect(r.findEffect('k2').activeEffect.length).toBe(1)

    r.delActiveEffect()
    expect(r.findEffect('k2').activeEffect).toEqual([])
  })

  it('deactive 注册表同样隔离 + 精确移除', () => {
    const r1 = createKeepAliveRegistry()
    const r2 = createKeepAliveRegistry()
    const cb1 = () => {}
    const cb2 = () => {}

    r1.registerDeactiveEffect('d', cb1)
    r2.registerDeactiveEffect('d', cb2)
    expect(r1.findEffect('d').deactiveEffect).toEqual([cb1])
    expect(r2.findEffect('d').deactiveEffect).toEqual([cb2])

    r1.delDeactiveEffect('d', cb1)
    expect(r1.findEffect('d').deactiveEffect).toEqual([])
  })
})
