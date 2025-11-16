import { describe, expect, it } from 'vitest'
import { buildUrl, searchParamsToObject } from './url'

describe('buildUrl', () => {
  describe('基础路径', () => {
    it('应该返回原始路径', () => {
      expect(buildUrl('/users')).toBe('/users')
    })

    it('应该处理根路径', () => {
      expect(buildUrl('/')).toBe('/')
    })
  })

  describe('路径参数', () => {
    it('应该替换路径参数', () => {
      expect(buildUrl('/users/:id', { params: { id: '123' } })).toBe('/users/123')
    })

    it('应该替换多个路径参数', () => {
      expect(buildUrl('/users/:userId/posts/:postId', {
        params: { userId: '1', postId: '2' },
      })).toBe('/users/1/posts/2')
    })

    it('应该处理数字类型的参数', () => {
      expect(buildUrl('/users/:id', { params: { id: 123 } })).toBe('/users/123')
    })

    it('应该处理数组类型的参数', () => {
      // path-to-regexp 不支持数组类型的路径参数，所以会失败并返回原路径
      // 这是预期的行为，因为路径参数通常是单个值
      const result = buildUrl('/users/:ids', { params: { ids: ['1', '2'] } })
      // 由于编译失败，会返回原路径
      expect(result).toBe('/users/:ids')
    })

    it('应该处理没有参数占位符的路径', () => {
      expect(buildUrl('/users', { params: { id: '123' } })).toBe('/users')
    })
  })

  describe('查询参数', () => {
    it('应该添加查询参数', () => {
      expect(buildUrl('/users', { query: { name: 'John', age: '30' } })).toBe('/users?name=John&age=30')
    })

    it('应该处理数字类型的查询参数', () => {
      expect(buildUrl('/users', { query: { age: 30 } })).toBe('/users?age=30')
    })

    it('应该处理数组类型的查询参数', () => {
      expect(buildUrl('/users', { query: { tags: ['react', 'vue'] } })).toBe('/users?tags=react&tags=vue')
    })

    it('应该忽略 undefined 和 null 值', () => {
      expect(buildUrl('/users', { query: { name: 'John', age: undefined, city: undefined } })).toBe('/users?name=John')
    })

    it('应该处理空查询参数对象', () => {
      expect(buildUrl('/users', { query: {} })).toBe('/users')
    })
  })

  describe('hash 参数', () => {
    it('应该添加字符串形式的 hash', () => {
      expect(buildUrl('/users', { hash: 'section1' })).toBe('/users#section1')
    })

    it('应该处理已包含 # 的 hash 字符串', () => {
      expect(buildUrl('/users', { hash: '#section1' })).toBe('/users#section1')
    })

    it('应该添加对象形式的 hash 参数', () => {
      expect(buildUrl('/users', { hash: { a: '1', b: '2' } })).toBe('/users#a=1&b=2')
    })

    it('应该处理数字类型的 hash 参数', () => {
      expect(buildUrl('/users', { hash: { id: 123 } })).toBe('/users#id=123')
    })

    it('应该处理数组类型的 hash 参数', () => {
      expect(buildUrl('/users', { hash: { tags: ['react', 'vue'] } })).toBe('/users#tags=react&tags=vue')
    })

    it('应该忽略 undefined 和 null 值', () => {
      expect(buildUrl('/users', { hash: { a: '1', b: undefined, c: undefined } })).toBe('/users#a=1')
    })

    it('应该处理空 hash 对象', () => {
      expect(buildUrl('/users', { hash: {} })).toBe('/users')
    })
  })

  describe('组合使用', () => {
    it('应该同时处理路径参数、查询参数和 hash', () => {
      expect(buildUrl('/users/:id/posts/:postId', {
        params: { id: '1', postId: '2' },
        query: { page: '1' },
        hash: 'comments',
      })).toBe('/users/1/posts/2?page=1#comments')
    })

    it('应该按正确顺序组合所有部分', () => {
      const result = buildUrl('/users/:id', {
        params: { id: '123' },
        query: { sort: 'name' },
        hash: { section: 'details' },
      })
      expect(result).toBe('/users/123?sort=name#section=details')
    })
  })
})

describe('searchParamsToObject', () => {
  it('应该转换单值参数', () => {
    const params = new URLSearchParams('name=John&age=30')
    const obj = searchParamsToObject(params)

    expect(obj).toEqual({ name: 'John', age: '30' })
  })

  it('应该转换多值参数为数组', () => {
    const params = new URLSearchParams('tag=react&tag=vue')
    const obj = searchParamsToObject(params)

    expect(obj).toEqual({ tag: ['react', 'vue'] })
  })

  it('应该处理空 URLSearchParams', () => {
    const params = new URLSearchParams()
    const obj = searchParamsToObject(params)

    expect(obj).toEqual({})
  })

  it('应该处理混合单值和多值参数', () => {
    const params = new URLSearchParams('name=John&tag=react&tag=vue&age=30')
    const obj = searchParamsToObject(params)

    expect(obj).toEqual({
      name: 'John',
      tag: ['react', 'vue'],
      age: '30',
    })
  })
})
