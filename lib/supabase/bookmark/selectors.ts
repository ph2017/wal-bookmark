import { createClient } from '@supabase/supabase-js'
import { Bookmark, BookmarksResponse, BookmarkFilters, PaginationParams, ApiResponse } from './types'

// 获取 Supabase 客户端
const getSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(supabaseUrl, supabaseKey)
}

/**
 * 根据ID获取书签
 * @param bookmarkId 书签ID
 * @param userId 用户ID（可选，用于权限验证）
 * @returns 书签数据
 */
export async function getBookmarkById(
  bookmarkId: number,
  userId?: string
): Promise<ApiResponse<Bookmark>> {
  try {
    const supabase = getSupabaseClient()
    
    // 构建基础查询
    let query = supabase
      .from('bookmark')
      .select('*')
      .eq('id', bookmarkId)

    // 如果有用户ID，添加权限验证
    if (userId) {
      query = query.eq('owner', userId)
    }

    const { data, error } = await query.single()

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: '书签不存在或无权限访问'
        }
      }
      console.error('获取书签失败:', error)
      return {
        success: false,
        error: error.message
      }
    }

    return {
      success: true,
      data: data as Bookmark
    }
  } catch (error) {
    console.error('获取书签异常:', error)
    return {
      success: false,
      error: '获取书签时发生未知错误'
    }
  }
}

/**
 * 获取用户的书签列表（支持分页和过滤）
 * @param filters 过滤条件
 * @param pagination 分页参数
 * @returns 书签列表
 */
export async function getUserBookmarks(
  filters?: BookmarkFilters,
  pagination?: PaginationParams
): Promise<ApiResponse<BookmarksResponse>> {
  try {
    const supabase = getSupabaseClient()
    
    const {
      page = 1,
      pageSize = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = pagination || {}

    // 计算偏移量
    const offset = (page - 1) * pageSize

    // 构建基础查询
    let query = supabase
      .from('bookmark')
      .select('*', { count: 'exact' })

    // 应用过滤条件
    if (filters) {
      if (filters.object_id) {
        query = query.eq('object_id', filters.object_id)
      }
      if (filters.start_epoch) {
        query = query.eq('start_epoch', filters.start_epoch)
      }
      if (filters.end_epoch) {
        query = query.eq('end_epoch', filters.end_epoch)
      }
      if (filters.owner) {
        query = query.eq('owner', filters.owner)
      }
      if (filters.net_type) {
        query = query.eq('net_type', filters.net_type)
      }
    }

    // 应用排序
    const sortField = sortBy === 'createdAt' ? 'created_at' : 'created_at'
    query = query.order(sortField, { ascending: sortOrder === 'asc' })

    // 应用分页
    query = query.range(offset, offset + pageSize - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('获取用户书签失败:', error)
      return {
        success: false,
        error: error.message
      }
    }

    const totalPages = Math.ceil((count || 0) / pageSize)

    return {
      success: true,
      data: {
        data: (data || []) as Bookmark[],
        total: count || 0,
        page,
        pageSize,
        totalPages
      }
    }
  } catch (error) {
    console.error('获取用户书签异常:', error)
    return {
      success: false,
      error: '获取用户书签时发生未知错误'
    }
  }
}

/**
 * 获取所有书签（管理员用，支持分页和过滤）
 * @param filters 过滤条件
 * @param pagination 分页参数
 * @returns 书签列表
 */
export async function getAllBookmarks(
  filters?: BookmarkFilters,
  pagination?: PaginationParams
): Promise<ApiResponse<BookmarksResponse>> {
  try {
    const supabase = getSupabaseClient()
    
    const {
      page = 1,
      pageSize = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = pagination || {}

    // 计算偏移量
    const offset = (page - 1) * pageSize

    // 构建基础查询
    let query = supabase
      .from('bookmark')
      .select('*', { count: 'exact' })

    // 应用过滤条件
    if (filters) {
      if (filters.owner) {
        query = query.eq('owner', filters.owner)
      }
      if (filters.object_id) {
        query = query.eq('object_id', filters.object_id)
      }
      if (filters.start_epoch) {
        query = query.eq('start_epoch', filters.start_epoch)
      }
      if (filters.end_epoch) {
        query = query.eq('end_epoch', filters.end_epoch)
      }
      if (filters.net_type) {
        query = query.eq('net_type', filters.net_type)
      }
    }

    // 应用排序
    const sortField = sortBy === 'createdAt' ? 'created_at' : 'created_at'
    query = query.order(sortField, { ascending: sortOrder === 'asc' })

    // 应用分页
    query = query.range(offset, offset + pageSize - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('获取所有书签失败:', error)
      return {
        success: false,
        error: error.message
      }
    }

    const totalPages = Math.ceil((count || 0) / pageSize)

    return {
      success: true,
      data: {
        data: (data || []) as Bookmark[],
        total: count || 0,
        page,
        pageSize,
        totalPages
      }
    }
  } catch (error) {
    console.error('获取所有书签异常:', error)
    return {
      success: false,
      error: '获取所有书签时发生未知错误'
    }
  }
}

/**
 * 根据对象ID获取书签（检查是否已收藏）
 * @param objectId 对象ID
 * @param userId 用户ID
 * @returns 书签数据
 */
export async function getBookmarkByObjectId(
  objectId: string,
  userId?: string
): Promise<ApiResponse<Bookmark>> {
  try {
    const supabase = getSupabaseClient()
    
    let query = supabase
      .from('bookmark')
      .select('*')
      .eq('object_id', objectId)

    if (userId) {
      query = query.eq('owner', userId)
    }

    const { data, error } = await query.single()

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: '该书签不存在'
        }
      }
      console.error('获取对象书签失败:', error)
      return {
        success: false,
        error: error.message
      }
    }

    return {
      success: true,
      data: data as Bookmark
    }
  } catch (error) {
    console.error('获取对象书签异常:', error)
    return {
      success: false,
      error: '获取对象书签时发生未知错误'
    }
  }
}

/**
 * 获取用户收藏的对象ID列表
 * @param userId 用户ID
 * @param objectType 对象类型（可选）
 * @returns 对象ID数组
 */
export async function getUserBookmarkedObjectIds(
  userId: string,
  objectType?: string
): Promise<ApiResponse<string[]>> {
  try {
    const supabase = getSupabaseClient()
    
    let query = supabase
      .from('bookmarks')
      .select('object_id')
      .eq('user_id', userId)

    if (objectType) {
      query = query.eq('object_type', objectType)
    }

    const { data, error } = await query

    if (error) {
      console.error('获取用户收藏对象ID失败:', error)
      return {
        success: false,
        error: error.message
      }
    }

    const objectIds = (data || []).map(item => item.object_id)

    return {
      success: true,
      data: objectIds
    }
  } catch (error) {
    console.error('获取用户收藏对象ID异常:', error)
    return {
      success: false,
      error: '获取用户收藏对象ID时发生未知错误'
    }
  }
}

/**
 * 检查对象是否已被用户收藏
 * @param objectId 对象ID
 * @param userId 用户ID
 * @returns 是否已收藏
 */
export async function isObjectBookmarked(
  objectId: string,
  userId: string
): Promise<ApiResponse<boolean>> {
  try {
    const supabase = getSupabaseClient()
    
    const { count, error } = await supabase
      .from('bookmarks')
      .select('*', { count: 'exact', head: true })
      .eq('object_id', objectId)
      .eq('user_id', userId)

    if (error) {
      console.error('检查收藏状态失败:', error)
      return {
        success: false,
        error: error.message
      }
    }

    return {
      success: true,
      data: (count || 0) > 0
    }
  } catch (error) {
    console.error('检查收藏状态异常:', error)
    return {
      success: false,
      error: '检查收藏状态时发生未知错误'
    }
  }
}