import { describe, expect, it } from 'vitest'
import { matchPattern } from './match'

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
