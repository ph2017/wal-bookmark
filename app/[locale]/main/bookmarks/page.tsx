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
  InputNumber,
  Upload,
  Form,
  message,
  Tag,
} from "antd";
import { Badge } from "@/components/ui/badge";
import type { ColumnsType } from "antd/es/table";
import {
  DeleteOutlined,
  EditOutlined,
  UploadOutlined,
  SearchOutlined,
  TagOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  PlusSquareOutlined
} from "@ant-design/icons";
import { useEffect, useRef, useState, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { AddressDisplay } from "@/components/biz/AddressDisplay";
import { createClient } from "@/utils/supbase/client";
import { useSignAndExecuteTransaction, useCurrentAccount } from "@mysten/dapp-kit";
import { SuiClient } from "@mysten/sui/client";
import { Transaction, coinWithBalance } from "@mysten/sui/transactions";
import {
  WalrusClient,
  TESTNET_WALRUS_PACKAGE_CONFIG,
  MAINNET_WALRUS_PACKAGE_CONFIG,
} from "@mysten/walrus";

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
  isSubscribed?: boolean;
  subscribeId?: number;
}

interface Subscription {
  id: number;
  bookmark_id: number;
  user_id: string;
  user_email: string;
  advance_day: number;
  end_time: string;
  created_at: string;
  updated_at?: string;
}

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(false);
  // const { message: messageApi, modal } = App.useApp();
  const [modal, modalContextHolder] = Modal.useModal();
  const [messageApi, messageContextHolder] = message.useMessage();
  const { user, loading: authLoading } = useAuth();
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [editRemark, setEditRemark] = useState("");
  const [editImages, setEditImages] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const currentAccount = useCurrentAccount();
  const [extendModalVisible, setExtendModalVisible] = useState(false);
  const [extendingBookmark, setExtendingBookmark] = useState<Bookmark | null>(null);
  const [extendEpochs, setExtendEpochs] = useState(1);
  const [extending, setExtending] = useState(false);

  const calculateEndTime = async (
    endEpoch: number,
    network: "testnet" | "mainnet" | undefined
  ): Promise<string> => {
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
      try {
        // 获取当前epoch信息
        const { getCurrentEpoch } = await import("@/lib/walrus-epochs");
        const currentEpoch = await getCurrentEpoch("testnet");

        const currentTime = Math.floor(Date.now() / 1000);
        const currentEpochStartTime =
          currentTime - (currentTime % config.epochDuration);
        const targetEpochStartTime =
          currentEpochStartTime +
          (endEpoch - currentEpoch) * config.epochDuration;
        const endTime = new Date(targetEpochStartTime * 1000);
        return endTime.toISOString().replace("T", " ").slice(0, -5) + " UTC";
      } catch (error) {
        console.error("获取当前epoch失败:", error);
        // 如果获取失败，使用备用计算方法
        const currentTime = Math.floor(Date.now() / 1000);
        const currentEpochStartTime =
          currentTime - (currentTime % config.epochDuration);
        const targetEpochStartTime =
          currentEpochStartTime + (endEpoch - 1) * config.epochDuration;
        const endTime = new Date(targetEpochStartTime * 1000);
        return endTime.toISOString().replace("T", " ").slice(0, -5) + " UTC";
      }
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
          const bookmarksWithEndTime = await Promise.all(
            result.data.data.map(async (item: Bookmark) => ({
              ...item,
              endTime: await calculateEndTime(
                item.end_epoch || 0,
                item.net_type
              ),
            }))
          );

          // 批量检查订阅状态
          if (bookmarksWithEndTime.length > 0) {
            try {
              const bookmarkIds = bookmarksWithEndTime
                .map((item) => item.id)
                .join(",");
              const subscribeResponse = await fetch(
                `/api/subscribe?bookmark_ids=${bookmarkIds}`
              );

              if (subscribeResponse.ok) {
                const subscribeResult = await subscribeResponse.json();

                if (subscribeResult.success && subscribeResult.data) {
                  // 创建订阅状态的映射
                  const subscribedBookmarkIds = new Set(
                    subscribeResult.data.map(
                      (sub: Subscription) => sub.bookmark_id
                    )
                  );

                  // 更新书签的订阅状态
                  const bookmarksWithSubscription = bookmarksWithEndTime.map(
                    (item) => ({
                      ...item,
                      isSubscribed: subscribedBookmarkIds.has(item.id),
                      subscribeId: subscribeResult.data.find(
                        (sub: Subscription) => sub.bookmark_id === item.id
                      )?.id,
                    })
                  );

                  setBookmarks(bookmarksWithSubscription);
                } else {
                  // 如果订阅检查失败，默认设置为未订阅
                  const bookmarksWithSubscription = bookmarksWithEndTime.map(
                    (item) => ({
                      ...item,
                      isSubscribed: false,
                    })
                  );
                  setBookmarks(bookmarksWithSubscription);
                }
              } else {
                // 如果订阅检查失败，默认设置为未订阅
                const bookmarksWithSubscription = bookmarksWithEndTime.map(
                  (item) => ({
                    ...item,
                    isSubscribed: false,
                  })
                );
                setBookmarks(bookmarksWithSubscription);
              }
            } catch (subscribeError) {
              console.error("批量检查订阅状态失败:", subscribeError);
              // 如果订阅检查失败，默认设置为未订阅
              const bookmarksWithSubscription = bookmarksWithEndTime.map(
                (item) => ({
                  ...item,
                  isSubscribed: false,
                })
              );
              setBookmarks(bookmarksWithSubscription);
            }
          } else {
            setBookmarks(bookmarksWithEndTime);
          }
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
    // modal.confirm({
    //   title: "Are you sure you want to delete this bookmark?",
    //   icon: <DeleteOutlined />,
    //   content: "This action cannot be undone.",
    //   okText: "Delete",
    //   okType: "danger",
    //   cancelText: "Cancel",
    //   onOk: () => removeBookmark(objectId),
    // });
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

  const showSubscribeModal = (bookmark: Bookmark) => {
    const handleSubscribeSubmit = async (confirmPromise: {
      update: (config: { okButtonProps?: { loading?: boolean } }) => void;
    }) => {
      try {
        setIsSubmitLoading(true);
        confirmPromise.update({
          okButtonProps: {
            loading: true,
          },
        });
        let response = null;
        if (bookmark.isSubscribed) {
          response = await fetch(`/api/subscribe?id=${bookmark.subscribeId}`, {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
          });
        } else {
          const endTime = await calculateEndTime(
            bookmark.end_epoch || 0,
            bookmark.net_type || "testnet"
          );
          response = await fetch("/api/subscribe", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              bookmark_id: bookmark.id,
              user_id: user?.id,
              user_email: user?.email,
              advance_day: 3,
              end_time: new Date(endTime),
            }),
          });
        }

        if (!response.ok) {
          if (bookmark.isSubscribed) {
            throw new Error("Failed to unsubscribe");
          } else {
            throw new Error("Failed to subscribe");
          } 
        }

        messageApi.success(bookmark.isSubscribed ? "Unsubscribed successfully" : "Subscribed successfully");
        fetchBookmarks();
      } catch {
        messageApi.error(bookmark.isSubscribed ? "Failed to unsubscribe" : "Failed to subscribe");
      } finally {
        setIsSubmitLoading(false);
      }
    };

    const content = bookmark.isSubscribed
      ? "Are you sure you want to unsubscribe?"
      : "After subscribing, you will receive an email notification 3 days before the blob file expires. Do you want to continue?";
    const confirmPromise = modal.confirm({
      title: "Subscribe end time",
      icon: <TagOutlined />,
      content,
      okText: bookmark.isSubscribed ? "Unsubscribe" : "Subscribe",
      okType: "primary",
      cancelText: "Cancel",
      okButtonProps: {
        loading: isSubmitLoading,
      },
      onOk: () => handleSubscribeSubmit(confirmPromise),
    });
  };

  const userRef = useRef(user);
  useEffect(() => {
    if (user && user.id !== userRef.current?.id) {
      fetchBookmarks();
      userRef.current = user;
    }
  }, [user, fetchBookmarks]);

  const handleExtend = (bookmark: Bookmark) => {
    setExtendingBookmark(bookmark);
    setExtendEpochs(1);
    setExtendModalVisible(true);
  };

  const handleExtendSubmit = async () => {
    if (!extendingBookmark || !extendingBookmark.object_id) return;

    if (!currentAccount) {
      messageApi.error("Please connect your wallet first");
      return;
    }

    try {
      setExtending(true);
      
      const network = extendingBookmark.net_type || "testnet";
      const packageConfig = network === "mainnet" 
        ? MAINNET_WALRUS_PACKAGE_CONFIG 
        : TESTNET_WALRUS_PACKAGE_CONFIG;
      
      const suiRpcUrl = network === "mainnet"
        ? "https://fullnode.mainnet.sui.io:443"
        : "https://fullnode.testnet.sui.io:443";

      const client = new WalrusClient({
        packageConfig,
        suiRpcUrl,
      });

      // Fetch Blob Object to get size
      const rpc = new SuiClient({ url: suiRpcUrl });
      const blobObj = await rpc.getObject({
        id: extendingBookmark.object_id,
        options: { showContent: true }
      });
      
      if (blobObj.error || !blobObj.data || !blobObj.data.content) {
        throw new Error("Failed to fetch blob object");
      }
      
      const content = blobObj.data.content as any;
      const storage = content.fields.storage;
      const storageSize = Number(storage.fields.storage_size);
      
      // Calculate Cost
      const { storageCost } = await client.storageCost(storageSize, extendEpochs);
      
      // Get Package ID from System Object
      const systemObj = await client.systemObject();
      const packageId = systemObj.package_id;
      // const walType = `${packageId}::wal::WAL`;
      const walPackageId = network === "mainnet"
        ? process.env.NEXT_PUBLIC_WAL_COIN_PACKAGE_ID_MAIN
        : process.env.NEXT_PUBLIC_WAL_COIN_PACKAGE_ID_TEST;
      const walType = `${walPackageId}::wal::WAL`
      
      // Build Transaction
      const tx = new Transaction();
      tx.setSender(currentAccount.address);
      
      // Create a WAL coin with exact balance
      const paymentCoin = tx.add(
        coinWithBalance({
          balance: storageCost,
          type: walType,
        })
      );
      
      // Call extend_blob
      tx.moveCall({
        target: `${packageId}::system::extend_blob`,
        arguments: [
          tx.object(packageConfig.systemObjectId),
          tx.object(extendingBookmark.object_id),
          tx.pure.u32(extendEpochs),
          paymentCoin
        ]
      });
      
      // Transfer the coin back to sender (in case extend_blob didn't consume it fully or returns it)
      // Note: if extend_blob consumes it, this might fail or be ignored.
      // But since the previous error was destroy_zero failing, it means the coin WAS NOT fully consumed.
      // So we transfer it back.
      tx.transferObjects([paymentCoin], currentAccount.address);

      signAndExecuteTransaction(
        {
          transaction: tx as any,
        },
        {
          onSuccess: async (result) => {
            messageApi.success(`Successfully extended blob validity by ${extendEpochs} epochs`);
            
            try {
              // Wait 3 seconds for the chain to update
              await new Promise((resolve) => setTimeout(resolve, 3000));

              // Get updated object to sync with DB
              const updatedBlobObj = await rpc.getObject({
                id: extendingBookmark.object_id,
                options: { showContent: true }
              });

              if (updatedBlobObj.data?.content) {
                const content = updatedBlobObj.data.content as any;
                // Verify structure and extract end_epoch
                const storage = content.fields.storage;
                if (storage && storage.fields && storage.fields.end_epoch) {
                  const newEndEpoch = Number(storage.fields.end_epoch);
                  
                  // Update bookmark in DB
                  await fetch("/api/bookmark", {
                    method: "PUT",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      id: extendingBookmark.id,
                      object_id: extendingBookmark.object_id,
                      endEpoch: newEndEpoch,
                    }),
                  });
                }
              }
            } catch (err) {
              console.error("Failed to sync bookmark update:", err);
            } finally {
              setExtending(false);
            }

            setExtendModalVisible(false);
            setExtendingBookmark(null);
            fetchBookmarks();
          },
          onError: (error) => {
            console.error("Transaction failed:", error);
            messageApi.error(`Transaction failed: ${error.message}`);
            setExtending(false);
          },
        }
      );
    } catch (error: any) {
      console.error("Failed to extend blob:", error);
      messageApi.error(`Failed to extend blob: ${error.message}`);
      setExtending(false);
    } finally {
      
    }
  };

  const columns: ColumnsType<Bookmark> = [
    {
      title: "Object ID",
      dataIndex: "object_id",
      key: "object_id",
      ellipsis: true,
      render: (text: string, record: Bookmark) => (
        <div>
          <Badge
            variant={record.net_type === "mainnet" ? "default" : "secondary"}
            className="text-xs"
          >
            {record.net_type === "mainnet" ? "Mainnet" : "Testnet"}
          </Badge>
          <AddressDisplay
            address={text}
            network={record.net_type || "testnet"}
          />
        </div>
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
      render: (text?: number) => (
        <div>
          {text}
          <Tag
            color={
              text && new Date(text).getTime() > new Date().getTime()
                ? "green"
                : "red"
            }
            className="ml-2"
          >
            {text && new Date(text).getTime() < new Date().getTime()
              ? "Expired"
              : "Valid"}
          </Tag>
        </div>
      ),
    },
    {
      title: "Remark",
      dataIndex: "remark",
      key: "remark",
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
      render: (text: string) => (
        <Tooltip title={new Date(text).toLocaleString()}>
          {formatDistanceToNow(new Date(text), { addSuffix: true })}
        </Tooltip>
      ),
    },
    // {
    //   title: "Subscription",
    //   key: "subscription",
    //   width: 100,
    //   render: (_: string, record: Bookmark) => (
    //     <div className="text-center">
    //       {record.isSubscribed ? (
    //         <Tooltip title="You are subscribed to this bookmark">
    //           <Tag color="green" icon={<CheckCircleOutlined />}>
    //             Subscribed
    //           </Tag>
    //         </Tooltip>
    //       ) : (
    //         <Tooltip title="Click the tag icon to subscribe">
    //           <Tag color="default">Not Subscribed</Tag>
    //         </Tooltip>
    //       )}
    //     </div>
    //   ),
    // },
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
          <Tooltip
            title={
              record.isSubscribed
                ? "You are subscribed to this bookmark, click to unsubscribe"
                : "Click the tag icon to subscribe"
            }
            className="relative"
          >
            <Button
              type="text"
              icon={<TagOutlined />}
              onClick={() => showSubscribeModal(record)}
              title="Subscribe end time"
            />
            {record.isSubscribed && (
              // <AntdIcon.CheckCircle className="absolute top-0 right-0 text-green-500" />
              <CheckCircleOutlined className="absolute top-0 right-0 text-green-500" />
            )}
          </Tooltip>
          <Tooltip
            title="Extend blob end epoch"
            className="relative"
          >
            <Button
              type="text"
              icon={<PlusSquareOutlined />}
              onClick={() => handleExtend(record)}
              title="Subscribe end time"
            />
          </Tooltip>
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
          <Table
            columns={columns}
            dataSource={bookmarks}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              pageSizeOptions: ["10", "20", "50"],
            }}
            scroll={{ x: true }}
          />
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

      <Modal
        open={extendModalVisible}
        title="Extend Blob Validity"
        onCancel={() => {
          setExtendModalVisible(false);
          setExtendingBookmark(null);
        }}
        footer={[
          <Button key="back" onClick={() => {
            setExtendModalVisible(false);
            setExtendingBookmark(null);
          }}
            disabled={extending}
          >
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={extending}
            onClick={handleExtendSubmit}
          >
            Confirm
          </Button>,
        ]}
      >
        <div className="py-4">
          <p className="mb-4 text-gray-600">
            Extend the validity of blob: <span className="font-mono text-xs bg-gray-100 p-1 rounded">{extendingBookmark?.object_id}</span>
          </p>
          <Form layout="vertical">
            <Form.Item label="Extension Epochs (1-53)" required>
              <InputNumber
                min={1}
                max={53}
                value={extendEpochs}
                onChange={(value) => setExtendEpochs(value || 1)}
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-2">
                Specify how many epochs to extend the blob's validity. One epoch is approximately 1 day.
              </p>
            </Form.Item>
          </Form>
        </div>
      </Modal>
      {modalContextHolder}
      {messageContextHolder}
    </div>
  );
}
