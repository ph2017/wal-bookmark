"use client";
import { AppHeader } from "@/components/biz/AppHeader";
import { AddressDisplay } from "@/components/biz/AddressDisplay";
import { networkConfig } from "@/networkConfig";
import { useSuiClient } from "@mysten/dapp-kit";
import {
  Button,
  Descriptions,
  Form,
  Input,
  Spin,
  Tag,
  Tooltip,
  App,
  Card as AntdCard,
} from "antd";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StarOutlined, StarFilled } from "@ant-design/icons";
import { useState } from "react";
import { WalrusEpochInfo } from "@/components/walrus/WalrusEpochInfo";
import { useNetwork } from "@/components/provider/network-context";

// 格式化文件大小为可读性强的格式
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

function BlobPageContent() {
  const { message } = App.useApp();
  const { currentNetwork } = useNetwork();
  // @ts-expect-error 网络配置中的变量类型需要动态访问
  const walrusBlobType = (networkConfig[currentNetwork]).variables.walrusBlobType;
  const client = useSuiClient();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [blobData, setBlobData] = useState<any>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [currentEpoch, setCurrentEpoch] = useState<number>(0);

  // 计算过期时间
  const calculateEndTime = (endEpoch: number): string => {
    if (!endEpoch) return "N/A";

    // 网络配置常量
    const NETWORK_CONFIGS = {
      testnet: {
        epochDuration: 24 * 60 * 60, // 1天
        epoch1StartTimestamp: Math.floor(Date.now() / 1000) - 24 * 60 * 60, // 假设测试网epoch 1从昨天开始
      },
      mainnet: {
        epochDuration: 14 * 24 * 60 * 60, // 14天
        epoch1StartTimestamp: 1742865600, // March 25, 2025 12:00:00 UTC
      },
      devnet: {
        epochDuration: 24 * 60 * 60, // 1天
        epoch1StartTimestamp: Math.floor(Date.now() / 1000) - 24 * 60 * 60, // 假设devnet epoch 1从昨天开始
      },
      localnet: {
        epochDuration: 24 * 60 * 60, // 1天
        epoch1StartTimestamp: Math.floor(Date.now() / 1000) - 24 * 60 * 60, // 假设localnet epoch 1从昨天开始
      },
    };

    const config = NETWORK_CONFIGS[currentNetwork];

    if (currentNetwork === "testnet") {
      // 测试网：基于当前时间计算epoch边界（UTC天边界）
      const currentTime = Math.floor(Date.now() / 1000);
      const currentEpochStartTime =
        currentTime - (currentTime % config.epochDuration);
      const targetEpochStartTime =
        currentEpochStartTime +
        (endEpoch - currentEpoch - 1) * config.epochDuration;
      const endTime = new Date(targetEpochStartTime * 1000);
      return endTime.toISOString().replace("T", " ").slice(0, -5) + " UTC";
    } else {
      // 主网：基于epoch 1开始时间计算
      const epochsSinceStart = endEpoch - 1;
      const epochStartTime =
        config.epoch1StartTimestamp + epochsSinceStart * config.epochDuration;
      const endTime = new Date(epochStartTime * 1000);
      return endTime.toISOString().replace("T", " ").slice(0, -5) + " UTC";
    }
  };

  const checkBookmarkStatus = async (objectId: string) => {
    try {
      const response = await fetch(`/api/bookmark?objectId=${objectId}`);
      if (response.ok) {
        const res = await response.json();
        debugger;
        setIsBookmarked(res.data?.data?.length > 0);
      }
    } catch (error) {
      console.error("Failed to check bookmark status:", error);
    }
  };

  const [isProcessing, setIsProcessing] = useState(false);
  const toggleBookmark = async () => {
    const objectId = blobData.objectId;
    if (!objectId) return;
    if (isProcessing) return;
    try {
      setIsProcessing(true);
      if (isBookmarked) {
        // Remove bookmark
        const response = await fetch(`/api/bookmark?objectId=${objectId}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          message.success("Bookmark removed successfully");
          setIsBookmarked(false);
        } else {
          message.error("Failed to remove bookmark");
        }
      } else {
        // Add bookmark
        const response = await fetch("/api/bookmark", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            objectId,
            walletAddress: blobData.owner?.AddressOwner,
            startEpoch: blobData.content?.fields?.storage?.fields?.start_epoch,
            endEpoch: blobData.content?.fields?.storage?.fields?.end_epoch,
            netType: currentNetwork,
          }),
        });

        if (response.ok) {
          message.success("Bookmark added successfully");
          setIsBookmarked(true);
        } else {
          message.error("Failed to add bookmark");
        }
      }
    } catch (error) {
      message.error("Failed to update bookmark");
      console.error("Failed to update bookmark:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const onFinish = async (values: { objectId: string }) => {
    setLoading(true);
    setBlobData(null);
    try {
      const object = await client.getObject({
        id: values.objectId,
        options: { showContent: true, showType: true, showOwner: true },
      });

      if (object.data?.type !== walrusBlobType) {
        message.error("Not a valid walrus blob object");
        return;
      }
      form.setFieldsValue({ objectId: "" });
      setBlobData(object.data);

      // Check if this object is bookmarked
      await checkBookmarkStatus(values.objectId);
    } catch (error) {
      message.error("Failed to fetch blob data");
      console.error("Failed to fetch blob data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[95vh] flex flex-col overflow-hidden">
      <AppHeader breadcrumbs={[{ label: "Blob Viewer" }]} className="" />
      <div className="flex-1 overflow-auto px-4 py-2 box-border">
        <div className="mb-4">
          <WalrusEpochInfo onEpochChange={setCurrentEpoch} />
        </div>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <CardTitle>Search Sui object then add to bookmark</CardTitle>
              {/* <CardDescription>Error loading epoch data</CardDescription> */}
              <Badge
                variant={currentNetwork === "mainnet" ? "default" : "secondary"}
                className="text-xs"
              >
                {currentNetwork === "mainnet" ? "Mainnet" : "Testnet"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Form form={form} onFinish={onFinish} layout="inline">
              <Form.Item
                label="Sui Object ID"
                name="objectId"
                rules={[
                  { required: true, message: "Please input the object ID" },
                ]}
              >
                <Input
                  placeholder="Enter Sui Object ID"
                  className="w-[500px]"
                  allowClear
                />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading}>
                  Search
                </Button>
              </Form.Item>
            </Form>
          </CardContent>
        </Card>

        {loading && (
          <div className="text-center mt-4">
            <Spin size="large" />
          </div>
        )}

        {blobData && (
          <AntdCard className="mt-4" title="Blob Object Details">
            <Descriptions bordered column={2}>
              <Descriptions.Item label="Object ID">
                <div className="flex items-center gap-2">
                  <AddressDisplay address={blobData.objectId || ''} network={currentNetwork} />
                  {!isBookmarked && (
                    <Tooltip title="Add to Bookmark">
                      <StarOutlined
                        className="text-yellow-500"
                        style={{ fontSize: 24, cursor: "pointer" }}
                        onClick={toggleBookmark}
                      />
                    </Tooltip>
                  )}
                  {isBookmarked && (
                    <Tooltip title="Remove Bookmark">
                      <StarFilled
                        className="text-yellow-500"
                        style={{ fontSize: 24, cursor: "pointer" }}
                        onClick={toggleBookmark}
                      />
                    </Tooltip>
                  )}
                </div>
              </Descriptions.Item>
              <Descriptions.Item label="Owner">
                {blobData.owner ? (
                  <AddressDisplay address={blobData.owner?.AddressOwner || ''} network={currentNetwork} />
                ) : (
                  <span className="text-gray-500">Unknown</span>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Type">
                <Tag color="blue">{blobData.content?.type}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Size">
                <div className="flex items-center gap-2">
                  <span>{formatFileSize(blobData.content?.fields?.size)}</span>
                  <span className="text-gray-500 text-sm">
                    ({blobData.content?.fields?.size.toLocaleString()} bytes)
                  </span>
                </div>
              </Descriptions.Item>
              {/* <Descriptions.Item label="Blob ID">
                <div className="flex items-center gap-2">
                  {blobData.content?.fields?.blob_id}
                </div>
              </Descriptions.Item> */}
              {/* <Descriptions.Item label="Encoding Type">
                {blobData.content?.fields?.encoding_type}
              </Descriptions.Item> */}
              <Descriptions.Item label="Registered Epoch">
                {blobData.content?.fields?.registered_epoch}
              </Descriptions.Item>
              <Descriptions.Item label="Certified Epoch">
                {blobData.content?.fields?.certified_epoch}
              </Descriptions.Item>
              <Descriptions.Item label="Start Epoch">
                {blobData.content?.fields?.storage?.fields?.start_epoch}
              </Descriptions.Item>
              <Descriptions.Item label="End Epoch">
                {blobData.content?.fields?.storage?.fields?.end_epoch}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag
                  color={
                    currentEpoch <
                    (blobData.content?.fields?.storage?.fields?.end_epoch || 0)
                      ? "green"
                      : "red"
                  }
                >
                  {currentEpoch <
                  (blobData.content?.fields?.storage?.fields?.end_epoch || 0)
                    ? "Valid"
                    : "Invalid"}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="End Time">
                {calculateEndTime(
                  blobData.content?.fields?.storage?.fields?.end_epoch
                )}
              </Descriptions.Item>
              {/* <Descriptions.Item label="Storage">
                {blobData.fields?.storage
                  ? JSON.stringify(blobData.fields.storage, null, 2)
                  : "N/A"}
              </Descriptions.Item>
              <Descriptions.Item label="Raw Content">
                <pre className="whitespace-pre-wrap text-xs">
                  {JSON.stringify(blobData, null, 2)}
                </pre>
              </Descriptions.Item> */}
            </Descriptions>
          </AntdCard>
        )}
      </div>
    </div>
  );
}

export default function BlobPage() {
  return (
    <App>
      <BlobPageContent />
    </App>
  );
}
