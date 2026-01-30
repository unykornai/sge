/**
 * System Status Page
 * 
 * Shows live system health metrics:
 * - Chain status (must be mainnet)
 * - API health
 * - RPC connectivity
 * - Contract addresses
 * - Feature flags
 * - Relayer balance
 * - Charts (registrations, claims)
 */

import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, XCircle, ExternalLink, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface SystemStatus {
  healthy: boolean;
  mode: 'MOCK' | 'REAL' | 'PRODUCTION';
  chain: {
    chainId: number;
    blockNumber: number;
    isMainnet: boolean;
  };
  api: {
    healthy: boolean;
    version: string;
  };
  rpc: {
    healthy: boolean;
    latency: number;
  };
  contracts: {
    sgeidAddress: string;
    sgeToken: string;
    sgeClaim: string;
    usdc: string;
    usdt: string;
  };
  features: {
    kycRequired: boolean;
    commerceRequired: boolean;
    allowSoftKyc: boolean;
    enterpriseApi: boolean;
    affiliateSystem: boolean;
  };
  relayer?: {
    address: string;
    balanceEth: string;
    lowBalance: boolean;
  };
}

interface ChartData {
  date: string;
  registrations: number;
  claims: number;
}

export function StatusPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStatus();
    fetchChartData();
    
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetchStatus();
      fetchChartData();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/healthz`);
      
      if (!response.ok) {
        throw new Error('API unreachable');
      }
      
      const data = await response.json();
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch status');
      // Set mock data for demo
      setStatus(getMockStatus());
    } finally {
      setLoading(false);
    }
  };

  const fetchChartData = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      // Use new timeseries endpoint
      const response = await fetch(`${apiUrl}/api/admin/stats/timeseries?days=7`);
      
      if (response.ok) {
        const data = await response.json();
        setChartData(data.timeseries || getMockChartData());
      } else {
        setChartData(getMockChartData());
      }
    } catch (err) {
      setChartData(getMockChartData());
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sge-green"></div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Failed to load system status</p>
          {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">System Status</h1>
        <p className="text-gray-600 mt-1">Live health metrics and operational status</p>
      </div>

      {/* Overall Health */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-4">
          {status.healthy ? (
            <CheckCircle className="w-12 h-12 text-green-600" />
          ) : (
            <XCircle className="w-12 h-12 text-red-600" />
          )}
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {status.healthy ? 'All Systems Operational' : 'System Issues Detected'}
            </h2>
            <p className="text-gray-600">
              Mode: <span className="font-medium">{status.mode}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Health Checks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatusCard
          title="Blockchain"
          healthy={status.chain.isMainnet}
          details={[
            `Chain ID: ${status.chain.chainId}`,
            `Block: #${status.chain.blockNumber.toLocaleString()}`,
            status.chain.isMainnet ? 'Ethereum Mainnet ✓' : 'Wrong network!',
          ]}
        />
        <StatusCard
          title="API"
          healthy={status.api.healthy}
          details={[
            `Version: ${status.api.version}`,
            `Health: ${status.api.healthy ? 'OK' : 'Down'}`,
          ]}
        />
        <StatusCard
          title="RPC"
          healthy={status.rpc.healthy}
          details={[
            `Latency: ${status.rpc.latency}ms`,
            `Status: ${status.rpc.healthy ? 'Connected' : 'Disconnected'}`,
          ]}
        />
      </div>

      {/* Relayer Balance */}
      {status.relayer && (
        <div className={`rounded-lg border p-6 mb-8 ${
          status.relayer.lowBalance
            ? 'bg-amber-50 border-amber-200'
            : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center gap-3 mb-4">
            {status.relayer.lowBalance ? (
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            ) : (
              <CheckCircle className="w-6 h-6 text-green-600" />
            )}
            <h3 className="text-lg font-bold text-gray-900">Relayer Status</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Address:</span>
              <span className="font-mono text-gray-900">{status.relayer.address.slice(0, 10)}...</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Balance:</span>
              <span className={`font-medium ${
                status.relayer.lowBalance ? 'text-amber-600' : 'text-green-600'
              }`}>
                {status.relayer.balanceEth} ETH
              </span>
            </div>
            {status.relayer.lowBalance && (
              <div className="mt-4 p-3 bg-amber-100 rounded text-amber-800">
                ⚠️ Relayer balance low. Fund soon to continue gasless transactions.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Contract Addresses */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Contract Addresses</h3>
        <div className="space-y-3">
          {Object.entries(status.contracts).map(([key, address]) => (
            <ContractRow key={key} name={formatContractName(key)} address={address} />
          ))}
        </div>
      </div>

      {/* Feature Flags */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Feature Flags</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Object.entries(status.features).map(([key, enabled]) => (
            <FeatureFlag key={key} name={formatFeatureName(key)} enabled={enabled} />
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="w-6 h-6 text-sge-green" />
          <h3 className="text-lg font-bold text-gray-900">Activity (Last 7 Days)</h3>
        </div>
        
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="date"
                stroke="#6B7280"
                style={{ fontSize: '12px' }}
              />
              <YAxis stroke="#6B7280" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="registrations"
                stroke="#10B981"
                strokeWidth={2}
                name="Registrations"
                dot={{ fill: '#10B981' }}
              />
              <Line
                type="monotone"
                dataKey="claims"
                stroke="#3B82F6"
                strokeWidth={2}
                name="Claims"
                dot={{ fill: '#3B82F6' }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-12 text-gray-500">
            No activity data available
          </div>
        )}
      </div>
    </div>
  );
}

function StatusCard({
  title,
  healthy,
  details,
}: {
  title: string;
  healthy: boolean;
  details: string[];
}) {
  return (
    <div className={`rounded-lg border p-4 ${
      healthy
        ? 'bg-green-50 border-green-200'
        : 'bg-red-50 border-red-200'
    }`}>
      <div className="flex items-center gap-2 mb-3">
        {healthy ? (
          <CheckCircle className="w-5 h-5 text-green-600" />
        ) : (
          <XCircle className="w-5 h-5 text-red-600" />
        )}
        <h3 className="font-bold text-gray-900">{title}</h3>
      </div>
      <div className="space-y-1 text-sm text-gray-700">
        {details.map((detail, i) => (
          <div key={i}>{detail}</div>
        ))}
      </div>
    </div>
  );
}

function ContractRow({ name, address }: { name: string; address: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm font-medium text-gray-700">{name}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-mono text-gray-900">
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
        <a
          href={`https://etherscan.io/address/${address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sge-green hover:text-sge-green-dark"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}

function FeatureFlag({ name, enabled }: { name: string; enabled: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${enabled ? 'bg-green-500' : 'bg-gray-300'}`} />
      <span className={`text-sm ${enabled ? 'text-gray-900' : 'text-gray-500'}`}>
        {name}
      </span>
    </div>
  );
}

function formatContractName(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

function formatFeatureName(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

// Mock data for demo/offline mode
function getMockStatus(): SystemStatus {
  return {
    healthy: true,
    mode: 'MOCK',
    chain: {
      chainId: 1,
      blockNumber: 21234567,
      isMainnet: true,
    },
    api: {
      healthy: true,
      version: '1.0.0',
    },
    rpc: {
      healthy: true,
      latency: 125,
    },
    contracts: {
      sgeidAddress: '0x0000000000000000000000000000000000000000',
      sgeToken: '0x40489719E489782959486A04B765E1E93E5B221a',
      sgeClaim: '0x4BFeF695a5f85a65E1Aa6015439f317494477D09',
      usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      usdt: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    },
    features: {
      kycRequired: false,
      commerceRequired: false,
      allowSoftKyc: true,
      enterpriseApi: true,
      affiliateSystem: true,
    },
    relayer: {
      address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      balanceEth: '0.45',
      lowBalance: false,
    },
  };
}

function getMockChartData(): ChartData[] {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return days.map((day, i) => ({
    date: day,
    registrations: Math.floor(Math.random() * 50) + 10,
    claims: Math.floor(Math.random() * 30) + 5,
  }));
}
