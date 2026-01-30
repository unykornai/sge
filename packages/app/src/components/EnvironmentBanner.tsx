import { useEffect, useState } from 'react';

interface HealthStatus {
  ok: boolean;
  chainId: number;
  blockNumber: number;
  mode: 'mock' | 'mainnet';
  relayerBalance?: string;
  featureGates?: {
    kycRequired: boolean;
    commerceRequired: boolean;
    mockMode: boolean;
  };
}

export default function EnvironmentBanner() {
  const [health, setHealth] = useState<HealthStatus | null>(null);

  useEffect(() => {
    fetch('/api/healthz')
      .then(res => res.json())
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  const isMockMode = health?.mode === 'mock' || health?.featureGates?.mockMode;

  return (
    <div className={`env-banner ${isMockMode ? 'demo' : 'mainnet'}`}>
      {isMockMode ? (
        <>🔧 DEMO MODE — Mock data, no real transactions</>
      ) : (
        <>🟢 MAINNET LIVE — Real Ethereum transactions</>
      )}
    </div>
  );
}
