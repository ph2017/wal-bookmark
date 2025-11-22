import { Suspense } from 'react';
import { WalrusEpochInfo } from '@/components/walrus/WalrusEpochInfo';

export default function WalrusEpochsPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Walrus Epoch Information</h1>
        <p className="text-muted-foreground mb-8">
          Current epoch and committee information from the Walrus decentralized storage network.
        </p>
        
        <Suspense fallback={<div>Loading epoch information...</div>}>
          <WalrusEpochInfo />
        </Suspense>
        
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">What are Epochs?</h3>
          <p className="text-blue-800 text-sm">
            In Walrus, epochs are time periods during which the committee of storage nodes remains 
            constant. Each epoch has a specific set of storage nodes responsible for storing and 
            serving data. Epoch changes occur periodically to ensure network health and decentralization.
          </p>
        </div>
      </div>
    </div>
  );
}