import type { Router } from '../types'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { back, getGlobalRouter, navigate, performNavigate, replace, setGlobalRouter } from './navigate'

describe('performNavigate', () => {
  let mockRouter: Router

  beforeEach(() => {
    mockRouter = {
      navigate: vi.fn(),
      replace: vi.fn(),
      back: vi.fn(),
      location: { pathname: '/', search: '', hash: '' },
      beforeEach: vi.fn(),
      beforeResolve: vi.fn(),
      afterEach: vi.fn(),
    }
    vi.clearAllMocks()
  })

  it('应该调用 router.navigate 进行普通导航', () => {
    performNavigate(mockRouter, '/dashboard')

    expect(mockRouter.navigate).toHaveBeenCalledWith('/dashboard')
    expect(mockRouter.replace).not.toHaveBeenCalled()
  })

  it('应该调用 router.replace 当 replace 选项为 true', () => {
    performNavigate(mockRouter, '/dashboard', { replace: true })

    expect(mockRouter.replace).toHaveBeenCalledWith('/dashboard')
    expect(mockRouter.navigate).not.toHaveBeenCalled()
  })

  it('应该处理路径参数', () => {
    performNavigate(mockRouter, '/users/:id', { params: { id: '123' } })

    expect(mockRouter.navigate).toHaveBeenCalledWith('/users/123')
  })

  it('应该处理查询参数', () => {
    performNavigate(mockRouter, '/dashboard', { query: { page: '1', sort: 'name' } })

    expect(mockRouter.navigate).toHaveBeenCalledWith('/dashboard?page=1&sort=name')
  })

  it('应该处理 hash 参数', () => {
    performNavigate(mockRouter, '/dashboard', { hash: { section: 'intro' } })

    expect(mockRouter.navigate).toHaveBeenCalledWith('/dashboard#section=intro')
  })

  it('应该处理相对导航 -1（后退）', () => {
    performNavigate(mockRouter, -1)

    expect(mockRouter.back).toHaveBeenCalled()
    expect(mockRouter.navigate).not.toHaveBeenCalled()
  })

  it('应该处理相对导航 1（前进）', () => {
    const historyGoSpy = vi.spyOn(window.history, 'go').mockImplementation(() => {})
    performNavigate(mockRouter, 1)

    expect(historyGoSpy).toHaveBeenCalledWith(1)
    expect(mockRouter.navigate).not.toHaveBeenCalled()

    historyGoSpy.mockRestore()
  })

  it('应该在 router 为 null 时警告', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    performNavigate(null, '/dashboard', undefined, 'Test warning')

    expect(consoleWarnSpy).toHaveBeenCalledWith('Test warning')
    expect(mockRouter.navigate).not.toHaveBeenCalled()

    consoleWarnSpy.mockRestore()
  })

  it('应该在 router 为 null 且没有警告消息时不警告', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    performNavigate(null, '/dashboard')

    expect(consoleWarnSpy).not.toHaveBeenCalled()

    consoleWarnSpy.mockRestore()
  })
})

describe('navigate', () => {
  let mockRouter: Router

  beforeEach(() => {
    mockRouter = {
      navigate: vi.fn(),
      replace: vi.fn(),
      back: vi.fn(),
      location: { pathname: '/', search: '', hash: '' },
      beforeEach: vi.fn(),
      beforeResolve: vi.fn(),
      afterEach: vi.fn(),
    }
    setGlobalRouter(mockRouter)
    vi.clearAllMocks()
  })

  afterEach(() => {
    setGlobalRouter(null)
  })

  it('应该使用全局 router 进行导航', () => {
    navigate('/dashboard')

    expect(mockRouter.navigate).toHaveBeenCalledWith('/dashboard')
  })

  it('应该在全局 router 为 null 时警告', () => {
    setGlobalRouter(null)
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    navigate('/dashboard')

    expect(consoleWarnSpy).toHaveBeenCalled()

    consoleWarnSpy.mockRestore()
  })
})

describe('replace', () => {
  let mockRouter: Router

  beforeEach(() => {
    mockRouter = {
      navigate: vi.fn(),
      replace: vi.fn(),
      back: vi.fn(),
      location: { pathname: '/', search: '', hash: '' },
      beforeEach: vi.fn(),
      beforeResolve: vi.fn(),
      afterEach: vi.fn(),
    }
    setGlobalRouter(mockRouter)
    vi.clearAllMocks()
  })

  afterEach(() => {
    setGlobalRouter(null)
  })

  it('应该调用 router.replace', () => {
    replace('/dashboard')

    expect(mockRouter.replace).toHaveBeenCalledWith('/dashboard')
    expect(mockRouter.navigate).not.toHaveBeenCalled()
  })

  it('应该处理路径参数', () => {
    replace('/users/:id', { params: { id: '123' } })

    expect(mockRouter.replace).toHaveBeenCalledWith('/users/123')
  })
})

describe('back', () => {
  let mockRouter: Router

  beforeEach(() => {
    mockRouter = {
      navigate: vi.fn(),
      replace: vi.fn(),
      back: vi.fn(),
      location: { pathname: '/', search: '', hash: '' },
      beforeEach: vi.fn(),
      beforeResolve: vi.fn(),
      afterEach: vi.fn(),
    }
    setGlobalRouter(mockRouter)
    vi.clearAllMocks()
  })

  afterEach(() => {
    setGlobalRouter(null)
  })

  it('应该调用 router.back', () => {
    back()

    expect(mockRouter.back).toHaveBeenCalled()
  })
})

describe('setGlobalRouter 和 getGlobalRouter', () => {
  beforeEach(() => {
    setGlobalRouter(null)
  })

  it('应该设置和获取全局 router', () => {
    const mockRouter: Router = {
      navigate: vi.fn(),
      replace: vi.fn(),
      back: vi.fn(),
      location: { pathname: '/', search: '', hash: '' },
      beforeEach: vi.fn(),
      beforeResolve: vi.fn(),
      afterEach: vi.fn(),
    }

    setGlobalRouter(mockRouter)
    expect(getGlobalRouter()).toBe(mockRouter)

    setGlobalRouter(null)
    expect(getGlobalRouter()).toBeNull()
  })
})
