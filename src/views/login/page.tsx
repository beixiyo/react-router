import { useRouter } from '../../router'
/**
 * Login 页面
 *
 * 模拟登录与登出，改变内存中的用户状态。
 */
import { getUser, setUser } from '../../store/auth'

export default function Login() {
  const router = useRouter()
  const user = getUser()
  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-semibold bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">Login</h2>
      <div className="text-sm text-neutral-400">
        当前：
        {user
          ? `${user.name} (${user.role})`
          : '未登录'}
      </div>
      <div className="flex gap-3">
        <button
          className="px-3 py-2 rounded-md border border-white/10 bg-black/40 text-white hover:bg-white/5"
          onClick={() => {
            setUser({ name: 'alice', role: 'user' })
            router?.navigate('/profile')
          }}
        >
          登录为普通用户
        </button>
        <button
          className="px-3 py-2 rounded-md border border-white/10 bg-black/40 text-white hover:bg-white/5"
          onClick={() => {
            setUser({ name: 'root', role: 'admin' })
            router?.navigate('/admin')
          }}
        >
          登录为管理员
        </button>
        <button
          className="px-3 py-2 rounded-md border border-white/10 bg-black/40 text-white hover:bg-white/5"
          onClick={() => {
            setUser(null)
            router?.navigate('/')
          }}
        >
          登出
        </button>
      </div>
    </div>
  )
}
