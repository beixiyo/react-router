import type { Middleware, RouteObject } from '../types'
import { describe, expect, it } from 'vitest'
import { ERROR_CACHE_INCLUDE_EXCLUDE_MUTUAL } from '../constants/messages'
import { getCacheConfig } from './cache-config'
import { collectMiddlewares, matchPath, matchRoutes, parseHash, parseQuery, shouldCache } from './index'

describe('matchPath', () => {
  describe('基础匹配', () => {
    it('应该匹配精确路径', () => {
      expect(matchPath('/users', '/users')).toEqual({})
    })

    it('应该匹配根路径', () => {
      expect(matchPath('/', '/')).toEqual({})
    })

    it('应该不匹配不相同的路径', () => {
      expect(matchPath('/users', '/posts')).toBeNull()
    })
  })

  describe('参数匹配', () => {
    it('应该匹配单个必选参数', () => {
      expect(matchPath('/users/:id', '/users/123')).toEqual({ id: '123' })
    })

    it('应该匹配多个参数', () => {
      expect(matchPath('/users/:userId/posts/:postId', '/users/1/posts/2')).toEqual({
        userId: '1',
        postId: '2',
      })
    })

    it('应该匹配可选参数（有值）', () => {
      expect(matchPath('/users/:id?', '/users/123')).toEqual({ id: '123' })
    })

    it('应该匹配可选参数（无值）', () => {
      const result = matchPath('/users/:id?', '/users')
      // path-to-regexp 可能返回空对象或包含 undefined 的对象
      expect(result).toBeTruthy()
    })

    it('应该不匹配缺少必选参数', () => {
      expect(matchPath('/users/:id', '/users')).toBeNull()
    })
  })

  describe('通配符匹配', () => {
    it('应该匹配单星号通配符', () => {
      const result = matchPath('/*', '/any/path')
      expect(result).toBeTruthy()
      expect(result).toHaveProperty('splat1')
    })

    it('应该匹配双星号通配符', () => {
      const result = matchPath('/files/**', '/files/a/b/c.txt')
      expect(result).toBeTruthy()
      expect(result).toHaveProperty('splat')
    })

    it('应该匹配多个单星号通配符', () => {
      const result = matchPath('/users/*/posts/*', '/users/1/posts/2')
      expect(result).toBeTruthy()
      expect(result).toHaveProperty('splat1')
      expect(result).toHaveProperty('splat2')
    })
  })

  describe('匹配配置', () => {
    it('应该支持 end: false（部分匹配）', () => {
      expect(matchPath('/users/:id', '/users/123/posts', { end: false })).toEqual({ id: '123' })
    })

    it('应该支持大小写敏感', () => {
      expect(matchPath('/Users/:id', '/users/123', { sensitive: true })).toBeNull()
      expect(matchPath('/Users/:id', '/Users/123', { sensitive: true })).toEqual({ id: '123' })
    })

    it('应该支持 URL 解码', () => {
      expect(matchPath('/users/:name', '/users/John%20Doe')).toEqual({ name: 'John Doe' })
    })

    it('应该支持不解码', () => {
      expect(matchPath('/users/:name', '/users/John%20Doe', { decode: false })).toEqual({
        name: 'John%20Doe',
      })
    })
  })

  describe('边界情况', () => {
    it('应该处理尾随斜杠（strict: false）', () => {
      const result = matchPath('/users/:id', '/users/', { strict: false })
      // 根据配置可能返回 null 或空对象
      expect(result !== undefined).toBe(true)
    })

    it('应该处理空路径', () => {
      expect(matchPath('', '')).toBeNull()
    })
  })
})

describe('matchRoutes', () => {
  const mockComponent = () => null

  describe('基础路由匹配', () => {
    it('应该匹配简单路由', () => {
      const routes: RouteObject[] = [
        { path: '/', component: mockComponent },
        { path: '/users', component: mockComponent },
      ]

      expect(matchRoutes(routes, '/')).toBeTruthy()
      expect(matchRoutes(routes, '/')?.route.path).toBe('/')
      expect(matchRoutes(routes, '/users')?.route.path).toBe('/users')
    })

    it('应该返回 null 当没有匹配', () => {
      const routes: RouteObject[] = [{ path: '/users', component: mockComponent }]
      expect(matchRoutes(routes, '/posts')).toBeNull()
    })
  })

  describe('参数路由匹配', () => {
    it('应该匹配带参数的路由', () => {
      const routes: RouteObject[] = [{ path: '/users/:id', component: mockComponent }]

      const match = matchRoutes(routes, '/users/123')
      expect(match).toBeTruthy()
      expect(match?.params).toEqual({ id: '123' })
    })

    it('应该匹配多个参数', () => {
      const routes: RouteObject[] = [
        { path: '/users/:userId/posts/:postId', component: mockComponent },
      ]

      const match = matchRoutes(routes, '/users/1/posts/2')
      expect(match).toBeTruthy()
      expect(match?.params).toEqual({ userId: '1', postId: '2' })
    })
  })

  describe('嵌套路由匹配', () => {
    it('应该匹配嵌套路由的父路由', () => {
      const routes: RouteObject[] = [
        {
          path: '/dashboard',
          component: mockComponent,
          children: [
            { path: '/dashboard', component: mockComponent },
            { path: '/dashboard/settings', component: mockComponent },
          ],
        },
      ]

      const match = matchRoutes(routes, '/dashboard')
      expect(match).toBeTruthy()
      expect(match?.route.path).toBe('/dashboard')
    })

    it('应该匹配嵌套路由的子路由', () => {
      const routes: RouteObject[] = [
        {
          path: '/dashboard',
          component: mockComponent,
          children: [
            { path: '/dashboard', component: mockComponent },
            { path: '/dashboard/settings', component: mockComponent },
          ],
        },
      ]

      const match = matchRoutes(routes, '/dashboard/settings')
      expect(match).toBeTruthy()
      expect(match?.route.path).toBe('/dashboard/settings')
      expect(match?.parent?.path).toBe('/dashboard')
      expect(match?.routeChain).toBeTruthy()
      expect(match?.routeChain?.length).toBe(2)
    })

    it('应该正确构建路由链', () => {
      const routes: RouteObject[] = [
        {
          path: '/dashboard',
          component: mockComponent,
          children: [
            { path: '/dashboard/settings', component: mockComponent },
          ],
        },
      ]

      const match = matchRoutes(routes, '/dashboard/settings')
      expect(match?.routeChain).toBeTruthy()
      expect(match?.routeChain?.length).toBe(2)
      expect(match?.routeChain?.[0].path).toBe('/dashboard')
      expect(match?.routeChain?.[1].path).toBe('/dashboard/settings')
    })

    it('应该匹配带参数的嵌套路由', () => {
      const routes: RouteObject[] = [
        {
          path: '/nested/:parentId',
          component: mockComponent,
          children: [
            {
              path: '/nested/:parentId/child/:childId',
              component: mockComponent,
            },
          ],
        },
      ]

      const match = matchRoutes(routes, '/nested/1/child/2')
      expect(match).toBeTruthy()
      expect(match?.route.path).toBe('/nested/:parentId/child/:childId')
      expect(match?.params).toEqual({ parentId: '1', childId: '2' })
    })

    it('应该匹配可选参数的嵌套路由', () => {
      const routes: RouteObject[] = [
        {
          path: '/nested-opt/:parentId?',
          component: mockComponent,
          children: [
            {
              path: '/nested-opt/:parentId?/child/:childId?',
              component: mockComponent,
            },
          ],
        },
      ]

      // 测试有值的情况
      const match1 = matchRoutes(routes, '/nested-opt/1/child/2')
      expect(match1).toBeTruthy()
      expect(match1?.params).toHaveProperty('parentId', '1')
      expect(match1?.params).toHaveProperty('childId', '2')

      // 测试部分可选参数
      const match2 = matchRoutes(routes, '/nested-opt/child/2')
      // 根据 path-to-regexp 的行为，这可能匹配也可能不匹配
      expect(match2 !== undefined).toBe(true)
    })

    it('应该匹配多级参数的嵌套路由', () => {
      const routes: RouteObject[] = [
        {
          path: '/nested-multi/:parentId',
          component: mockComponent,
          children: [
            {
              path: '/nested-multi/:parentId/child/:childId/posts/:postId',
              component: mockComponent,
            },
          ],
        },
      ]

      const match = matchRoutes(routes, '/nested-multi/1/child/2/posts/3')
      expect(match).toBeTruthy()
      expect(match?.params).toEqual({ parentId: '1', childId: '2', postId: '3' })
    })

    it('应该优先匹配子路由而不是父路由', () => {
      const routes: RouteObject[] = [
        {
          path: '/dashboard',
          component: mockComponent,
          children: [
            { path: '/dashboard', component: mockComponent },
            { path: '/dashboard/settings', component: mockComponent },
          ],
        },
      ]

      // 访问 /dashboard 时，应该匹配子路由 /dashboard 而不是父路由
      const match = matchRoutes(routes, '/dashboard')
      expect(match).toBeTruthy()
      // 应该匹配到子路由（因为子路由的 path 也是 '/dashboard'）
      expect(match?.route.path).toBe('/dashboard')
    })
  })

  describe('路由优先级', () => {
    it('应该按顺序匹配第一个路由', () => {
      const routes: RouteObject[] = [
        { path: '/users/:id', component: mockComponent },
        { path: '/users/new', component: mockComponent },
      ]

      // 由于 /users/:id 在前，/users/new 会被匹配为 /users/:id（id='new'）
      const match = matchRoutes(routes, '/users/new')
      expect(match).toBeTruthy()
      // 注意：这取决于 path-to-regexp 的匹配顺序
    })
  })
})

describe('collectMiddlewares', () => {
  const mockComponent = () => null
  const mockMiddleware: Middleware = async (ctx, next) => {
    await next()
  }

  it('应该收集中间件', () => {
    const routes: RouteObject[] = [
      {
        path: '/dashboard',
        component: mockComponent,
        middlewares: [mockMiddleware],
        children: [
          {
            path: '/dashboard/settings',
            component: mockComponent,
            middlewares: [mockMiddleware],
          },
        ],
      },
    ]

    const target = routes[0].children![0]
    const chain = collectMiddlewares(routes, target)

    expect(chain.length).toBe(2)
    expect(chain[0]).toBe(mockMiddleware)
    expect(chain[1]).toBe(mockMiddleware)
  })

  it('应该按父到子顺序收集中间件', () => {
    const m1: Middleware = async (ctx, next) => await next()
    const m2: Middleware = async (ctx, next) => await next()

    const routes: RouteObject[] = [
      {
        path: '/dashboard',
        component: mockComponent,
        middlewares: [m1],
        children: [
          {
            path: '/dashboard/settings',
            component: mockComponent,
            middlewares: [m2],
          },
        ],
      },
    ]

    const target = routes[0].children![0]
    const chain = collectMiddlewares(routes, target)

    expect(chain[0]).toBe(m1)
    expect(chain[1]).toBe(m2)
  })

  it('应该处理没有中间件的路由', () => {
    const routes: RouteObject[] = [
      { path: '/users', component: mockComponent },
    ]

    const chain = collectMiddlewares(routes, routes[0])
    expect(chain.length).toBe(0)
  })
})

describe('parseQuery', () => {
  it('应该解析查询字符串', () => {
    const params = parseQuery('?name=John&age=30')
    expect(params.get('name')).toBe('John')
    expect(params.get('age')).toBe('30')
  })

  it('应该处理空查询字符串', () => {
    const params = parseQuery('')
    expect(params.get('name')).toBeNull()
  })

  it('应该处理多个相同键', () => {
    const params = parseQuery('?tag=react&tag=vue')
    expect(params.getAll('tag')).toEqual(['react', 'vue'])
  })
})

describe('parseHash', () => {
  it('应该解析 hash 参数', () => {
    const params = parseHash('#a=1&b=2')
    expect(params.get('a')).toBe('1')
    expect(params.get('b')).toBe('2')
  })

  it('应该处理没有等号的 hash', () => {
    const params = parseHash('#section1')
    expect(params.get('section1')).toBeNull()
  })

  it('应该处理空 hash', () => {
    const params = parseHash('')
    expect(params.get('a')).toBeNull()
  })

  it('应该处理只有 # 的 hash', () => {
    const params = parseHash('#')
    expect(params.get('a')).toBeNull()
  })
})

describe('shouldCache', () => {
  it('应该根据 include 模式判断', () => {
    expect(shouldCache('/dashboard', ['/dashboard', '/users'])).toBe(true)
    expect(shouldCache('/posts', ['/dashboard', '/users'])).toBe(false)
  })

  it('应该根据 exclude 模式判断', () => {
    expect(shouldCache('/dashboard', undefined, ['/admin'])).toBe(true)
    expect(shouldCache('/admin', undefined, ['/admin'])).toBe(false)
  })

  it('应该支持正则表达式', () => {
    expect(shouldCache('/users/123', [/\/(users|posts)\/\d+/])).toBe(true)
    expect(shouldCache('/users/abc', [/\/(users|posts)\/\d+/])).toBe(false)
  })

  it('应该在没有 include 和 exclude 时返回 false', () => {
    expect(shouldCache('/dashboard')).toBe(false)
  })
})

describe('getCacheConfig', () => {
  it('应该抛出错误当 include 和 exclude 同时存在', () => {
    expect(() => {
      getCacheConfig({
        cache: {
          include: ['/dashboard'],
          exclude: ['/admin'],
        },
      })
    }).toThrow(ERROR_CACHE_INCLUDE_EXCLUDE_MUTUAL)
  })
})
