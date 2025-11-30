// Subscribe 表的 TypeScript 类型定义

export interface Subscribe {
  id: number
  bookmark_id: string
  user_id: string
  user_email: string
  advance_day: number
  end_time: string
  created_at: string
}

// 创建订阅时的输入类型
export interface CreateSubscribeInput {
  bookmark_id: string
  user_id: string
  user_email: string
  advance_day?: number
  end_time?: string
}

// 更新订阅时的输入类型
export interface UpdateSubscribeInput {
  bookmark_id?: string
  user_id?: string
  user_email?: string
  advance_day?: number
  end_time?: string
}

// 订阅查询过滤条件
export interface SubscribeFilters {
  bookmark_id?: string
  user_id?: string
  user_email?: string
  advance_day?: number
  end_time?: string
}

// 分页参数
export interface PaginationParams {
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// 查询结果类型
export interface SubscribesResponse {
  data: Subscribe[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// API 响应类型
export interface ApiResponse<T> {
  data?: T
  error?: string
  success: boolean
}
