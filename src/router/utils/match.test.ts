import { describe, expect, it } from 'vitest'
import { matchLayout, matchPattern } from './match'

describe('matchPattern', () => {
  it('应该匹配字符串模式', () => {
    expect(matchPattern('/users', '/users')).toBe(true)
    expect(matchPattern('/users', '/posts')).toBe(false)
  })

  it('应该匹配正则表达式模式', () => {
    expect(matchPattern('/users/123', /\/users\/\d+/)).toBe(true)
    expect(matchPattern('/users/abc', /\/users\/\d+/)).toBe(false)
  })

  it('应该处理空字符串', () => {
    expect(matchPattern('', '')).toBe(true)
    expect(matchPattern('', '/users')).toBe(false)
  })

  it('应该处理复杂正则表达式', () => {
    expect(matchPattern('/users/123/posts/456', /\/users\/\d+\/posts\/\d+/)).toBe(true)
    expect(matchPattern('/users/123/posts', /\/users\/\d+\/posts\/\d+/)).toBe(false)
  })
})

describe('matchLayout', () => {
  it('应该在 exclude 命中时返回 false', () => {
    const layout = { component: () => null, exclude: ['/admin'], include: ['/dashboard'] }
    expect(matchLayout('/admin', layout)).toBe(false)
    expect(matchLayout('/admin/users', layout)).toBe(false)
    expect(matchLayout('/dashboard', layout)).toBe(true)
  })

  it('应该在 include 为空时匹配全部（除 exclude 外）', () => {
    const layout = { component: () => null, exclude: ['/admin'] }
    expect(matchLayout('/dashboard', layout)).toBe(true)
    expect(matchLayout('/users', layout)).toBe(true)
    expect(matchLayout('/admin', layout)).toBe(false)
  })

  it('应该在 include 非空时需命中 include', () => {
    const layout = { component: () => null, include: ['/dashboard', '/users'] }
    expect(matchLayout('/dashboard', layout)).toBe(true)
    expect(matchLayout('/users', layout)).toBe(true)
    expect(matchLayout('/posts', layout)).toBe(false)
  })

  it('应该在 include 与 exclude 共存时 exclude 优先', () => {
    const layout = { component: () => null, include: ['/dashboard', '/admin'], exclude: ['/admin'] }
    expect(matchLayout('/dashboard', layout)).toBe(true)
    expect(matchLayout('/admin', layout)).toBe(false)
  })

  it('应该支持正则表达式', () => {
    const layout = { component: () => null, include: [/^\/users\/\d+$/], exclude: [/\/admin/] }
    expect(matchLayout('/users/123', layout)).toBe(true)
    expect(matchLayout('/users/abc', layout)).toBe(false)
    expect(matchLayout('/users/123/admin', layout)).toBe(false)
  })

  it('应该在无 include/exclude 时匹配全部', () => {
    const layout = { component: () => null }
    expect(matchLayout('/any', layout)).toBe(true)
  })
})
