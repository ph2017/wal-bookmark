import { createClient } from '@supabase/supabase-js'

// 获取 Supabase 管理客户端（使用服务角色密钥，绕过RLS）
export const getAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(supabaseUrl, supabaseKey)
}