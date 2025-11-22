import { NextRequest, NextResponse } from 'next/server'
import { getUserBookmarks, BookmarkFilters, PaginationParams, createBookmark, deleteBookmark } from '@/lib/supabase/bookmark'
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
    
    // 解析分页参数
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc'
    
    // 解析过滤参数
    const object_id = searchParams.get('objectId') || undefined
    const start_epoch = searchParams.get('startEpoch') ? parseInt(searchParams.get('startEpoch')!) : undefined
    const end_epoch = searchParams.get('endEpoch') ? parseInt(searchParams.get('endEpoch')!) : undefined
    const owner = searchParams.get('owner') || user.email // 默认使用当前用户email
    const net_type = searchParams.get('netType') as 'testnet' | 'mainnet' | undefined
    const user_id = user.id || ''
    
    const filters: BookmarkFilters = {
      object_id,
      start_epoch,
      end_epoch,
      owner,
      net_type,
      user_id
    }
    
    // 构建分页参数 - 将前端的camelCase转换为数据库的snake_case
    const dbSortBy = (() => {
      const sortField = sortBy || 'createdAt'
      const fieldMapping: Record<string, string> = {
        'createdAt': 'created_at',
        'updatedAt': 'updated_at',
        'objectId': 'object_id',
        'startEpoch': 'start_epoch',
        'endEpoch': 'end_epoch',
        'userId': 'owner',
        'netType': 'net_type'
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
    const result = await getUserBookmarks(filters, pagination)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || '查询书签失败' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: result.data
    })
    
  } catch (error) {
    console.error('书签查询API错误:', error)
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
    const { walletAddress, objectId: object_id, startEpoch: start_epoch, endEpoch: end_epoch, remark, remarkImages: remark_images, netType: net_type } = body

    if (!object_id) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      )
    }

    const result = await createBookmark({
      object_id,
      start_epoch,
      end_epoch,
      remark,
      remark_images,
      owner: user.email as string, // 始终使用当前认证用户的email
      net_type,
      wallet_address: walletAddress || '',
      user_id: user.id || ''
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || '创建书签失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data
    })

  } catch (error) {
    console.error('创建书签API错误:', error)
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
    const objectId = searchParams.get('objectId')

    if (!objectId) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      )
    }

    const result = await deleteBookmark(objectId, user.email as string, user.id || '')

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || '删除书签失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '书签删除成功'
    })

  } catch (error) {
    console.error('删除书签API错误:', error)
    const message = error instanceof Error ? error.message : '服务器处理请求失败'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}