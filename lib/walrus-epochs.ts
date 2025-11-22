import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { getFullnodeUrl } from "@mysten/sui/client";
import { walrus } from "@mysten/walrus";

interface CommitteeMember {
  public_key: { bytes: number[] };
  weight: number;
  node_id: string;
}

interface Committee {
  members: CommitteeMember[];
  n_shards: number;
  epoch: number;
  total_aggregated_key: { bytes: number[] };
}

interface SystemState {
  committee: Committee;
  total_capacity_size: string;
  used_capacity_size: string;
  staked_capacity_size?: string;
  allocated_capacity_size?: string;
  current_epoch_reward?: string;
  deny_list_object_id?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deny_list_sizes?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface WalrusEpochData {
  epoch: number;
  committee: Committee;
  n_shards: number;
  systemState: SystemState;
}

export async function getWalrusEpochs(
  network: "testnet" | "mainnet" = "testnet"
): Promise<WalrusEpochData> {
  try {
    // Create a client with Walrus extension
    const client = new SuiJsonRpcClient({
      url: getFullnodeUrl(network),
      network: network,
    }).$extend(walrus());

    // Get system state which includes epoch information
    const systemState = await client.walrus.systemState();

    return {
      epoch: systemState.committee.epoch,
      committee: systemState.committee,
      n_shards: systemState.committee.n_shards,
      systemState: systemState,
    };
  } catch (error) {
    console.error("Error fetching Walrus epochs:", error);
    throw error;
  }
}

// Function to get current epoch number only
export async function getCurrentEpoch(
  network: "testnet" | "mainnet" = "testnet"
): Promise<number> {
  const epochData = await getWalrusEpochs(network);
  return epochData.epoch;
}

// Function to get detailed epoch and committee information
export async function getEpochCommitteeInfo(
  network: "testnet" | "mainnet" = "testnet"
) {
  const epochData = await getWalrusEpochs(network);

  return {
    currentEpoch: epochData.epoch,
    totalShards: epochData.n_shards,
    committeeMembers: epochData.committee?.members?.length || 0,
    committee: epochData.committee,
  };
}