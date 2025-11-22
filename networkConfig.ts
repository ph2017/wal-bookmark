import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { createNetworkConfig } from "@mysten/dapp-kit";

type Network = "mainnet" | "testnet" | "devnet" | "localnet";

const network = (process.env.NEXT_PUBLIC_NETWORK as Network) || "testnet";
// const network = "testnet";

const { networkConfig, useNetworkVariable, useNetworkVariables } = createNetworkConfig<{
    testnet: { url: string; variables: { validator: string; walrusBlobType: string } };
    mainnet: { url: string; variables: { walrusBlobType: string } };
    devnet: { url: string; variables: {} };
    localnet: { url: string; variables: {} };
}>({
    testnet: {
        url: getFullnodeUrl("testnet"),
        variables: {
            validator:"0x6d6e9f9d3d81562a0f9b767594286c69c21fea741b1c2303c5b7696d6c63618a",
            walrusBlobType: '0xd84704c17fc870b8764832c535aa6b11f21a95cd6f5bb38a9b07d2cf42220c66::blob::Blob'
        },
    },
    mainnet: {
        url: getFullnodeUrl("mainnet"),
        variables: {
            walrusBlobType: '0xfdc88f7d7cf30afab2f82e8380d11ee8f70efb90e863d1de8616fae1bb09ea77::blob::Blob'
        },
    },
    devnet: {
        url: getFullnodeUrl("devnet"),
        variables: {},
    },
    localnet: {
        url: getFullnodeUrl("localnet"),
        variables: {},
    },
});

// 创建全局 SuiClient 实例
const suiClient = new SuiClient({ url: networkConfig[network].url });

export { useNetworkVariable, useNetworkVariables, networkConfig, network, suiClient };
