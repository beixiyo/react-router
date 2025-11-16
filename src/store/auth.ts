/**
 * 简易认证状态存储
 *
 * 提供当前用户与角色的内存状态，以及更新函数。
 * 使用示例：
 * setUser({ name: 'alice', role: 'admin' })
 */
export interface UserInfo {
  name: string
  role: 'guest' | 'user' | 'admin'
}

let currentUser: UserInfo | null = null

/**
 * 获取当前用户
 * @returns 当前用户或 null
 */
export function getUser() {
  return currentUser
}

/**
 * 设置当前用户
 * @param user 用户信息或 null（登出）
 */
export function setUser(user: UserInfo | null) {
  currentUser = user
}
