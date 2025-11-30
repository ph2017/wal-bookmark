import { createClient } from '@supabase/supabase-js'
import { Subscribe, SubscribesResponse, SubscribeFilters, PaginationParams, ApiResponse } from './types'

// 获取 Supabase 客户端
const getSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(supabaseUrl, supabaseKey)
}

/**
 * 根据ID获取订阅
 * @param subscribeId 订阅ID
 * @param userId 用户ID（可选，用于权限验证）
 * @returns 订阅数据
 */
export async function getSubscribeById(
  subscribeId: number,
  userId?: string
): Promise<ApiResponse<Subscribe>> {
  try {
    const supabase = getSupabaseClient()
    
    // 构建基础查询
    let query = supabase
      .from('subscribe')
      .select('*')
      .eq('id', subscribeId)

    // 如果有用户ID，添加权限验证
    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query.single()

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: '订阅不存在或无权限访问'
        }
      }
      console.error('获取订阅失败:', error)
      return {
        success: false,
        error: error.message
      }
    }

    return {
      success: true,
      data: data as Subscribe
    }
  } catch (error) {
    console.error('获取订阅异常:', error)
    return {
      success: false,
      error: '获取订阅时发生未知错误'
    }
  }
}

/**
 * 获取用户的订阅列表（支持分页和过滤）
 * @param filters 过滤条件
 * @param pagination 分页参数
 * @returns 订阅列表
 */
export async function getUserSubscribes(
  userId: string,
  filters?: SubscribeFilters,
  pagination?: PaginationParams
): Promise<ApiResponse<SubscribesResponse>> {
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
      .from('subscribe')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)

    // 应用过滤条件
    if (filters) {
      if (filters.bookmark_id) {
        query = query.eq('bookmark_id', filters.bookmark_id)
      }
      if (filters.user_email) {
        query = query.eq('user_email', filters.user_email)
      }
      if (filters.advance_day) {
        query = query.eq('advance_day', filters.advance_day)
      }
      if (filters.end_time) {
        query = query.eq('end_time', filters.end_time)
      }
    }

    // 应用排序
    const sortField = sortBy === 'createdAt' ? 'created_at' : 'created_at'
    query = query.order(sortField, { ascending: sortOrder === 'asc' })

    // 应用分页
    query = query.range(offset, offset + pageSize - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('获取用户订阅失败:', error)
      return {
        success: false,
        error: error.message
      }
    }

    const totalPages = Math.ceil((count || 0) / pageSize)

    return {
      success: true,
      data: {
        data: (data || []) as Subscribe[],
        total: count || 0,
        page,
        pageSize,
        totalPages
      }
    }
  } catch (error) {
    console.error('获取用户订阅异常:', error)
    return {
      success: false,
      error: '获取用户订阅时发生未知错误'
    }
  }
}

/**
 * 获取所有订阅（管理员用，支持分页和过滤）
 * @param filters 过滤条件
 * @param pagination 分页参数
 * @returns 订阅列表
 */
export async function getAllSubscribes(
  filters?: SubscribeFilters,
  pagination?: PaginationParams
): Promise<ApiResponse<SubscribesResponse>> {
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
      .from('subscribe')
      .select('*', { count: 'exact' })

    // 应用过滤条件
    if (filters) {
      if (filters.bookmark_id) {
        query = query.eq('bookmark_id', filters.bookmark_id)
      }
      if (filters.user_id) {
        query = query.eq('user_id', filters.user_id)
      }
      if (filters.user_email) {
        query = query.eq('user_email', filters.user_email)
      }
      if (filters.advance_day) {
        query = query.eq('advance_day', filters.advance_day)
      }
      if (filters.end_time) {
        query = query.eq('end_time', filters.end_time)
      }
    }

    // 应用排序
    const sortField = sortBy === 'createdAt' ? 'created_at' : 'created_at'
    query = query.order(sortField, { ascending: sortOrder === 'asc' })

    // 应用分页
    query = query.range(offset, offset + pageSize - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('获取所有订阅失败:', error)
      return {
        success: false,
        error: error.message
      }
    }

    const totalPages = Math.ceil((count || 0) / pageSize)

    return {
      success: true,
      data: {
        data: (data || []) as Subscribe[],
        total: count || 0,
        page,
        pageSize,
        totalPages
      }
    }
  } catch (error) {
    console.error('获取所有订阅异常:', error)
    return {
      success: false,
      error: '获取所有订阅时发生未知错误'
    }
  }
}

/**
 * 根据书签ID获取订阅（检查是否已订阅）
 * @param bookmarkIds 书签ID列表
 * @param userId 用户ID
 * @returns 订阅数据
 */
export async function getSubscribeByBookmarkIds(
  bookmarkIds: string[],
  userId?: string
): Promise<ApiResponse<Subscribe[]>> {
  try {
    const supabase = getSupabaseClient()
    
    let query = supabase
      .from('subscribe')
      .select('*')
      .in('bookmark_id', bookmarkIds)

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query

    if (error) {
      console.error('批量获取书签订阅失败:', error)
      return {
        success: false,
        error: error.message
      }
    }

    return {
      success: true,
      data: data as Subscribe[]
    }
  } catch (error) {
    console.error('批量获取书签订阅异常:', error)
    return {
      success: false,
      error: '批量获取书签订阅时发生未知错误'
    }
  }
}

/**
 * 根据书签ID获取订阅（检查是否已订阅）
 * @param bookmarkId 书签ID
 * @param userId 用户ID
 * @returns 订阅数据
 */
export async function getSubscribeByBookmarkId(
  bookmarkId: string,
  userId?: string
): Promise<ApiResponse<Subscribe>> {
  try {
    const supabase = getSupabaseClient()
    
    let query = supabase
      .from('subscribe')
      .select('*')
      .eq('bookmark_id', bookmarkId)

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query.single()

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: '该订阅不存在'
        }
      }
      console.error('获取书签订阅失败:', error)
      return {
        success: false,
        error: error.message
      }
    }

    return {
      success: true,
      data: data as Subscribe
    }
  } catch (error) {
    console.error('获取书签订阅异常:', error)
    return {
      success: false,
      error: '获取书签订阅时发生未知错误'
    }
  }
}

/**
 * 获取用户订阅的书签ID列表
 * @param userId 用户ID
 * @returns 书签ID数组
 */
export async function getUserSubscribedBookmarkIds(
  userId: string
): Promise<ApiResponse<string[]>> {
  try {
    const supabase = getSupabaseClient()
    
    const { data, error } = await supabase
      .from('subscribe')
      .select('bookmark_id')
      .eq('user_id', userId)

    if (error) {
      console.error('获取用户订阅书签ID失败:', error)
      return {
        success: false,
        error: error.message
      }
    }

    const bookmarkIds = (data || []).map(item => item.bookmark_id)

    return {
      success: true,
      data: bookmarkIds
    }
  } catch (error) {
    console.error('获取用户订阅书签ID异常:', error)
    return {
      success: false,
      error: '获取用户订阅书签ID时发生未知错误'
    }
  }
}

/**
 * 检查书签是否已被用户订阅
 * @param bookmarkId 书签ID
 * @param userId 用户ID
 * @returns 是否已订阅
 */
export async function isBookmarkSubscribed(
  bookmarkId: string,
  userId: string
): Promise<ApiResponse<boolean>> {
  try {
    const supabase = getSupabaseClient()
    
    const { count, error } = await supabase
      .from('subscribe')
      .select('*', { count: 'exact', head: true })
      .eq('bookmark_id', bookmarkId)
      .eq('user_id', userId)

    if (error) {
      console.error('检查订阅状态失败:', error)
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
    console.error('检查订阅状态异常:', error)
    return {
      success: false,
      error: '检查订阅状态时发生未知错误'
    }
  }
}

/**
 * 获取即将到期的订阅（用于提醒）
 * @param daysInAdvance 提前天数（默认7天）
 * @returns 即将到期的订阅列表
 */
export async function getExpiringSubscribes(
  daysInAdvance: number = 7
): Promise<ApiResponse<Subscribe[]>> {
  try {
    const supabase = getSupabaseClient()
    
    const currentDate = new Date()
    const expiryDate = new Date(currentDate.getTime() + daysInAdvance * 24 * 60 * 60 * 1000)

    const { data, error } = await supabase
      .from('subscribe')
      .select('*')
      .lte('end_time', expiryDate.toISOString())
      .gte('end_time', currentDate.toISOString())
      .order('end_time', { ascending: true })

    if (error) {
      console.error('获取即将到期订阅失败:', error)
      return {
        success: false,
        error: error.message
      }
    }

    return {
      success: true,
      data: (data || []) as Subscribe[]
    }
  } catch (error) {
    console.error('获取即将到期订阅异常:', error)
    return {
      success: false,
      error: '获取即将到期订阅时发生未知错误'
    }
  }
}