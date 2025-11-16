/**
 * 全局路由守卫管理器
 *
 * 提供类似 vue-router 的全局守卫功能：
 * - beforeEach: 全局前置守卫
 * - beforeResolve: 全局解析守卫
 * - afterEach: 全局后置守卫
 */
import type {
  AfterEachGuard,
  GuardNext,
  NavigationGuard,
  NavigationGuardContext,
  RemoveGuard,
} from '../types'

/**
 * 守卫执行结果
 */
export interface GuardExecutionResult {
  /** 是否继续导航 */
  shouldContinue: boolean
  /** 重定向路径（如果有） */
  redirectPath?: string
}

/**
 * 守卫管理器类
 */
export class GuardManager {
  private beforeEachGuards: NavigationGuard[] = []
  private beforeResolveGuards: NavigationGuard[] = []
  private afterEachGuards: AfterEachGuard[] = []

  /**
   * 注册全局前置守卫
   * @returns 移除守卫的函数
   */
  beforeEach(guard: NavigationGuard): RemoveGuard {
    this.beforeEachGuards.push(guard)
    return () => {
      const index = this.beforeEachGuards.indexOf(guard)
      if (index > -1) {
        this.beforeEachGuards.splice(index, 1)
      }
    }
  }

  /**
   * 注册全局解析守卫
   * @returns 移除守卫的函数
   */
  beforeResolve(guard: NavigationGuard): RemoveGuard {
    this.beforeResolveGuards.push(guard)
    return () => {
      const index = this.beforeResolveGuards.indexOf(guard)
      if (index > -1) {
        this.beforeResolveGuards.splice(index, 1)
      }
    }
  }

  /**
   * 注册全局后置守卫
   * @returns 移除守卫的函数
   */
  afterEach(guard: AfterEachGuard): RemoveGuard {
    this.afterEachGuards.push(guard)
    return () => {
      const index = this.afterEachGuards.indexOf(guard)
      if (index > -1) {
        this.afterEachGuards.splice(index, 1)
      }
    }
  }

  /**
   * 执行前置守卫链
   * @returns 守卫执行结果
   */
  async runBeforeEach(
    to: NavigationGuardContext,
    from: NavigationGuardContext,
  ): Promise<GuardExecutionResult> {
    return this.runGuards(this.beforeEachGuards, to, from)
  }

  /**
   * 执行解析守卫链
   */
  async runBeforeResolve(
    to: NavigationGuardContext,
    from: NavigationGuardContext,
  ): Promise<GuardExecutionResult> {
    return this.runGuards(this.beforeResolveGuards, to, from)
  }

  /**
   * 执行后置守卫链（支持异步）
   */
  async runAfterEach(to: NavigationGuardContext, from: NavigationGuardContext): Promise<void> {
    for (let i = 0; i < this.afterEachGuards.length; i++) {
      const guard = this.afterEachGuards[i]
      try {
        const result = guard(to, from)
        // 统一使用 Promise.resolve 包装返回值
        await Promise.resolve(result)
      }
      catch (error) {
        console.error(`[Router] Error in afterEach guard at index ${i}:`, error)
      }
    }
  }

  /**
   * 执行守卫链的核心逻辑
   */
  private async runGuards(
    guards: NavigationGuard[],
    to: NavigationGuardContext,
    from: NavigationGuardContext,
  ): Promise<GuardExecutionResult> {
    if (guards.length === 0) {
      return { shouldContinue: true }
    }

    let redirectPath: string | undefined
    let cancelled = false

    // 使用 Promise 链式执行守卫
    for (let i = 0; i < guards.length; i++) {
      const guard = guards[i]

      // 如果已经取消或重定向，停止执行
      if (cancelled || redirectPath) {
        break
      }

      // 创建一个 Promise 来等待守卫调用 next
      await new Promise<void>((resolve) => {
        let nextCalled = false
        let isResolved = false

        const next: GuardNext = (path?: string | false) => {
          if (nextCalled) {
            console.warn(
              `[Router] Navigation guard next() was called multiple times in guard at index ${i}. `
              + 'Only the first call will be respected.',
            )
            return Promise.resolve()
          }
          nextCalled = true

          // 如果外层 Promise 已经 resolve，忽略后续的 next 调用
          if (isResolved) {
            return Promise.resolve()
          }

          if (path === false) {
            // 取消导航
            cancelled = true
            isResolved = true
            resolve()
            return Promise.resolve()
          }

          if (typeof path === 'string') {
            // 重定向
            redirectPath = path
            isResolved = true
            resolve()
            return Promise.resolve()
          }

          // 继续执行下一个守卫
          isResolved = true
          resolve()
          return Promise.resolve()
        }

        try {
          const result = guard(to, from, next)

          // 统一使用 Promise.resolve 包装返回值
          Promise.resolve(result)
            .then(() => {
              // Promise resolve 后检查是否调用了 next()
              // 如果还没有调用，警告并取消导航
              if (!nextCalled && !isResolved) {
                console.warn(
                  `[Router] Navigation guard at index ${i} did not call next(). `
                  + 'Navigation will be cancelled. Make sure to call next() in your guard.',
                )
                cancelled = true
                isResolved = true
                resolve()
              }
            })
            .catch((error) => {
              // 如果 Promise reject，取消导航
              // 但如果 next 已经被调用，说明导航已经继续，不应该取消
              if (!nextCalled && !isResolved) {
                console.error(`[Router] Error in navigation guard at index ${i}:`, error)
                cancelled = true
                isResolved = true
                resolve()
              }
              else {
                // 如果 next 已经被调用，只记录错误，不取消导航
                console.error(`[Router] Error in navigation guard at index ${i} after next() was called:`, error)
              }
            })
        }
        catch (error) {
          // 同步错误：取消导航
          console.error(`[Router] Error in navigation guard at index ${i}:`, error)
          if (!isResolved) {
            cancelled = true
            isResolved = true
            resolve()
          }
        }
      })
    }

    return {
      shouldContinue: !cancelled && !redirectPath,
      redirectPath,
    }
  }

  /**
   * 清空所有守卫（用于测试或重置）
   */
  clear(): void {
    this.beforeEachGuards = []
    this.beforeResolveGuards = []
    this.afterEachGuards = []
  }
}
