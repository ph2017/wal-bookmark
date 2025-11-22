const { createClient } = require('@supabase/supabase-js')

// 直接使用环境变量中的值
const supabaseUrl = 'https://goscxqhlwagpvclyedmd.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdvc2N4cWhsd2FncHZjbHllZG1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwMzEzNjksImV4cCI6MjA3ODYwNzM2OX0.w6c-JOp47ODkFpuef8rylstuVKJUvQINB_wDSvKXz1Q'

console.log('Supabase URL:', supabaseUrl)
console.log('Supabase Key:', supabaseKey ? '已设置' : '未设置')

const supabase = createClient(supabaseUrl, supabaseKey)

async function testBookmarks() {
  try {
    // 首先检查数据库连接
    console.log('检查数据库连接...')
    
    // 尝试直接查询书签表
    const { data: bookmarks, error: bookmarkError } = await supabase
      .from('bookmark')
      .select('*')
      .limit(5)
    
    console.log('书签数据:', bookmarks)
    console.log('书签查询错误:', bookmarkError)
    
    // 尝试查询项目表（如果有的话）
    const { data: projects, error: projectError } = await supabase
      .from('project')
      .select('*')
      .limit(5)
    
    console.log('项目数据:', projects)
    console.log('项目查询错误:', projectError)
    
    // 尝试使用 RPC 获取表列表
    const { data: tables, error: rpcError } = await supabase
      .rpc('get_tables')
    
    console.log('RPC 表列表:', tables)
    console.log('RPC 错误:', rpcError)
    
  } catch (error) {
    console.error('查询失败:', error)
  }
}

testBookmarks()