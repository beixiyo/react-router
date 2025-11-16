/**
 * Profile 页面
 *
 * 受保护页面，展示当前用户信息。
 */
import { randomColor } from '@/utils'
import { getUser } from '../../store/auth'

export default function Profile() {
  const user = getUser()
  const color = randomColor()

  return (
    <div className="space-y-2" style={{ backgroundColor: color }}>
      <h1>颜色改变代表重新渲染</h1>
      <h2 className="text-3xl font-semibold bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">Profile</h2>
      <div className="text-sm text-neutral-400">
        用户：
        {user
          ? `${user.name} (${user.role})`
          : '未登录'}
      </div>
    </div>
  )
}
