"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { CheckOutlined, CopyOutlined } from "@ant-design/icons";

interface AddressDisplayProps {
  address: string;
  network: "testnet" | "mainnet" | "devnet" | "localnet";
  isAccount?: boolean;
  isBlobId?: boolean;
  frontDisplayLength?: number;
  endDisplayLength?: number;
}

export function AddressDisplay({
  address,
  network,
  isAccount,
  isBlobId,
  frontDisplayLength = 12,
  endDisplayLength = 14,
}: AddressDisplayProps) {
  const [isCopied, setIsCopied] = useState(false);

  console.log('address', address);
  let formattedAddress = `${address?.slice(0, frontDisplayLength) || ''}...${address?.slice(-endDisplayLength) || ''}`;
  if (isBlobId) {
    formattedAddress = `${address?.slice(0, 5) || ''}...${address?.slice(-5) || ''}`;
  }
  let explorerUrl = `https://suiscan.xyz/${network}/object/${address}`;
  if (isAccount) {
    explorerUrl = `https://suiscan.xyz/${network}/account/${address}`;
  }
  if (isBlobId) {
    explorerUrl = `https://walruscan.com/${network}/blob/${address}`;
  }

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address).then(() => {
        setIsCopied(true);
        toast({
          title: "Copied!",
          description: "Address copied to clipboard.",
        });
        setTimeout(() => setIsCopied(false), 2000);
      });
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <a
        href={explorerUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500 hover:underline"
      >
        {formattedAddress}
      </a>
      <Button variant="ghost" size="sm" onClick={handleCopy}>
        {!isCopied ? (
          <CopyOutlined />
        ) : (
          <CheckOutlined />
        )}
      </Button>
    </div>
  );
}
