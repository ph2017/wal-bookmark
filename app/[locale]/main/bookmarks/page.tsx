"use client";
import { AppHeader } from "@/components/biz/AppHeader";
import { Card, Table, Button, Tag, Spin, message, Tooltip } from "antd";
import { StarFilled, StarOutlined, DeleteOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { useSuiClient } from "@mysten/dapp-kit";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/useAuth";

interface Bookmark {
  id: number;
  object_id: string;
  object_type?: string;
  owner: string;
  created_at: string;
  updated_at?: string;
  start_epoch?: number;
  end_epoch?: number;
  remark?: string;
  remark_images?: string;
  net_type?: 'testnet' | 'mainnet';
}

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const suiClient = useSuiClient();
  const { user, loading: authLoading } = useAuth();

  const fetchBookmarks = async () => {
    if (!user) {
      console.log('用户未登录，跳过获取书签');
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch("/api/bookmark");
      if (!response.ok) {
        if (response.status === 401) {
          messageApi.error("请先登录");
          return;
        }
        throw new Error("Failed to fetch bookmarks");
      }
      const result = await response.json();
      
      // 检查返回的数据结构
      if (result.success && result.data && Array.isArray(result.data.data)) {
        setBookmarks(result.data.data);
      } else {
        console.error('Invalid API response structure:', result);
        setBookmarks([]);
      }
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
      messageApi.error("Failed to fetch bookmarks");
      setBookmarks([]);
    } finally {
      setLoading(false);
    }
  };

  const removeBookmark = async (objectId: string) => {
    try {
      const response = await fetch(`/api/bookmark?objectId=${objectId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to remove bookmark");
      }

      messageApi.success("Bookmark removed successfully");
      fetchBookmarks();
    } catch (error) {
      messageApi.error("Failed to remove bookmark");
    }
  };

  const viewObject = async (objectId: string) => {
    window.open(`https://suiscan.xyz/testnet/object/${objectId}`, "_blank");
  };

  useEffect(() => {
    if (user && !authLoading) {
      fetchBookmarks();
    }
  }, [user, authLoading]);

  const columns = [
    {
      title: "Object ID",
      dataIndex: "object_id",
      key: "object_id",
      width: 200,
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <span className="cursor-pointer hover:text-blue-500" onClick={() => viewObject(text)}>
            {text.slice(0, 8)}...{text.slice(-8)}
          </span>
        </Tooltip>
      ),
    },
    {
      title: "Type",
      dataIndex: "object_type",
      key: "object_type",
      width: 120,
      render: (text?: string) => text ? <Tag color="blue">{text.split("::").pop()}</Tag> : <Tag color="gray">Unknown</Tag>,
    },
    {
      title: "Created",
      dataIndex: "created_at",
      key: "created_at",
      width: 150,
      render: (text: string) => (
        <Tooltip title={new Date(text).toLocaleString()}>
          {formatDistanceToNow(new Date(text), { addSuffix: true })}
        </Tooltip>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      fixed: 'right',
      render: (_: any, record: Bookmark) => (
        <Button
          type="text"
          icon={<DeleteOutlined />}
          danger
          onClick={() => removeBookmark(record.object_id)}
          title="Delete bookmark"
        />
      ),
    },
  ];

  if (authLoading) {
    return (
      <div className="h-[95vh] flex flex-col overflow-hidden">
        {contextHolder}
        <AppHeader breadcrumbs={[{ label: "Bookmarks" }]} className="" />
        <div className="flex-1 flex items-center justify-center">
          <Spin size="large" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-[95vh] flex flex-col overflow-hidden">
        {contextHolder}
        <AppHeader breadcrumbs={[{ label: "Bookmarks" }]} className="" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg mb-4">请先登录查看书签</p>
            <Button type="primary" onClick={() => window.location.href = '/login'}>
              登录
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[95vh] flex flex-col overflow-hidden">
      {contextHolder}
      <AppHeader breadcrumbs={[{ label: "Bookmarks" }]} className="" />
      <div className="flex-1 overflow-auto px-4 py-2 box-border">
        <Card
          title={
            <div className="flex items-center justify-between">
              <span>My Bookmarks</span>
              <Button type="primary" onClick={fetchBookmarks} loading={loading}>
                Refresh
              </Button>
            </div>
          }
          className="h-full flex flex-col"
        >
          {loading ? (
            <div className="text-center py-8">
              <Spin size="large" />
            </div>
          ) : (
            <Table
              columns={columns}
              dataSource={bookmarks}
              rowKey="id"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total) => `Total ${total} bookmarks`,
                position: ['bottomCenter']
              }}
              locale={{
                emptyText: "No bookmarks yet. Add some bookmarks from the Blob Viewer!",
              }}
              className="bookmarks-table"
              size="middle"
            />
          )}
        </Card>
      </div>
    </div>
  );
}