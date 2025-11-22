'use client';

import { useCallback, useEffect, useState } from 'react';
import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { getFullnodeUrl } from "@mysten/sui/client";
import { walrus } from '@mysten/walrus';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Descriptions } from 'antd';
import { RefreshCw } from 'lucide-react';
import { useNetwork } from '@/components/provider/network-context';

interface EpochInfo {
  currentEpoch: number;
  committee: {
    epoch: number;
    n_shards: number;
  };
  totalShards: number;
  epochStartTime: number;
  epochEndTime: number;
  epochDuration: number;
  loading: boolean;
  error: string | null;
}

interface WalrusEpochInfoProps {
  onEpochChange?: (epoch: number) => void;
  onNetworkChange?: (network: 'testnet' | 'mainnet') => void;
}

interface NetworkConfig {
  type: 'testnet' | 'mainnet';
  epochDuration: number; // in seconds
  epoch1StartTimestamp?: number; // Unix timestamp for mainnet epoch 1 start
}

const NETWORK_CONFIGS: Record<string, NetworkConfig> = {
  testnet: {
    type: 'testnet',
    epochDuration: 24 * 60 * 60, // 1 day in seconds
  },
  mainnet: {
    type: 'mainnet',
    epochDuration: 14 * 24 * 60 * 60, // 14 days in seconds
    epoch1StartTimestamp: 1742865600, // March 25, 2025 12:00:00 UTC
  },
};

export function WalrusEpochInfo({ onEpochChange, onNetworkChange }: WalrusEpochInfoProps) {
  const { currentNetwork } = useNetwork();
  const [epochInfo, setEpochInfo] = useState<EpochInfo>({
    currentEpoch: 0,
    committee: { epoch: 0, n_shards: 0 },
    totalShards: 0,
    epochStartTime: 0,
    epochEndTime: 0,
    epochDuration: 0,
    loading: true,
    error: null,
  });
  
  // Network configuration - now uses currentNetwork from context
  const networkType = currentNetwork === 'mainnet' ? 'mainnet' : 'testnet';
  const networkConfig = NETWORK_CONFIGS[networkType];
  
  // Timer to update time remaining
  useEffect(() => {
    const timer = setInterval(() => {
      setEpochInfo(prev => ({ ...prev }));
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  const fetchEpochInfo = useCallback(async () => {
    setEpochInfo((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // Create Walrus client
      const client = new SuiJsonRpcClient({
        url: getFullnodeUrl(networkType),
        network: networkType,
      }).$extend(walrus());

      // Get system state which includes epoch information
      const systemState = await client.walrus.systemState();

      const currentTime = Math.floor(Date.now() / 1000);
      let epochStartTime: number;
      let epochEndTime: number;

      if (networkConfig.type === "testnet") {
        // Testnet: Calculate current epoch start time based on current time
        // Assume epoch boundaries align with UTC day boundaries for simplicity
        const currentEpochStartTime =
          currentTime - (currentTime % networkConfig.epochDuration);
        epochStartTime = currentEpochStartTime;
        epochEndTime = epochStartTime + networkConfig.epochDuration;
      } else {
        // Mainnet: Calculate based on epoch 1 start timestamp
        const epoch1Start = networkConfig.epoch1StartTimestamp!;
        const epochsSinceStart = systemState.committee.epoch - 1;
        epochStartTime =
          epoch1Start + epochsSinceStart * networkConfig.epochDuration;
        epochEndTime = epochStartTime + networkConfig.epochDuration;
      }

      setEpochInfo({
        currentEpoch: systemState.committee.epoch,
        committee: systemState.committee,
        totalShards: systemState.committee.n_shards,
        epochStartTime,
        epochEndTime,
        epochDuration: networkConfig.epochDuration,
        loading: false,
        error: null,
      });

      // 调用回调函数通知父组件当前epoch变化
      if (onEpochChange) {
        onEpochChange(systemState.committee.epoch);
      }

      // 调用回调函数通知父组件网络类型
      if (onNetworkChange) {
        onNetworkChange(networkConfig.type);
      }

      console.log("systemState", systemState);
      console.log("Epoch timing calculated:", {
        network: networkConfig.type,
        epoch: systemState.committee.epoch,
        epochStartTime: new Date(epochStartTime * 1000).toISOString(),
        epochEndTime: new Date(epochEndTime * 1000).toISOString(),
        epochDuration: networkConfig.epochDuration,
        currentTime: new Date(currentTime * 1000).toISOString(),
      });
    } catch (error) {
      console.error("Error fetching Walrus epochs:", error);
      setEpochInfo((prev) => ({
        ...prev,
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch epoch info",
      }));
    }
  }, [networkType, networkConfig, onEpochChange, onNetworkChange]);

  useEffect(() => {
    fetchEpochInfo();
  }, [currentNetwork, fetchEpochInfo]); // 当网络变化时重新获取数据

  if (epochInfo.loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Walrus Epoch Information</CardTitle>
          <CardDescription>Loading current epoch data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (epochInfo.error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Walrus Epoch Information</CardTitle>
          <CardDescription>Error loading epoch data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-red-500">{epochInfo.error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CardTitle>Walrus Epoch Information</CardTitle>
              <Badge variant={networkType === 'mainnet' ? 'default' : 'secondary'} className="text-xs">
                {networkType === 'mainnet' ? 'Mainnet' : 'Testnet'}
              </Badge>
            </div>
            <CardDescription>Current system state on Walrus {networkConfig.type === 'testnet' ? 'Testnet' : 'Mainnet'}</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchEpochInfo}
            disabled={epochInfo.loading}
            className="ml-4"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${epochInfo.loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Descriptions bordered column={4} size="middle">
          <Descriptions.Item label="Current Epoch">
            <Badge variant="outline">{epochInfo.currentEpoch}</Badge>
          </Descriptions.Item>
          <Descriptions.Item label="Total Shards">
            <Badge variant="outline">{epochInfo.totalShards}</Badge>
          </Descriptions.Item>
          <Descriptions.Item label="Epoch Duration">
            <Badge variant="outline">
              {networkConfig.type === 'testnet' 
                ? `${epochInfo.epochDuration / (60 * 60)} hours` 
                : `${epochInfo.epochDuration / (24 * 60 * 60)} days`
              }
            </Badge>
          </Descriptions.Item>
          <Descriptions.Item label="Time Remaining">
            <Badge variant="outline">
              {Math.max(0, Math.floor((epochInfo.epochEndTime - Date.now() / 1000) / 3600))}h
              {Math.max(0, Math.floor(((epochInfo.epochEndTime - Date.now() / 1000) % 3600) / 60))}m
            </Badge>
          </Descriptions.Item>
          <Descriptions.Item label="Epoch Start Time" span={2}>
            <Badge variant="secondary">
              {new Date(epochInfo.epochStartTime * 1000).toISOString().replace('T', ' ').slice(0, -5)} UTC
            </Badge>
          </Descriptions.Item>
          <Descriptions.Item label="Epoch End Time" span={2}>
            <Badge variant="secondary">
              {new Date(epochInfo.epochEndTime * 1000).toISOString().replace('T', ' ').slice(0, -5)} UTC
            </Badge>
          </Descriptions.Item>
        </Descriptions>
      </CardContent>
    </Card>
  );
}