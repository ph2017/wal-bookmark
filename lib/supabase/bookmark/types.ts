// Bookmark 表的 TypeScript 类型定义

export interface Bookmark {
  id: number
  object_id: string
  start_epoch?: number
  end_epoch?: number
  remark?: string
  remark_images?: string
  owner: string
  net_type: 'testnet' | 'mainnet'
  created_at: string,
  wallet_address: string
  user_id: string
}

// 创建书签时的输入类型（不包含自动生成的字段）
export interface CreateBookmarkInput {
  object_id: string
  start_epoch?: number
  end_epoch?: number
  remark?: string
  remark_images?: string
  owner: string
  net_type?: 'testnet' | 'mainnet'
  wallet_address?: string
  user_id: string
}

// 更新书签时的输入类型（所有字段都是可选的）
export interface UpdateBookmarkInput {
  name?: string;
  description?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  user_id: string;
}

// 书签查询过滤条件
export interface BookmarkFilters {
  object_id?: string
  owner?: string
  start_epoch?: number
  end_epoch?: number
  net_type?: 'testnet' | 'mainnet'
  user_id: string
}

// 分页参数
export interface PaginationParams {
  page?: number
  pageSize?: number
  sortBy?: string // 支持数据库字段名（snake_case）和前端字段名（camelCase）
  sortOrder?: 'asc' | 'desc'
}

// 查询结果类型
export interface BookmarksResponse {
  data: Bookmark[]
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