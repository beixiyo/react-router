import { describe, expect, it } from 'vitest'
import { LRUCache } from './LRUCache'

describe('lRUCache 运行时缩容', () => {
  it('trim() 立即把缓存裁剪到新上限（淘汰最久未使用）', () => {
    const c = new LRUCache<string, number>(5)
    c.set('a', 1)
    c.set('b', 2)
    c.set('c', 3)
    c.set('d', 4)
    c.set('e', 5)
    expect(c.size).toBe(5)

    c.maxCacheLen = 2
    c.trim()

    expect(c.size).toBe(2)
    expect(c.has('a')).toBe(false)
    expect(c.has('d')).toBe(true)
    expect(c.has('e')).toBe(true)
  })

  it('set 用循环淘汰：缩容后一次 set 即收敛到上限', () => {
    const c = new LRUCache<string, number>(5)
    ;['a', 'b', 'c', 'd', 'e'].forEach((k, i) => c.set(k, i))

    c.maxCacheLen = 2 // 未调用 trim
    c.set('f', 99) // 修复前：单次 set 只淘汰一个 → size 仍为 5

    expect(c.size).toBe(2)
    expect(c.has('f')).toBe(true)
  })

  it('正常增长仍按 LRU 逐个淘汰最久未使用', () => {
    const c = new LRUCache<string, number>(3)
    c.set('a', 1)
    c.set('b', 2)
    c.set('c', 3)
    c.get('a') // a 变为最新
    c.set('d', 4) // 淘汰最久未使用 b

    expect(c.has('b')).toBe(false)
    expect(c.has('a')).toBe(true)
    expect(c.size).toBe(3)
  })
})
