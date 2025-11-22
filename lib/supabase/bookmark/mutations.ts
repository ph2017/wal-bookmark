import { createClient } from "@supabase/supabase-js";
import { Bookmark, CreateBookmarkInput, ApiResponse } from "./types";
import { getAdminClient } from "../admin-client";

// 获取 Supabase 客户端
const getSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true, // This will persist the session in cookies
      autoRefreshToken: true, // Automatically refresh the token
      // debug: true,
    },
  });
};

/**
 * 创建新书签
 * @param bookmarkData 书签数据
 * @param userId 用户ID
 * @returns 创建的书签数据
 */
export async function createBookmark(
  input: CreateBookmarkInput
): Promise<ApiResponse<Bookmark>> {
  try {
    const supabase = getSupabaseClient();

    console.log("创建书签输入:", input);
    // 确保user_id字段不为空
    if (!input.user_id) {
      return {
        success: false,
        error: "缺少用户ID",
      };
    }

    const { data, error } = await supabase
      .from("bookmark")
      .insert([
        {
          object_id: input.object_id,
          start_epoch: input.start_epoch,
          end_epoch: input.end_epoch,
          remark: input.remark,
          remark_images: input.remark_images,
          owner: input.owner,
          net_type: input.net_type || "testnet",
          wallet_address: input.wallet_address || "",
          user_id: input.user_id || "",
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("创建书签失败:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      data: data as Bookmark,
    };
  } catch (error) {
    console.error("创建书签异常:", error);
    return {
      success: false,
      error: "创建书签时发生未知错误",
    };
  }
}

/**
 * 更新书签
 * @param bookmarkId 书签ID
 * @param updateData 更新数据
 * @param userId 操作者ID
 * @returns 更新后的书签数据
 */
export async function updateBookmark(
  bookmarkId: number,
  userId: string,
  updateData: Partial<CreateBookmarkInput>
): Promise<ApiResponse<Bookmark>> {
  try {
    const supabase = getSupabaseClient(); // 使用管理客户端绕过RLS

    // 首先检查书签是否存在且用户有权限修改
    const { data: existingBookmark, error: fetchError } = await supabase
      .from("bookmark")
      .select("owner, user_id")
      .eq("id", bookmarkId)
      .single();

    if (fetchError) {
      return {
        success: false,
        error: "书签不存在",
      };
    }

    // 检查权限（只有创建者可以修改）
    if (existingBookmark.user_id !== userId) {
      return {
        success: false,
        error: "没有权限修改此书签",
      };
    }

    const { data, error } = await supabase
      .from("bookmark")
      .update(updateData)
      .eq("id", bookmarkId)
      .select()
      .single();

    if (error) {
      console.error("更新书签失败:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      data: data as Bookmark,
    };
  } catch (error) {
    console.error("更新书签异常:", error);
    return {
      success: false,
      error: "更新书签时发生未知错误",
    };
  }
}

/**
 * 删除书签
 * @param objectId 对象ID
 * @param owner 所有者email
 * @param userId 用户ID
 * @returns 删除结果
 */
export async function deleteBookmark(
  objectId: string,
  owner: string,
  userId: string
): Promise<ApiResponse<null>> {
  try {
    const supabase = getSupabaseClient();

    // 首先检查书签是否存在且属于该用户
    const { data: existingBookmark, error: checkError } = await supabase
      .from("bookmark")
      .select("owner, user_id, object_id")
      .eq("object_id", objectId)
      .eq("owner", owner)
      .single();

    console.log("查询书签结果:", existingBookmark);

    if (checkError) {
      return {
        success: false,
        error: checkError.message,
      };
    }

    // 检查权限（只有创建者可以删除）
    if (existingBookmark.user_id !== userId) {
      return {
        success: false,
        error: "没有权限删除此书签",
      };
    }

    const { error, data: deletedData } = await supabase
      .from("bookmark")
      .delete()
      .eq("object_id", objectId)
      .eq("owner", owner)
      .eq("user_id", userId)
      .select(); // 返回被删除的行

    // console.log('删除书签结果:', deletedData?.length || 0)
    console.log("error:", error);

    if (error) {
      console.error("删除书签失败:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    // // 检查是否实际删除了数据
    // if (!deletedData || deletedData.length === 0) {
    //   return {
    //     success: false,
    //     error: '未找到要删除的书签'
    //   }
    // }

    return {
      success: true,
      data: null,
    };
  } catch (error) {
    console.error("删除书签异常:", error);
    return {
      success: false,
      error: "删除书签时发生未知错误",
    };
  }
}

/**
 * 批量删除书签
 * @param bookmarkIds 书签ID数组
 * @param userId 操作者ID
 * @returns 删除结果
 */
export async function batchDeleteBookmarks(
  bookmarkIds: number[],
  userId: string
): Promise<ApiResponse<number>> {
  try {
    const supabase = getSupabaseClient(); // 使用管理客户端

    // 检查所有书签的权限
    const { data: existingBookmarks, error: fetchError } = await supabase
      .from("bookmark")
      .select("id, owner")
      .in("id", bookmarkIds);

    if (fetchError) {
      return {
        success: false,
        error: "获取书签信息失败",
      };
    }

    // 检查权限（只能删除自己的书签）
    const unauthorizedBookmarks =
      existingBookmarks?.filter((bookmark) => bookmark.owner !== userId) || [];

    if (unauthorizedBookmarks.length > 0) {
      return {
        success: false,
        error: "没有权限删除部分书签",
      };
    }

    const { error, data: deletedData } = await supabase
      .from("bookmark")
      .delete()
      .in("id", bookmarkIds)
      .eq("owner", userId)
      .select(); // 返回被删除的行

    if (error) {
      console.error("批量删除书签失败:", error);
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
    console.error("批量删除书签异常:", error);
    return {
      success: false,
      error: "批量删除书签时发生未知错误",
    };
  }
}
