"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type Network = 'testnet' | 'mainnet' | 'devnet' | 'localnet'

interface NetworkContextType {
  currentNetwork: Network
  setCurrentNetwork: (network: Network) => void
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined)

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [currentNetwork, setCurrentNetwork] = useState<Network>('testnet')

  useEffect(() => {
    // Load saved network from localStorage
    const savedNetwork = localStorage.getItem('selectedNetwork') as Network
    if (savedNetwork && ['testnet', 'mainnet', 'devnet', 'localnet'].includes(savedNetwork)) {
      setCurrentNetwork(savedNetwork)
    } else {
      // Use default network if none saved
      const defaultNetwork = (process.env.NEXT_PUBLIC_NETWORK as Network) || 'testnet'
      setCurrentNetwork(defaultNetwork)
    }

    // Listen for network change events
    const handleNetworkChange = (event: CustomEvent) => {
      const newNetwork = event.detail.network as Network
      if (['testnet', 'mainnet', 'devnet', 'localnet'].includes(newNetwork)) {
        setCurrentNetwork(newNetwork)
      }
    }

    window.addEventListener('networkChanged', handleNetworkChange as EventListener)

    return () => {
      window.removeEventListener('networkChanged', handleNetworkChange as EventListener)
    }
  }, [])

  return (
    <NetworkContext.Provider value={{ currentNetwork, setCurrentNetwork }}>
      {children}
    </NetworkContext.Provider>
  )
}

export function useNetwork() {
  const context = useContext(NetworkContext)
  if (context === undefined) {
    throw new Error('useNetwork must be used within a NetworkProvider')
  }
  return context
}