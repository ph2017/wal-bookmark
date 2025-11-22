"use client";
import { AppHeader } from "@/components/biz/AppHeader";
import { useNetworkVariable } from "@/networkConfig";
import { useSuiClient } from "@mysten/dapp-kit";
import {
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  Spin,
  Tag,
  Tooltip,
  App,
} from "antd";
import { StarOutlined, StarFilled, StarTwoTone } from "@ant-design/icons";
import { useState } from "react";
import { WalrusEpochInfo } from "@/components/walrus/WalrusEpochInfo";

function BlobPageContent() {
  const { message } = App.useApp();
  const walrusBlobType = useNetworkVariable("walrusBlobType");
  const client = useSuiClient();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [blobData, setBlobData] = useState<any>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [currentEpoch, setCurrentEpoch] = useState<number>(0);
  const [networkType, setNetworkType] = useState<'testnet' | 'mainnet'>('testnet');

  // 格式化文件大小为可读性强的格式
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 计算过期时间
  const calculateEndTime = (endEpoch: number): string => {
    if (!endEpoch) return 'N/A';
    
    // 网络配置常量
    const NETWORK_CONFIGS = {
      testnet: {
        epochDuration: 24 * 60 * 60, // 1天
        epoch1StartTimestamp: Math.floor(Date.now() / 1000) - (24 * 60 * 60), // 假设测试网epoch 1从昨天开始
      },
      mainnet: {
        epochDuration: 14 * 24 * 60 * 60, // 14天
        epoch1StartTimestamp: 1742865600, // March 25, 2025 12:00:00 UTC
      },
    };
    
    const config = NETWORK_CONFIGS[networkType];
    
    if (networkType === 'testnet') {
      // 测试网：基于当前时间计算epoch边界（UTC天边界）
      const currentTime = Math.floor(Date.now() / 1000);
      const currentEpochStartTime = currentTime - (currentTime % config.epochDuration);
      const targetEpochStartTime = currentEpochStartTime + ((endEpoch - currentEpoch - 1) * config.epochDuration);
      const endTime = new Date(targetEpochStartTime * 1000);
      return endTime.toISOString().replace('T', ' ').slice(0, -5) + ' UTC';
    } else {
      // 主网：基于epoch 1开始时间计算
      const epochsSinceStart = endEpoch - 1;
      const epochStartTime = config.epoch1StartTimestamp + (epochsSinceStart * config.epochDuration);
      const endTime = new Date(epochStartTime * 1000);
      return endTime.toISOString().replace('T', ' ').slice(0, -5) + ' UTC';
    }
  };

  const onFinish = async (values: { objectId: string }) => {
    setLoading(true);
    setBlobData(null);
    try {
      const object = await client.getObject({
        id: values.objectId,
        options: { showContent: true, showType: true },
      });

      if (object.data?.type !== walrusBlobType) {
        message.error("Not a valid walrus blob object");
        return;
      }
      form.setFieldsValue({ objectId: '' });
      setBlobData(object.data?.content);
    } catch (error) {
      message.error("Failed to fetch blob data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[95vh] flex flex-col overflow-hidden">
      <AppHeader breadcrumbs={[{ label: "Blob Viewer" }]} className="" />
      <div className="flex-1 overflow-auto px-4 py-2 box-border">
        <div className="mb-4">
          <WalrusEpochInfo onEpochChange={setCurrentEpoch} onNetworkChange={setNetworkType} />
        </div>
        <Card title="Search Sui object then add to bookmark">
          <Form form={form} onFinish={onFinish} layout="inline">
            <Form.Item
              label="Sui Object ID"
              name="objectId"
              rules={[
                { required: true, message: "Please input the object ID" },
              ]}
            >
              <Input placeholder="Enter Sui Object ID" className="w-[500px]" allowClear/>
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading}>
                Search
              </Button>
            </Form.Item>
          </Form>
        </Card>

        {loading && (
          <div className="text-center mt-4">
            <Spin size="large" />
          </div>
        )}

        {blobData && (
          <Card className="mt-4" title="Blob Object Details">
            <Descriptions bordered column={2}>
              <Descriptions.Item label="Object ID">
                <div className="flex items-center gap-2">
                  <span>{blobData.fields?.id?.id}</span>
                  {!isBookmarked && (
                    <Tooltip title="Add to Bookmark">
                      <StarOutlined
                        className="text-yellow-500"
                        style={{ fontSize: 24, cursor: "pointer" }}
                        onClick={() => setIsBookmarked(true)}
                      />
                    </Tooltip>
                  )}
                  {isBookmarked && (
                    <Tooltip title="Remove Bookmark">
                      <StarFilled
                        className="text-yellow-500"
                        style={{ fontSize: 24, cursor: "pointer" }}
                        onClick={() => setIsBookmarked(false)}
                      />
                    </Tooltip>
                  )}
                </div>
              </Descriptions.Item>
              <Descriptions.Item label="Type">
                <Tag color="blue">{blobData.type}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Size">
                <div className="flex items-center gap-2">
                  <span>{formatFileSize(blobData.fields?.size)}</span>
                  <span className="text-gray-500 text-sm">({blobData.fields?.size.toLocaleString()} bytes)</span>
                </div>
              </Descriptions.Item>
              <Descriptions.Item label="Blob ID">
                {blobData.fields?.blob_id}
              </Descriptions.Item>
              {/* <Descriptions.Item label="Encoding Type">
                {blobData.fields?.encoding_type}
              </Descriptions.Item> */}
              <Descriptions.Item label="Registered Epoch">
                {blobData.fields?.registered_epoch}
              </Descriptions.Item>
              <Descriptions.Item label="Certified Epoch">
                {blobData.fields?.certified_epoch}
              </Descriptions.Item>
              <Descriptions.Item label="Start Epoch">
                {blobData.fields?.storage?.fields?.start_epoch}
              </Descriptions.Item>
              <Descriptions.Item label="End Epoch">
                {blobData.fields?.storage?.fields?.end_epoch}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={currentEpoch < (blobData.fields?.storage?.fields?.end_epoch || 0) ? 'green' : 'red'}>
                  {currentEpoch < (blobData.fields?.storage?.fields?.end_epoch || 0) ? 'Valid' : 'Invalid'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="End Time">
                {calculateEndTime(blobData.fields?.storage?.fields?.end_epoch)}
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
          </Card>
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
