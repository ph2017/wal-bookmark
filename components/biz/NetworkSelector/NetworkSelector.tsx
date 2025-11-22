'use client'

import { useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type Network = 'testnet' | 'mainnet' | 'devnet' | 'localnet'

interface NetworkSelectorProps {
  onNetworkChange?: (network: Network) => void
  className?: string
}

export function NetworkSelector({ onNetworkChange, className }: NetworkSelectorProps) {
  const [currentNetwork, setCurrentNetwork] = useState<Network>('testnet')

  useEffect(() => {
    // 从 localStorage 获取保存的网络设置
    const savedNetwork = localStorage.getItem('selectedNetwork') as Network
    if (savedNetwork && ['testnet', 'mainnet', 'devnet', 'localnet'].includes(savedNetwork)) {
      setCurrentNetwork(savedNetwork)
      onNetworkChange?.(savedNetwork)
    }
  }, [])

  const handleNetworkChange = (network: Network) => {
    setCurrentNetwork(network)
    localStorage.setItem('selectedNetwork', network)
    onNetworkChange?.(network)
    
    // 触发自定义事件，让其他组件可以监听网络变化
    window.dispatchEvent(new CustomEvent('networkChanged', { detail: { network } }))
  }

  return (
    <Select value={currentNetwork} onValueChange={handleNetworkChange}>
      <SelectTrigger className={`w-32 ${className || ''}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="testnet">Testnet</SelectItem>
        <SelectItem value="mainnet">Mainnet</SelectItem>
        {/* <SelectItem value="devnet">Devnet</SelectItem>
        <SelectItem value="localnet">Localnet</SelectItem> */}
      </SelectContent>
    </Select>
  )
}