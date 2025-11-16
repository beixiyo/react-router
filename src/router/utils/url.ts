import { compile } from 'path-to-regexp'

/**
 * 将 URLSearchParams 转换为普通对象
 */
export function searchParamsToObject(params: URLSearchParams): Record<string, string | string[]> {
  const obj: Record<string, string | string[]> = {}
  for (const [key, value] of params.entries()) {
    if (obj[key]) {
      // 如果已存在，转换为数组
      if (Array.isArray(obj[key])) {
        (obj[key] as string[]).push(value)
      }
      else {
        obj[key] = [obj[key] as string, value]
      }
    }
    else {
      obj[key] = value
    }
  }
  return obj
}

/**
 * 构建完整的 URL，包括路径参数、查询参数和 hash
 */
export function buildUrl(
  path: string,
  options?: {
    params?: Record<string, string | number | string[]>
    query?: Record<string, string | number | string[] | undefined>
    hash?: Record<string, string | number | string[] | undefined> | string
  },
): string {
  let url = path

  // 处理路径参数
  if (options?.params && Object.keys(options.params).length > 0) {
    try {
      // 使用 path-to-regexp 的 compile 函数来构建路径
      const toPath = compile(path, { encode: encodeURIComponent })
      // 将 params 转换为 path-to-regexp 期望的格式（string | string[]）
      const pathParams: Record<string, string | string[]> = {}
      for (const [key, value] of Object.entries(options.params)) {
        if (Array.isArray(value)) {
          pathParams[key] = value.map(String)
        }
        else {
          pathParams[key] = String(value)
        }
      }
      url = toPath(pathParams)
    }
    catch (error) {
      // 如果编译失败（例如路径不包含参数占位符），直接使用原路径
      console.warn('Failed to compile path with params:', error)
    }
  }

  // 处理查询参数
  if (options?.query && Object.keys(options.query).length > 0) {
    const searchParams = new URLSearchParams()
    for (const [key, value] of Object.entries(options.query)) {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => searchParams.append(key, String(v)))
        }
        else {
          searchParams.set(key, String(value))
        }
      }
    }
    const queryString = searchParams.toString()
    if (queryString) {
      url += `?${queryString}`
    }
  }

  // 处理 hash
  if (options?.hash !== undefined) {
    if (typeof options.hash === 'string') {
      // 如果是字符串，直接使用（可能包含 # 或不包含）
      url += options.hash.startsWith('#')
        ? options.hash
        : `#${options.hash}`
    }
    else if (typeof options.hash === 'object' && options.hash !== null) {
      // 如果是对象，构建 hash 参数
      const hashParams = new URLSearchParams()
      for (const [key, value] of Object.entries(options.hash)) {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => hashParams.append(key, String(v)))
          }
          else {
            hashParams.set(key, String(value))
          }
        }
      }
      const hashString = hashParams.toString()
      if (hashString) {
        url += `#${hashString}`
      }
    }
  }

  return url
}
