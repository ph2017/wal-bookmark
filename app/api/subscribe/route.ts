import { NextRequest, NextResponse } from 'next/server'
import { getUserSubscribes, SubscribeFilters, PaginationParams, createSubscribe, deleteSubscribe, updateSubscribe, getSubscribeById, getSubscribeByBookmarkId, getSubscribeByBookmarkIds } from '@/lib/supabase/subscribe'
import { createClient } from '@/utils/supbase/server'

export async function GET(request: NextRequest) {
  try {
    // 获取当前用户会话
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: '用户未认证' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    
    // 检查是否是获取单个订阅
    const subscribeId = searchParams.get('id')
    if (subscribeId) {
      const result = await getSubscribeById(parseInt(subscribeId), user.id)
      
      if (!result.success) {
        return NextResponse.json(
          { error: result.error || '获取订阅失败' },
          { status: 500 }
        )
      }
      
      return NextResponse.json({
        success: true,
        data: result.data
      })
    }

    // 检查是否是检查书签订阅状态
    const bookmarkId = searchParams.get('bookmark_id')
    if (bookmarkId) {
      const result = await getSubscribeByBookmarkId(bookmarkId, user.id)
      
      if (!result.success) {
        return NextResponse.json(
          { error: result.error || '获取书签订阅失败' },
          { status: 500 }
        )
      }
      
      return NextResponse.json({
        success: true,
        data: result.data
      })
    }

    // 检查是否是检查书签订阅状态
    const bookmarkIds = searchParams.get('bookmark_ids')?.split(',')
    if (bookmarkIds) {
      const result = await getSubscribeByBookmarkIds(bookmarkIds, user.id)
      
      if (!result.success) {
        return NextResponse.json(
          { error: result.error || '批量获取书签订阅失败' },
          { status: 500 }
        )
      }
      
      return NextResponse.json({
        success: true,
        data: result.data
      })
    }
    
    // 解析分页参数
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc'
    
    // 解析过滤参数
    const bookmark_id = searchParams.get('bookmarkId') || undefined
    const user_email = searchParams.get('userEmail') || undefined
    const advance_day = searchParams.get('advanceDay') ? parseInt(searchParams.get('advanceDay')!) : undefined
    const end_time = searchParams.get('endTime') || undefined
    
    const filters: SubscribeFilters = {
      bookmark_id,
      user_email,
      advance_day,
      end_time
    }
    
    // 构建分页参数
    const dbSortBy = (() => {
      const sortField = sortBy || 'createdAt'
      const fieldMapping: Record<string, string> = {
        'createdAt': 'created_at',
        'updatedAt': 'updated_at',
        'bookmarkId': 'bookmark_id',
        'userEmail': 'user_email',
        'advanceDay': 'advance_day',
        'endTime': 'end_time'
      }
      return fieldMapping[sortField] || sortField
    })()

    const pagination: PaginationParams = {
      page,
      pageSize,
      sortBy: dbSortBy,
      sortOrder
    }
    
    // 调用查询方法
    const result = await getUserSubscribes(user.id, filters, pagination)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || '查询订阅失败' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: result.data
    })
    
  } catch (error) {
    console.error('订阅查询API错误:', error)
    const message = error instanceof Error ? error.message : '服务器处理请求失败'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // 获取当前用户会话
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: '用户未认证' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { 
      bookmark_id, 
      user_email, 
      advance_day, 
      end_time 
    } = body

    if (!bookmark_id) {
      return NextResponse.json(
        { error: 'bookmark_id' },
        { status: 400 }
      )
    }

    const result = await createSubscribe({
      bookmark_id,
      user_id: user.id || '',
      user_email: user_email || user.email || '',
      advance_day,
      end_time
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || '创建订阅失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data
    })

  } catch (error) {
    console.error('创建订阅API错误:', error)
    const message = error instanceof Error ? error.message : '服务器处理请求失败'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // 获取当前用户会话
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: '用户未认证' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const subscribeId = searchParams.get('id')

    if (!subscribeId) {
      return NextResponse.json(
        { error: '缺少必要参数（id）' },
        { status: 400 }
      )
    }

    const result = await deleteSubscribe(parseInt(subscribeId), user.id || '')

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || '删除订阅失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '订阅删除成功'
    })

  } catch (error) {
    console.error('删除订阅API错误:', error)
    const message = error instanceof Error ? error.message : '服务器处理请求失败'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    // 获取当前用户会话
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: '用户未认证' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { 
      id, 
      bookmarkId: bookmark_id, 
      userEmail: user_email, 
      advanceDay: advance_day, 
      endTime: end_time 
    } = body

    if (!id) {
      return NextResponse.json(
        { error: '缺少必要参数（id）' },
        { status: 400 }
      )
    }

    const result = await updateSubscribe(
      parseInt(id), 
      user.id || '',
      {
        bookmark_id,
        user_email,
        advance_day,
        end_time
      }
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || '更新订阅失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data
    })

  } catch (error) {
    console.error('更新订阅API错误:', error)
    const message = error instanceof Error ? error.message : '服务器处理请求失败'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}