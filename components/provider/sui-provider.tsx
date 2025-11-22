"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { SuiClientProvider, WalletProvider } from "@mysten/dapp-kit"
import { networkConfig } from "../../networkConfig"
import { NetworkProvider, useNetwork } from "./network-context"
import "@mysten/dapp-kit/dist/index.css"

const queryClient = new QueryClient()

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <NetworkProvider>
        <SuiClientProviderWithNetwork>
          <WalletProvider>{children}</WalletProvider>
        </SuiClientProviderWithNetwork>
      </NetworkProvider>
    </QueryClientProvider>
  )
}

function SuiClientProviderWithNetwork({ children }: { children: React.ReactNode }) {
  const { currentNetwork } = useNetwork()
  return (
    <SuiClientProvider networks={networkConfig} defaultNetwork={currentNetwork}>
      {children}
    </SuiClientProvider>
  )
}
