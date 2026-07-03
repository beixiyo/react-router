import type { RouteObject, RouterOptions } from '../types'
import { describe, expect, it } from 'vitest'
import { resolveTransition, routesHaveTransition } from './transition-config'

const GLOBAL: RouterOptions = {
  transition: { enterTimeout: 300, exitTimeout: 300 },
}

function route(transition?: RouteObject['transition'], children?: RouteObject[]): RouteObject {
  return { path: '/x', component: () => null, transition, children }
}

describe('resolveTransition', () => {
  it('路由未配置：沿用全局', () => {
    expect(resolveTransition(route(), GLOBAL)).toEqual({ enterTimeout: 300, exitTimeout: 300 })
  })

  it('路由传 false：显式关闭，返回 undefined（立即切换）', () => {
    expect(resolveTransition(route(false), GLOBAL)).toBeUndefined()
  })

  it('路由传对象：与全局字段级合并，路由字段优先', () => {
    expect(resolveTransition(route({ enterTimeout: 800 }), GLOBAL)).toEqual({
      enterTimeout: 800,
      exitTimeout: 300,
    })
  })

  it('全局未配置时路由级配置单独生效', () => {
    expect(resolveTransition(route({ exitTimeout: 500 }), {})).toEqual({ exitTimeout: 500 })
    expect(resolveTransition(route(), {})).toBeUndefined()
  })
})

describe('routesHaveTransition', () => {
  it('任一路由（含嵌套子路由）配置过渡即为 true', () => {
    expect(routesHaveTransition([route(), route({ enterTimeout: 100 })])).toBe(true)
    expect(routesHaveTransition([route(undefined, [route({ exitTimeout: 100 })])])).toBe(true)
  })

  it('均未配置为 false；transition: false 是关闭而非开启，不计入', () => {
    expect(routesHaveTransition([route(), route(false)])).toBe(false)
  })
})
