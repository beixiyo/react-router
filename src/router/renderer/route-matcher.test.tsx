import type { MatchResult, RouteObject } from '../types'
import { render } from '@testing-library/react'
import { useContext } from 'react'
import { describe, expect, it } from 'vitest'
import { ParamsContext } from '../context'
import { createRouteElement, emptyElement, renderRouteChain } from './route-matcher'

describe('emptyElement', () => {
  it('应该创建空元素', () => {
    const { container } = render(emptyElement('Not Found'))
    expect(container.textContent).toBe('Not Found')
  })
})

describe('createRouteElement', () => {
  const MockComponent = () => <div>Mock Component</div>

  it('应该渲染单个路由组件', () => {
    const route: RouteObject = {
      path: '/users',
      component: MockComponent,
    }

    const element = createRouteElement(route)
    const { container } = render(element)

    expect(container.textContent).toBe('Mock Component')
  })

  it('应该传递路由参数', () => {
    // 组件需要通过 ParamsContext 获取参数
    const ComponentWithParams = () => {
      const params = useContext(ParamsContext)
      return (
        <div>
          User{params.id}
        </div>
      )
    }
    const route: RouteObject = {
      path: '/users/:id',
      component: ComponentWithParams,
    }
    const match: MatchResult = {
      route,
      params: { id: '123' },
      routeChain: [route],
    }

    const element = createRouteElement(route, match)
    const { container } = render(element)

    expect(container.textContent).toBe('User123')
  })

  it('应该处理有 children 的路由', () => {
    const ParentComponent = ({ children }: { children?: React.ReactNode }) => (
      <div>
        <div>Parent</div>
        {children}
      </div>
    )
    const route: RouteObject = {
      path: '/dashboard',
      component: ParentComponent,
      children: [
        { path: '/dashboard', component: MockComponent },
      ],
    }

    const element = createRouteElement(route)
    const { container } = render(element)

    expect(container.textContent).toContain('Parent')
  })

  it('应该处理路由链', () => {
    // 注意：路由链的渲染需要 Outlet 组件来渲染子路由
    // 这里只测试路由链的创建，不测试完整的嵌套渲染
    const ParentComponent = ({ children }: { children?: React.ReactNode }) => (
      <div>
        <div>Parent</div>
        {children}
      </div>
    )
    const ChildComponent = () => <div>Child</div>

    const parentRoute: RouteObject = {
      path: '/dashboard',
      component: ParentComponent,
    }
    const childRoute: RouteObject = {
      path: '/dashboard/settings',
      component: ChildComponent,
    }

    const match: MatchResult = {
      route: childRoute,
      params: {},
      routeChain: [parentRoute, childRoute],
    }

    const element = createRouteElement(childRoute, match)
    const { container } = render(element)

    // 路由链会渲染父路由，但子路由需要通过 Outlet 渲染
    // 这里只验证父路由被渲染
    expect(container.textContent).toContain('Parent')
    // 注意：子路由不会在这里渲染，因为它需要通过 Outlet 组件
    // 完整的嵌套渲染测试应该在集成测试中进行
  })
})

describe('renderRouteChain', () => {
  const MockComponent = () => <div>Mock</div>

  it('应该渲染单层路由链', () => {
    const route: RouteObject = {
      path: '/users',
      component: MockComponent,
    }
    const match: MatchResult = {
      route,
      params: {},
      routeChain: [route],
    }

    const element = renderRouteChain([route], 0, match)
    const { container } = render(element)

    expect(container.textContent).toBe('Mock')
  })

  it('应该处理空路由链', () => {
    const element = renderRouteChain([], 0)
    const { container } = render(element)

    expect(container.textContent).toBe('')
  })

  it('应该处理超出索引的情况', () => {
    const route: RouteObject = {
      path: '/users',
      component: MockComponent,
    }

    const element = renderRouteChain([route], 10)
    const { container } = render(element)

    expect(container.textContent).toBe('')
  })
})
