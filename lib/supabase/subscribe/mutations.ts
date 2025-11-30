import { createClient } from "@supabase/supabase-js";
import { Subscribe, CreateSubscribeInput, ApiResponse } from "./types";

// 获取 Supabase 客户端
const getSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
};

/**
 * 创建新订阅
 * @param input 订阅数据
 * @returns 创建的订阅数据
 */
export async function createSubscribe(
  input: CreateSubscribeInput
): Promise<ApiResponse<Subscribe>> {
  try {
    const supabase = getSupabaseClient();

    console.log("创建订阅输入:", input);
    
    // 确保必需字段不为空
    if (!input.bookmark_id || !input.user_id || !input.user_email || !input.end_time) {
      return {
        success: false,
        error: "缺少必需字段（bookmark_id, user_id, user_email, end_time）",
      };
    }

    const { data, error } = await supabase
      .from("subscribe")
      .insert([
        {
          bookmark_id: input.bookmark_id,
          user_id: input.user_id,
          user_email: input.user_email,
          advance_day: input.advance_day || 7, // 默认提前7天提醒
          end_time: input.end_time,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("创建订阅失败:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      data: data as Subscribe,
    };
  } catch (error) {
    console.error("创建订阅异常:", error);
    return {
      success: false,
      error: "创建订阅时发生未知错误",
    };
  }
}

/**
 * 更新订阅
 * @param subscribeId 订阅ID
 * @param userId 操作者ID
 * @param updateData 更新数据
 * @returns 更新后的订阅数据
 */
export async function updateSubscribe(
  subscribeId: number,
  userId: string,
  updateData: Partial<CreateSubscribeInput>
): Promise<ApiResponse<Subscribe>> {
  try {
    const supabase = getSupabaseClient();

    // 首先检查订阅是否存在且用户有权限修改
    const { data: existingSubscribe, error: fetchError } = await supabase
      .from("subscribe")
      .select("user_id")
      .eq("id", subscribeId)
      .single();

    if (fetchError) {
      return {
        success: false,
        error: "订阅不存在",
      };
    }

    // 检查权限（只有创建者可以修改）
    if (existingSubscribe.user_id !== userId) {
      return {
        success: false,
        error: "没有权限修改此订阅",
      };
    }

    const { data, error } = await supabase
      .from("subscribe")
      .update(updateData)
      .eq("id", subscribeId)
      .select()
      .single();

    if (error) {
      console.error("更新订阅失败:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      data: data as Subscribe,
    };
  } catch (error) {
    console.error("更新订阅异常:", error);
    return {
      success: false,
      error: "更新订阅时发生未知错误",
    };
  }
}

/**
 * 删除订阅
 * @param subscribeId 订阅ID
 * @param userId 用户ID
 * @returns 删除结果
 */
export async function deleteSubscribe(
  subscribeId: number,
  userId: string
): Promise<ApiResponse<null>> {
  try {
    const supabase = getSupabaseClient();

    // 首先检查订阅是否存在且属于该用户
    const { data: existingSubscribe, error: checkError } = await supabase
      .from("subscribe")
      .select("user_id")
      .eq("id", subscribeId)
      .single();

    console.log("删除订阅输入:", subscribeId, userId);
    console.log('existingSubscribe:', existingSubscribe);
    console.log('checkError:', checkError);

    if (checkError) {
      return {
        success: false,
        error: "订阅不存在",
      };
    }

    // 检查权限（只有创建者可以删除）
    if (existingSubscribe.user_id !== userId) {
      return {
        success: false,
        error: "没有权限删除此订阅",
      };
    }

    const { error, data: deletedData } = await supabase
      .from("subscribe")
      .delete()
      .eq("id", subscribeId)
      .eq("user_id", userId)
      .select(); // 返回被删除的行
 
    if (error) {
      console.error("删除订阅失败:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    // 检查是否实际删除了数据
    if (!deletedData || deletedData.length === 0) {
      return {
        success: false,
        error: '未找到要删除的订阅'
      }
    }

    return {
      success: true,
      data: null,
    };
  } catch (error) {
    console.error("删除订阅异常:", error);
    return {
      success: false,
      error: "删除订阅时发生未知错误",
    };
  }
}

/**
 * 批量删除订阅
 * @param subscribeIds 订阅ID数组
 * @param userId 操作者ID
 * @returns 删除结果
 */
export async function batchDeleteSubscribes(
  subscribeIds: number[],
  userId: string
): Promise<ApiResponse<number>> {
  try {
    const supabase = getSupabaseClient();

    // 检查所有订阅的权限
    const { data: existingSubscribes, error: fetchError } = await supabase
      .from("subscribe")
      .select("id, user_id")
      .in("id", subscribeIds);

    if (fetchError) {
      return {
        success: false,
        error: "获取订阅信息失败",
      };
    }

    // 检查权限（只能删除自己的订阅）
    const unauthorizedSubscribes =
      existingSubscribes?.filter((subscribe) => subscribe.user_id !== userId) || [];

    if (unauthorizedSubscribes.length > 0) {
      return {
        success: false,
        error: "没有权限删除部分订阅",
      };
    }

    const { error, data: deletedData } = await supabase
      .from("subscribe")
      .delete()
      .in("id", subscribeIds)
      .eq("user_id", userId)
      .select(); // 返回被删除的行

    if (error) {
      console.error("批量删除订阅失败:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      data: deletedData?.length || 0,
    };
  } catch (error) {
    console.error("批量删除订阅异常:", error);
    return {
      success: false,
      error: "批量删除订阅时发生未知错误",
    };
  }
}