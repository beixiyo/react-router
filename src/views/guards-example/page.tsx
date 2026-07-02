/**
 * 路由守卫使用示例页面
 *
 * 本文件展示了路由守卫的使用效果
 * 所有守卫逻辑都在 App.tsx 中配置
 */

import { setUser } from '../../store/auth'

/**
 * 示例组件：展示路由守卫的效果
 *
 * 守卫逻辑在 App.tsx 中配置，包括：
 * - 前置守卫：登录检查和权限检查
 * - 解析守卫：数据预加载
 * - 后置守卫：页面追踪和标题更新
 */
export default function GuardsExample() {
  return (
    <div className="p-5 font-mono">
      <h2 className="text-2xl font-bold mb-4 text-gray-100 dark:text-gray-100">路由守卫示例</h2>
      <p className="text-gray-300 dark:text-gray-400 mb-5">打开控制台查看守卫执行日志</p>

      <div className="mt-5">
        <h3 className="text-xl font-semibold mb-3 text-gray-200 dark:text-gray-200">测试操作：</h3>
        <div className="flex gap-2.5 flex-wrap">
          <button
            onClick={() => setUser({ name: 'Alice', role: 'user' })}
            className="px-4 py-2 cursor-pointer bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            登录为普通用户
          </button>
          <button
            onClick={() => setUser({ name: 'Admin', role: 'admin' })}
            className="px-4 py-2 cursor-pointer bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors dark:bg-purple-500 dark:hover:bg-purple-600"
          >
            登录为管理员
          </button>
          <button
            onClick={() => setUser(null)}
            className="px-4 py-2 cursor-pointer bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors dark:bg-red-500 dark:hover:bg-red-600"
          >
            登出
          </button>
        </div>
      </div>

      <div className="mt-5">
        <h3 className="text-xl font-semibold mb-3 text-gray-200 dark:text-gray-200">守卫说明：</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-300 dark:text-gray-400">
          <li>
            <strong className="text-gray-200 dark:text-gray-300">前置守卫 (beforeEach)</strong>
            ：检查登录状态和权限
          </li>
          <li>
            <strong className="text-gray-200 dark:text-gray-300">解析守卫 (beforeResolve)</strong>
            ：预加载路由数据
          </li>
          <li>
            <strong className="text-gray-200 dark:text-gray-300">后置守卫 (afterEach)</strong>
            ：页面追踪和标题更新
          </li>
        </ul>
      </div>

      <div className="mt-5 p-4 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800/50">
        <h4 className="text-lg font-semibold mb-2 text-blue-900 dark:text-blue-200">💡 提示：</h4>
        <p className="text-blue-800 dark:text-blue-300 mb-2">尝试以下操作来测试守卫：</p>
        <ol className="list-decimal list-inside space-y-1 text-blue-800 dark:text-blue-300">
          <li>点击"登出"按钮，然后尝试访问需要登录的页面（如 /profile）</li>
          <li>点击"登录为普通用户"，然后尝试访问 /admin 页面</li>
          <li>点击"登录为管理员"，然后访问 /admin 页面</li>
          <li>观察控制台中的守卫执行日志</li>
        </ol>
      </div>
    </div>
  )
}
