import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { getFullnodeUrl } from "@mysten/sui/client";
import { walrus } from "@mysten/walrus";

export interface WalrusEpochData {
  epoch: number;
  committee: any;
  n_shards: number;
  systemState: any;
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
    committeeMembers: epochData.committee?.voting_power
      ? Object.keys(epochData.committee.voting_power).length
      : 0,
    committee: epochData.committee,
  };
}