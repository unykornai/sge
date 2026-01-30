import { useEffect, useState } from 'react';

interface SystemStatus {
  network: { ok: boolean; chainId: number };
  relayer: { ok: boolean; balance?: string; lowBalance?: boolean };
  rpc: { ok: boolean; blockNumber?: number };
  contract: { ok: boolean };
}

export default function StatusStrip() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/healthz');
        const data = await res.json();
        
        setStatus({
          network: { ok: data.chainId === 1, chainId: data.chainId || 1 },
          relayer: { 
            ok: true, 
            balance: data.relayerBalance,
            lowBalance: data.relayerLowBalance 
          },
          rpc: { ok: data.ok, blockNumber: data.blockNumber },
          contract: { ok: true }
        });
      } catch {
        setStatus({
          network: { ok: false, chainId: 0 },
          relayer: { ok: false },
          rpc: { ok: false },
          contract: { ok: false }
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="status-strip">
        <div className="status-item">
          <span className="spinner spinner-sm" />
          <span className="status-label">Loading status...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="status-strip">
      <div className="status-item">
        <span className={`status-dot ${status?.network.ok ? 'online' : 'offline'}`} />
        <span className="status-label">Network:</span>
        <span className="status-value">
          {status?.network.ok ? 'Mainnet (1)' : 'Offline'}
        </span>
      </div>
      
      <div className="status-item">
        <span className={`status-dot ${status?.relayer.ok ? (status.relayer.lowBalance ? 'warning' : 'online') : 'offline'}`} />
        <span className="status-label">Relayer:</span>
        <span className="status-value">
          {status?.relayer.ok ? (status.relayer.lowBalance ? 'Low ⚠️' : 'Online') : 'Offline'}
        </span>
      </div>
      
      <div className="status-item">
        <span className={`status-dot ${status?.rpc.ok ? 'online' : 'offline'}`} />
        <span className="status-label">RPC:</span>
        <span className="status-value">
          {status?.rpc.ok ? 'Healthy' : 'Unhealthy'}
        </span>
      </div>
      
      <div className="status-item">
        <span className={`status-dot ${status?.contract.ok ? 'online' : 'offline'}`} />
        <span className="status-label">Contract:</span>
        <span className="status-value">
          {status?.contract.ok ? 'Reachable' : 'Unreachable'}
        </span>
      </div>
      
      {status?.rpc.blockNumber && (
        <div className="status-item">
          <span className="status-label">Block:</span>
          <span className="status-value">
            #{status.rpc.blockNumber.toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
}
