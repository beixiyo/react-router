/**
 * 解析查询字符串
 */
export function parseQuery(search: string): URLSearchParams {
  return new URLSearchParams(search ?? '')
}

/**
 * 解析 hash 参数串（支持 #a=1&b=2 形式）
 */
export function parseHash(hash: string): URLSearchParams {
  const raw = (hash ?? '').replace(/^#/, '')
  if (!raw)
    return new URLSearchParams()
  if (raw.includes('='))
    return new URLSearchParams(raw)
  return new URLSearchParams()
}
