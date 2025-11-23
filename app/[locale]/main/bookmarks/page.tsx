"use client";
import { AppHeader } from "@/components/biz/AppHeader";
import {
  Card,
  Table,
  Button,
  Spin,
  Tooltip,
  Modal,
  Input,
  Upload,
  Form,
  App,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  DeleteOutlined,
  EditOutlined,
  UploadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useEffect, useRef, useState, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { AddressDisplay } from "@/components/biz/AddressDisplay";
import { createClient } from "@/utils/supbase/client";

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
  net_type?: "testnet" | "mainnet";
}

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(false);
  const { message: messageApi, modal } = App.useApp();
  const { user, loading: authLoading } = useAuth();
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [editRemark, setEditRemark] = useState("");
  const [editImages, setEditImages] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  const calculateEndTime = (
    endEpoch: number,
    network: "testnet" | "mainnet" | undefined
  ): string => {
    if (!endEpoch) return "N/A";

    const NETWORK_CONFIGS = {
      testnet: {
        epochDuration: 24 * 60 * 60,
        epoch1StartTimestamp: Math.floor(Date.now() / 1000) - 24 * 60 * 60,
      },
      mainnet: {
        epochDuration: 14 * 24 * 60 * 60,
        epoch1StartTimestamp: 1742865600,
      },
      devnet: {
        epochDuration: 24 * 60 * 60,
        epoch1StartTimestamp: Math.floor(Date.now() / 1000) - 24 * 60 * 60,
      },
      localnet: {
        epochDuration: 24 * 60 * 60,
        epoch1StartTimestamp: Math.floor(Date.now() / 1000) - 24 * 60 * 60,
      },
    };

    const currentNetwork = network || "testnet";
    const config = NETWORK_CONFIGS[currentNetwork];

    if (currentNetwork === "testnet") {
      const currentTime = Math.floor(Date.now() / 1000);
      const currentEpochStartTime =
        currentTime - (currentTime % config.epochDuration);
      const targetEpochStartTime =
        currentEpochStartTime + (endEpoch - 1) * config.epochDuration;
      const endTime = new Date(targetEpochStartTime * 1000);
      return endTime.toISOString().replace("T", " ").slice(0, -5) + " UTC";
    } else {
      const epochsSinceStart = endEpoch - 1;
      const epochStartTime =
        config.epoch1StartTimestamp + epochsSinceStart * config.epochDuration;
      const endTime = new Date(epochStartTime * 1000);
      return endTime.toISOString().replace("T", " ").slice(0, -5) + " UTC";
    }
  };

  const fetchBookmarks = useCallback(
    async (remarkFilter?: string) => {
      if (!user) {
        console.log("User not logged in, skipping bookmark fetch");
        return;
      }

      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (remarkFilter) {
          params.append("remark", remarkFilter);
        }

        const response = await fetch(`/api/bookmark?${params.toString()}`);
        if (!response.ok) {
          if (response.status === 401) {
            messageApi.error("Please login first");
            return;
          }
          throw new Error("Failed to fetch bookmarks");
        }
        const result = await response.json();

        if (result.success && result.data && Array.isArray(result.data.data)) {
          setBookmarks(
            result.data.data.map((item: Bookmark) => ({
              ...item,
              endTime: calculateEndTime(item.end_epoch || 0, item.net_type),
            }))
          );
        } else {
          console.error("Invalid API response structure:", result);
          setBookmarks([]);
        }
      } catch (error) {
        console.error("Error fetching bookmarks:", error);
        messageApi.error("Failed to fetch bookmarks");
        setBookmarks([]);
      } finally {
        setLoading(false);
      }
    },
    [user, messageApi]
  );

  const handleSearch = useCallback(
    async (values: { remark: string }) => {
      setSearchLoading(true);
      await fetchBookmarks(values.remark);
      setSearchLoading(false);
    },
    [fetchBookmarks]
  );

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
    } catch {
      messageApi.error("Failed to remove bookmark");
    }
  };

  const showDeleteConfirm = (objectId: string) => {
    modal.confirm({
      title: "Are you sure you want to delete this bookmark?",
      icon: <DeleteOutlined />,
      content: "This action cannot be undone.",
      okText: "Delete",
      okType: "danger",
      cancelText: "Cancel",
      onOk: () => removeBookmark(objectId),
    });
  };

  const showEditModal = (bookmark: Bookmark) => {
    setEditingBookmark(bookmark);
    setEditRemark(bookmark.remark || "");
    setEditImages(
      bookmark.remark_images ? bookmark.remark_images.split(",") : []
    );
    setEditModalVisible(true);
  };

  const handleEditCancel = () => {
    setEditModalVisible(false);
    setEditingBookmark(null);
    setEditRemark("");
    setEditImages([]);
  };

  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const handleEditSubmit = async () => {
    if (!editingBookmark) return;

    try {
      setIsSubmitLoading(true);
      const response = await fetch("/api/bookmark", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editingBookmark.id,
          object_id: editingBookmark.object_id,
          remark: editRemark,
          remark_images: editImages.join(","),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update bookmark");
      }

      messageApi.success("Bookmark updated successfully");
      setEditModalVisible(false);
      fetchBookmarks();
    } catch {
      messageApi.error("Failed to update bookmark");
    } finally {
      setIsSubmitLoading(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      messageApi.error("Image size must be less than 2MB");
      return false;
    }

    setUploadingImages(true);
    try {
      const supabase = createClient();
      const fileName = `${Date.now()}-${file.name}`;
      const filePath = `bookmark-images/${fileName}`;

      const { error } = await supabase.storage
        .from("bookmark-images")
        .upload(filePath, file);

      if (error) {
        throw error;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("bookmark-images").getPublicUrl(filePath);

      setEditImages([...editImages, publicUrl]);
      messageApi.success("Image uploaded successfully");
    } catch {
      messageApi.error("Failed to upload image");
    } finally {
      setUploadingImages(false);
    }

    return false;
  };

  const removeImage = (index: number) => {
    setEditImages(editImages.filter((_, i) => i !== index));
  };

  const showImagePreview = (imageUrl: string) => {
    setPreviewImage(imageUrl);
    setPreviewVisible(true);
  };

  const hideImagePreview = () => {
    setPreviewImage(null);
    setPreviewVisible(false);
  };

  const userRef = useRef(user);
  useEffect(() => {
    if (user && user.id !== userRef.current?.id) {
      fetchBookmarks();
      userRef.current = user;
    }
  }, [user, fetchBookmarks]);

  const columns: ColumnsType<Bookmark> = [
    {
      title: "Object ID",
      dataIndex: "object_id",
      key: "object_id",
      width: 160,
      ellipsis: true,
      render: (text: string, record: Bookmark) => (
        <AddressDisplay address={text} network={record.net_type || "testnet"} />
      ),
    },
    {
      title: "Start Epoch",
      dataIndex: "start_epoch",
      key: "start_epoch",
      width: 80,
      render: (text?: number) => text,
    },
    {
      title: "End Epoch",
      dataIndex: "end_epoch",
      key: "end_epoch",
      width: 80,
      render: (text?: number) => text,
    },
    {
      title: "End Time",
      dataIndex: "endTime",
      key: "endTime",
      width: 120,
      render: (text?: number) => text,
    },
    {
      title: "Remark",
      dataIndex: "remark",
      key: "remark",
      width: 120,
      render: (text?: number) => (
        <Tooltip title={text}>
          <div className="text-ellipsis whitespace-nowrap overflow-hidden max-w-[120px]">
            {text}
          </div>
        </Tooltip>
      ),
    },
    {
      title: "Remark Images",
      dataIndex: "remark_images",
      key: "remark_images",
      width: 120,
      render: (text?: string) => {
        if (!text) return null;

        const imageUrls = text.split(",").filter((url) => url.trim());
        if (imageUrls.length === 0) return null;

        return (
          <div className="flex flex-wrap gap-1">
            {imageUrls.slice(0, 3).map((url, index) => (
              <img
                key={index}
                src={url}
                alt={`Remark ${index + 1}`}
                className="w-8 h-8 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => showImagePreview(url)}
                title="Click to view full size"
              />
            ))}
            {imageUrls.length > 3 && (
              <span className="text-xs text-gray-500 ml-1">
                +{imageUrls.length - 3}
              </span>
            )}
          </div>
        );
      },
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
      width: 120,
      fixed: "right",
      render: (_: string, record: Bookmark) => (
        <div className="flex gap-2">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => showEditModal(record)}
            title="Edit bookmark"
          />
          <Button
            type="text"
            icon={<DeleteOutlined />}
            danger
            onClick={() => showDeleteConfirm(record.object_id)}
            title="Delete bookmark"
          />
        </div>
      ),
    },
  ];

  if (authLoading) {
    return (
      <div className="h-[95vh] flex flex-col overflow-hidden">
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
        <AppHeader breadcrumbs={[{ label: "Bookmarks" }]} className="" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg mb-4">Please login to view bookmarks</p>
            <Button
              type="primary"
              onClick={() => (window.location.href = "/login")}
            >
              Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[95vh] flex flex-col overflow-hidden">
      <AppHeader breadcrumbs={[{ label: "Bookmarks" }]} className="" />

      <div className="flex-1 overflow-auto px-4 py-2 box-border">
        <Card
          title={
            <div className="flex items-center justify-between">
              <span>My Bookmarks</span>
              <div className="flex items-center gap-2">
                <Form
                  name="search"
                  onFinish={handleSearch}
                  layout="inline"
                  className="flex items-center"
                >
                  <Form.Item name="remark" className="mb-0">
                    <Input
                      placeholder="Search by remark"
                      prefix={<SearchOutlined />}
                      allowClear
                      style={{ width: 200 }}
                    />
                  </Form.Item>
                  <Form.Item className="mb-0 ml-1">
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={searchLoading}
                    >
                      Search
                    </Button>
                  </Form.Item>
                </Form>
              </div>
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
                pageSizeOptions: ["10", "20", "50"],
              }}
              scroll={{ x: 1200 }}
            />
          )}
        </Card>
      </div>

      <Modal
        open={editModalVisible}
        title="Edit Bookmark"
        onCancel={handleEditCancel}
        footer={[
          <Button key="back" onClick={handleEditCancel}>
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={isSubmitLoading}
            onClick={handleEditSubmit}
          >
            Submit
          </Button>,
        ]}
      >
        <Form layout="vertical">
          <Form.Item label="Remark">
            <Input.TextArea
              value={editRemark}
              onChange={(e) => setEditRemark(e.target.value)}
              rows={4}
            />
          </Form.Item>
          <Form.Item label="Images">
            <Upload
              listType="picture-card"
              fileList={editImages.map((url, index) => ({
                uid: `${-index}`,
                name: `image-${index}.png`,
                status: "done",
                url,
              }))}
              beforeUpload={handleImageUpload}
              onRemove={(file) => {
                const index = editImages.findIndex((url) => url === file.url);
                if (index > -1) {
                  removeImage(index);
                }
              }}
              onPreview={(file) => showImagePreview(file.url || "")}
            >
              <div>
                <UploadOutlined />
                <div style={{ marginTop: 8 }}>Upload</div>
              </div>
            </Upload>
            {uploadingImages && <Spin />}
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={previewVisible}
        title="Image Preview"
        footer={null}
        onCancel={hideImagePreview}
      >
        <img
          alt="Preview"
          style={{ width: "100%", marginTop: "20px" }}
          src={previewImage || ""}
        />
      </Modal>
    </div>
  );
}
