import type { RouteObject } from './types'
import { describe, expect, it } from 'vitest'
import { matchRoutes } from './utils'

// 模拟组件
const mockComponent = () => null

describe('路由集成测试', () => {
  describe('嵌套路由完整流程测试', () => {
    it('应该正确匹配 Dashboard 嵌套路由', () => {
      const routes: RouteObject[] = [
        {
          path: '/dashboard',
          component: mockComponent,
          children: [
            { path: '/dashboard', component: mockComponent },
            { path: '/dashboard/settings', component: mockComponent },
            { path: '/dashboard/profile', component: mockComponent },
          ],
        },
      ]

      // 测试访问父路由
      const match1 = matchRoutes(routes, '/dashboard')
      expect(match1).toBeTruthy()
      expect(match1?.route.path).toBe('/dashboard')

      // 测试访问子路由
      const match2 = matchRoutes(routes, '/dashboard/settings')
      expect(match2).toBeTruthy()
      expect(match2?.route.path).toBe('/dashboard/settings')
      expect(match2?.parent?.path).toBe('/dashboard')
      expect(match2?.routeChain?.length).toBe(2)

      // 测试访问另一个子路由
      const match3 = matchRoutes(routes, '/dashboard/profile')
      expect(match3).toBeTruthy()
      expect(match3?.route.path).toBe('/dashboard/profile')
    })

    it('应该正确匹配带参数的嵌套路由', () => {
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
      expect(match?.routeChain?.length).toBe(2)
      expect(match?.routeChain?.[0].path).toBe('/nested/:parentId')
      expect(match?.routeChain?.[1].path).toBe('/nested/:parentId/child/:childId')
    })

    it('应该正确匹配多级参数的嵌套路由', () => {
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

    it('应该正确匹配可选参数的嵌套路由', () => {
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

      // 测试所有参数都有值
      const match1 = matchRoutes(routes, '/nested-opt/1/child/2')
      expect(match1).toBeTruthy()
      if (match1) {
        expect(match1.params).toHaveProperty('parentId', '1')
        expect(match1.params).toHaveProperty('childId', '2')
      }
    })

    it('应该正确处理三层嵌套路由', () => {
      const routes: RouteObject[] = [
        {
          path: '/admin',
          component: mockComponent,
          children: [
            {
              path: '/admin/users',
              component: mockComponent,
              children: [
                { path: '/admin/users/list', component: mockComponent },
                { path: '/admin/users/:id', component: mockComponent },
              ],
            },
          ],
        },
      ]

      // 测试三层嵌套
      const match1 = matchRoutes(routes, '/admin/users/list')
      expect(match1).toBeTruthy()
      expect(match1?.routeChain?.length).toBe(3)
      expect(match1?.routeChain?.[0].path).toBe('/admin')
      expect(match1?.routeChain?.[1].path).toBe('/admin/users')
      expect(match1?.routeChain?.[2].path).toBe('/admin/users/list')

      // 测试带参数的三层嵌套
      const match2 = matchRoutes(routes, '/admin/users/123')
      expect(match2).toBeTruthy()
      expect(match2?.params).toEqual({ id: '123' })
      expect(match2?.routeChain?.length).toBe(3)
    })
  })

  describe('嵌套路由边界情况', () => {
    it('应该处理父路由没有子路由匹配的情况', () => {
      const routes: RouteObject[] = [
        {
          path: '/dashboard',
          component: mockComponent,
          children: [
            { path: '/dashboard/settings', component: mockComponent },
          ],
        },
      ]

      // 访问 /dashboard 时，应该匹配父路由本身
      const match = matchRoutes(routes, '/dashboard')
      expect(match).toBeTruthy()
      expect(match?.route.path).toBe('/dashboard')
    })

    it('应该处理不存在的嵌套路由', () => {
      const routes: RouteObject[] = [
        {
          path: '/dashboard',
          component: mockComponent,
          children: [
            { path: '/dashboard/settings', component: mockComponent },
          ],
        },
      ]

      // 访问不存在的子路由
      const match = matchRoutes(routes, '/dashboard/nonexistent')
      expect(match).toBeNull()
    })

    it('应该处理嵌套路由中的参数冲突', () => {
      const routes: RouteObject[] = [
        {
          path: '/users/:id',
          component: mockComponent,
          children: [
            {
              path: '/users/:id/posts/:id', // 注意：这里 id 参数名重复
              component: mockComponent,
            },
          ],
        },
      ]

      // path-to-regexp 会处理参数合并，后面的会覆盖前面的
      const match = matchRoutes(routes, '/users/1/posts/2')
      expect(match).toBeTruthy()
      // 注意：实际行为取决于 path-to-regexp 的实现
    })
  })

  describe('嵌套路由规则验证', () => {
    it('验证子路由必须使用完整路径', () => {
      // 这是配置规则，不是运行时测试
      // 正确的配置应该是：
      const correctRoutes: RouteObject[] = [
        {
          path: '/dashboard',
          component: mockComponent,
          children: [
            { path: '/dashboard', component: mockComponent }, // ✅ 完整路径
            { path: '/dashboard/settings', component: mockComponent }, // ✅ 完整路径
          ],
        },
      ]

      // 错误的配置示例（不应该使用相对路径）：
      // {
      //   path: '/dashboard',
      //   children: [
      //     { path: 'settings', component: ... } // ❌ 相对路径，不支持
      //   ]
      // }

      expect(correctRoutes[0].children?.[0].path).toMatch(/^\/dashboard/)
      expect(correctRoutes[0].children?.[1].path).toMatch(/^\/dashboard/)
    })

    it('验证嵌套路由参数合并规则', () => {
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
      // 验证参数合并：父路由和子路由的参数都在 params 中
      expect(match?.params).toHaveProperty('parentId')
      expect(match?.params).toHaveProperty('childId')
      expect(match?.params.parentId).toBe('1')
      expect(match?.params.childId).toBe('2')
    })
  })
})
