/**
 * Reconciliation Dashboard
 * 
 * Displays system health metrics including:
 * - Intents stuck > X minutes
 * - Settlements missing receipt
 * - Ledger imbalance alerts
 */

import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface ReconciliationData {
  stuckIntents: StuckIntent[];
  missingReceipts: MissingReceipt[];
  ledgerBalance: LedgerBalance[];
  alerts: Alert[];
  metrics: SystemMetrics;
}

interface StuckIntent {
  id: string;
  type: string;
  wallet: string;
  createdAt: string;
  stuckMinutes: number;
  lastError?: string;
}

interface MissingReceipt {
  settlementId: string;
  intentId: string;
  amount: string;
  expectedAt: string;
}

interface LedgerBalance {
  account: string;
  asset: string;
  debit: string;
  credit: string;
  balance: string;
  isBalanced: boolean;
}

interface Alert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

interface SystemMetrics {
  intentThroughput: number;
  avgProcessingTime: number;
  successRate: number;
  queueDepth: number;
}

// Mock data for demo
const mockData: ReconciliationData = {
  stuckIntents: [
    { id: 'intent-001', type: 'REGISTER', wallet: '0xabc...def', createdAt: new Date(Date.now() - 45 * 60000).toISOString(), stuckMinutes: 45, lastError: 'RPC timeout' },
    { id: 'intent-002', type: 'CLAIM', wallet: '0x123...789', createdAt: new Date(Date.now() - 32 * 60000).toISOString(), stuckMinutes: 32 },
    { id: 'intent-003', type: 'REGISTER', wallet: '0xfed...cba', createdAt: new Date(Date.now() - 18 * 60000).toISOString(), stuckMinutes: 18, lastError: 'Insufficient gas' },
  ],
  missingReceipts: [
    { settlementId: 'stl-001', intentId: 'intent-005', amount: '1000 SGE', expectedAt: new Date(Date.now() - 3600000).toISOString() },
    { settlementId: 'stl-002', intentId: 'intent-008', amount: '500 SGE', expectedAt: new Date(Date.now() - 1800000).toISOString() },
  ],
  ledgerBalance: [
    { account: 'TREASURY', asset: 'SGE', debit: '1000000', credit: '1000000', balance: '0', isBalanced: true },
    { account: 'TREASURY', asset: 'ETH', debit: '50', credit: '50', balance: '0', isBalanced: true },
    { account: 'COMMISSIONS', asset: 'SGE', debit: '25000', credit: '24850', balance: '150', isBalanced: false },
    { account: 'PAYOUTS', asset: 'SGE', debit: '5000', credit: '5000', balance: '0', isBalanced: true },
  ],
  alerts: [
    { id: 'alert-001', severity: 'critical', message: 'Ledger imbalance detected in COMMISSIONS account', timestamp: new Date(Date.now() - 300000).toISOString(), acknowledged: false },
    { id: 'alert-002', severity: 'warning', message: '3 intents stuck for > 30 minutes', timestamp: new Date(Date.now() - 600000).toISOString(), acknowledged: false },
    { id: 'alert-003', severity: 'info', message: 'Nightly reconciliation completed', timestamp: new Date(Date.now() - 3600000).toISOString(), acknowledged: true },
  ],
  metrics: {
    intentThroughput: 127,
    avgProcessingTime: 3.4,
    successRate: 98.7,
    queueDepth: 12,
  },
};

// Colors
const COLORS = {
  primary: '#4CAF50',
  warning: '#FF9800',
  critical: '#F44336',
  info: '#2196F3',
  muted: '#9E9E9E',
};

const SEVERITY_COLORS = {
  critical: COLORS.critical,
  warning: COLORS.warning,
  info: COLORS.info,
};

export default function ReconciliationDashboard() {
  const [data, setData] = useState<ReconciliationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchData = async () => {
    setRefreshing(true);
    try {
      // In real mode, fetch from API
      // const response = await fetch('/api/v2/enterprise/reconciliation');
      // const data = await response.json();
      
      // For demo, use mock data with some randomization
      await new Promise(r => setTimeout(r, 500));
      setData({
        ...mockData,
        metrics: {
          ...mockData.metrics,
          intentThroughput: Math.floor(100 + Math.random() * 50),
          queueDepth: Math.floor(5 + Math.random() * 20),
        },
      });
      setLastRefresh(new Date());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data) return null;

  const unacknowledgedAlerts = data.alerts.filter(a => !a.acknowledged);
  const criticalAlerts = unacknowledgedAlerts.filter(a => a.severity === 'critical');

  // Chart data
  const intentAgeData = data.stuckIntents.map(i => ({
    name: i.id.slice(-6),
    minutes: i.stuckMinutes,
    type: i.type,
  }));

  const ledgerPieData = data.ledgerBalance.map(l => ({
    name: `${l.account} (${l.asset})`,
    value: parseFloat(l.debit),
    isBalanced: l.isBalanced,
  }));

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Reconciliation Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            System health and ledger reconciliation
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-muted-foreground">
            Last refresh: {lastRefresh.toLocaleTimeString()}
          </span>
          <button
            onClick={fetchData}
            disabled={refreshing}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      {criticalAlerts.length > 0 && (
        <div className="bg-red-500/10 border border-red-500 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <span className="text-red-500 text-xl">⚠️</span>
            <div>
              <div className="font-semibold text-red-500">Critical Alerts</div>
              <ul className="text-sm text-red-400">
                {criticalAlerts.map(a => (
                  <li key={a.id}>{a.message}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Intent Throughput"
          value={`${data.metrics.intentThroughput}/hr`}
          trend="+12%"
          trendUp
        />
        <MetricCard
          title="Avg Processing Time"
          value={`${data.metrics.avgProcessingTime}s`}
          trend="-0.3s"
          trendUp
        />
        <MetricCard
          title="Success Rate"
          value={`${data.metrics.successRate}%`}
          trend="+0.2%"
          trendUp
        />
        <MetricCard
          title="Queue Depth"
          value={`${data.metrics.queueDepth}`}
          trend={data.metrics.queueDepth > 20 ? 'High' : 'Normal'}
          trendUp={data.metrics.queueDepth <= 20}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stuck Intents Chart */}
        <div className="bg-card rounded-lg border p-4">
          <h3 className="font-semibold mb-4">Stuck Intents by Age</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={intentAgeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="name" stroke="#888" fontSize={12} />
              <YAxis stroke="#888" fontSize={12} label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                formatter={(value: any, _name: any, props: any) => [`${value} min`, props.payload.type]}
              />
              <Bar
                dataKey="minutes"
                fill={COLORS.warning}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Ledger Balance Pie */}
        <div className="bg-card rounded-lg border p-4">
          <h3 className="font-semibold mb-4">Ledger Account Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={ledgerPieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, percent }) => `${name}: ${(((percent ?? 0) * 100)).toFixed(0)}%`}
              >
                {ledgerPieData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.isBalanced ? COLORS.primary : COLORS.critical}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stuck Intents Table */}
        <div className="bg-card rounded-lg border">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Stuck Intents ({data.stuckIntents.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left p-3">ID</th>
                  <th className="text-left p-3">Type</th>
                  <th className="text-left p-3">Age</th>
                  <th className="text-left p-3">Error</th>
                  <th className="text-left p-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.stuckIntents.map((intent) => (
                  <tr key={intent.id} className="border-t hover:bg-muted/10">
                    <td className="p-3 font-mono text-xs">{intent.id}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        intent.type === 'CLAIM' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                      }`}>
                        {intent.type}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`font-semibold ${
                        intent.stuckMinutes > 30 ? 'text-red-400' : 'text-yellow-400'
                      }`}>
                        {intent.stuckMinutes}m
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground text-xs">{intent.lastError || '-'}</td>
                    <td className="p-3">
                      <button className="px-2 py-1 text-xs bg-primary/20 text-primary rounded hover:bg-primary/30">
                        Retry
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Ledger Balance Table */}
        <div className="bg-card rounded-lg border">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Ledger Balances</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left p-3">Account</th>
                  <th className="text-left p-3">Asset</th>
                  <th className="text-right p-3">Debit</th>
                  <th className="text-right p-3">Credit</th>
                  <th className="text-center p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.ledgerBalance.map((entry, i) => (
                  <tr key={i} className="border-t hover:bg-muted/10">
                    <td className="p-3 font-semibold">{entry.account}</td>
                    <td className="p-3">{entry.asset}</td>
                    <td className="p-3 text-right font-mono">{entry.debit}</td>
                    <td className="p-3 text-right font-mono">{entry.credit}</td>
                    <td className="p-3 text-center">
                      {entry.isBalanced ? (
                        <span className="text-green-400">✓</span>
                      ) : (
                        <span className="text-red-400 font-semibold">⚠ {entry.balance}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Missing Receipts */}
      {data.missingReceipts.length > 0 && (
        <div className="bg-card rounded-lg border">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-yellow-400">
              ⚠ Missing Receipts ({data.missingReceipts.length})
            </h3>
          </div>
          <div className="p-4">
            <div className="grid gap-3">
              {data.missingReceipts.map((receipt) => (
                <div
                  key={receipt.settlementId}
                  className="flex justify-between items-center p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/30"
                >
                  <div>
                    <div className="font-mono text-sm">{receipt.settlementId}</div>
                    <div className="text-xs text-muted-foreground">
                      Intent: {receipt.intentId} • Amount: {receipt.amount}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Expected</div>
                    <div className="text-sm">{new Date(receipt.expectedAt).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent Alerts */}
      <div className="bg-card rounded-lg border">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Recent Alerts</h3>
        </div>
        <div className="divide-y">
          {data.alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 flex items-start gap-3 ${alert.acknowledged ? 'opacity-50' : ''}`}
            >
              <span
                className="w-2 h-2 rounded-full mt-2"
                style={{ backgroundColor: SEVERITY_COLORS[alert.severity] }}
              />
              <div className="flex-1">
                <div className="text-sm">{alert.message}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(alert.timestamp).toLocaleString()}
                </div>
              </div>
              {!alert.acknowledged && (
                <button className="px-3 py-1 text-xs bg-muted rounded hover:bg-muted/80">
                  Acknowledge
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Metric Card Component
function MetricCard({
  title,
  value,
  trend,
  trendUp,
}: {
  title: string;
  value: string;
  trend: string;
  trendUp: boolean;
}) {
  return (
    <div className="bg-card rounded-lg border p-4">
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      <div className={`text-xs mt-1 ${trendUp ? 'text-green-400' : 'text-red-400'}`}>
        {trendUp ? '↑' : '↓'} {trend}
      </div>
    </div>
  );
}
