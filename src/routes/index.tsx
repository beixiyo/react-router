import type { GuardNext, NavigationGuardContext } from '@/router'
import { createHashRouter } from '@/router'
import { getUser } from '@/store/auth'
import { fileRoutes } from './file-routes'

export const router = createHashRouter({
  routes: fileRoutes,
  options: {
    cache: { limit: 2, include: ['/', '/profile', /^\/nest-no-param/] },
    // loadingComponent: () => <div>全局自定义 Loading</div>,

    // ========== 全局前置守卫 ==========
    beforeEach: async (to: NavigationGuardContext, from: NavigationGuardContext, next: GuardNext) => {
      console.log('🔒 [全局前置守卫]', from.to.pathname, '→', to.to.pathname)

      const user = getUser()
      const isLoginPage = to.to.pathname === '/login'
      const isGuardsExamplePage = to.to.pathname === '/guards-example'
      const isAuthPage = to.to.pathname.startsWith('/auth')

      // ========== 登录检查 ==========
      // 如果未登录且不是登录页、认证页和守卫示例页，重定向到登录页
      if (!user && !isLoginPage && !isAuthPage && !isGuardsExamplePage) {
        const requiresAuth = to.meta?.requiresAuth !== false
        if (requiresAuth) {
          console.log('  ❌ 未登录，重定向到登录页')
          alert('❌ 未登录，请先登录')
          next('/login')
          return
        }
      }

      // 如果已登录且访问登录页，重定向到首页
      if (user && isLoginPage) {
        console.log('  ✅ 已登录，重定向到首页')
        next('/')
        return
      }

      // ========== 权限检查 ==========
      // 检查管理员路由权限
      if (to.to.pathname.startsWith('/admin')) {
        console.log('🔐 [权限守卫] 检查管理员权限...')

        if (!user) {
          console.log('  ❌ 未登录，重定向到登录页')
          alert('❌ 未登录，无法访问管理员页面')
          next('/login')
          return
        }

        if (user.role !== 'admin') {
          console.log('  ❌ 权限不足，重定向到 403 页面')
          alert('❌ 权限不足，您不是管理员')
          next('/403')
          return
        }

        console.log('  ✅ 管理员权限验证通过')
      }

      console.log('  ✅ 通过全局前置守卫')
      next()
    },

    // ========== 全局解析守卫 ==========
    beforeResolve: async (to: NavigationGuardContext, _from: NavigationGuardContext, next: GuardNext) => {
      console.log('📦 [全局解析守卫] 预加载数据...')
      console.log('  路由:', to.to.pathname)

      // 模拟异步数据预加载
      try {
        // 根据路由预加载不同的数据
        if (to.to.pathname.startsWith('/dashboard')) {
          console.log('  📊 预加载仪表盘数据...')
          await new Promise(resolve => setTimeout(resolve, 100)) // 模拟 API 调用
          console.log('  ✅ 仪表盘数据加载完成')
        }
        else if (to.to.pathname.startsWith('/profile')) {
          console.log('  👤 预加载用户资料数据...')
          await new Promise(resolve => setTimeout(resolve, 100))
          console.log('  ✅ 用户资料数据加载完成')
        }
      }
      catch (error) {
        console.error('  ❌ 数据预加载失败:', error)
        // 即使预加载失败，也继续导航
      }

      next()
    },

    // ========== 全局后置守卫 ==========
    afterEach: (to: NavigationGuardContext, from: NavigationGuardContext) => {
      console.log('📊 [全局后置守卫] 页面访问追踪...')
      console.log('  访问页面:', to.to.pathname)
      console.log('  来源页面:', from.to.pathname)

      // 模拟发送分析事件
      try {
        // 这里可以调用真实的分析服务
        // await analytics.track('page_view', {
        //   path: to.to.pathname,
        //   referrer: from.to.pathname,
        //   timestamp: Date.now()
        // })
        console.log('  ✅ 分析事件已发送')
      }
      catch (error) {
        console.error('  ❌ 分析事件发送失败:', error)
      }

      // 更新页面标题
      const title = (typeof to.meta?.title === 'string'
        ? to.meta.title
        : 'React Router')
      document.title = title
      console.log('  📝 页面标题已更新:', title)
    },
  },
})
