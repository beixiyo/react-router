/**
 * 导航选项
 */
export interface NavigateOptions {
  /** 是否替换当前历史记录而不是添加新记录 */
  replace?: boolean
  /** 路径参数，用于替换路径中的占位符（如 `/users/:id` 中的 `:id`） */
  params?: Record<string, string | number | string[]>
  /** 查询参数，会构建为 `?key=value&key2=value2` 格式 */
  query?: Record<string, string | number | string[] | undefined>
  /** Hash 参数，可以是对象（构建为 `#key=value&key2=value2`）或字符串（直接使用） */
  hash?: Record<string, string | number | string[] | undefined> | string
}
