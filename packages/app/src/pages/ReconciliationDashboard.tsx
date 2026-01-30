/**
 * Reconciliation Dashboard
 * 
 * Operational monitoring dashboard showing:
 * - Stuck settlement intents
 * - Ledger imbalances
 * - Pending payout batches
 * - Webhook failures
 * - System health metrics
 * 
 * This is the "SR-level" operational view that ensures
 * the settlement platform survives real traffic.
 */

import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Clock, XCircle, RefreshCw } from 'lucide-react';

interface ReconciliationMetrics {
  stuckIntents: StuckIntent[];
  ledgerImbalances: LedgerImbalance[];
  pendingPayouts: PendingPayout[];
  webhookFailures: WebhookFailure[];
  systemHealth: SystemHealth;
}

interface StuckIntent {
  id: string;
  userId: string;
  amount: number;
  status: string;
  stuckMinutes: number;
  createdAt: string;
}

interface LedgerImbalance {
  programId: string;
  programName: string;
  expectedBalance: number;
  actualBalance: number;
  difference: number;
  lastChecked: string;
}

interface PendingPayout {
  id: string;
  programId: string;
  affiliateCount: number;
  totalAmount: number;
  createdAt: string;
  awaitingApproval: boolean;
}

interface WebhookFailure {
  id: string;
  endpoint: string;
  eventType: string;
  attemptCount: number;
  lastError: string;
  nextRetry: string;
}

interface SystemHealth {
  intentProcessingAvg: number; // ms
  ledgerBalanced: boolean;
  queueDepth: number;
  workerStatus: 'healthy' | 'degraded' | 'down';
  lastReconciliation: string;
}

export function ReconciliationDashboard() {
  const [metrics, setMetrics] = useState<ReconciliationMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchMetrics = async () => {
    try {
      // TODO: Replace with real API call
      const response = await fetch('/api/admin/reconciliation');
      const data = await response.json();
      setMetrics(data);
    } catch (error) {
      console.error('Failed to fetch reconciliation metrics:', error);
      // Use mock data for demo
      setMetrics(getMockMetrics());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    
    if (autoRefresh) {
      const interval = setInterval(fetchMetrics, 30000); // 30s refresh
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-sge-green" />
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Failed to load reconciliation metrics</p>
        </div>
      </div>
    );
  }

  const { stuckIntents, ledgerImbalances, pendingPayouts, webhookFailures, systemHealth } = metrics;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reconciliation Dashboard</h1>
          <p className="text-gray-600 mt-1">Operational monitoring & settlement integrity</p>
        </div>
        <div className="flex gap-4 items-center">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            Auto-refresh (30s)
          </label>
          <button
            onClick={fetchMetrics}
            className="px-4 py-2 bg-sge-green text-white rounded-lg hover:bg-sge-green-dark flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Now
          </button>
        </div>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <HealthCard
          title="Ledger Status"
          status={systemHealth.ledgerBalanced ? 'healthy' : 'error'}
          value={systemHealth.ledgerBalanced ? 'Balanced' : 'Imbalanced'}
          icon={systemHealth.ledgerBalanced ? CheckCircle : AlertTriangle}
        />
        <HealthCard
          title="Worker Status"
          status={systemHealth.workerStatus === 'healthy' ? 'healthy' : 'warning'}
          value={systemHealth.workerStatus}
          icon={systemHealth.workerStatus === 'healthy' ? CheckCircle : AlertTriangle}
        />
        <HealthCard
          title="Queue Depth"
          status={systemHealth.queueDepth < 100 ? 'healthy' : 'warning'}
          value={`${systemHealth.queueDepth} jobs`}
          icon={Clock}
        />
        <HealthCard
          title="Avg Processing"
          status={systemHealth.intentProcessingAvg < 5000 ? 'healthy' : 'warning'}
          value={`${(systemHealth.intentProcessingAvg / 1000).toFixed(1)}s`}
          icon={Clock}
        />
      </div>

      {/* Stuck Intents */}
      {stuckIntents.length > 0 && (
        <AlertSection
          title="🚨 Stuck Settlement Intents"
          description="Intents that have been pending for longer than expected"
          severity="error"
        >
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Intent ID</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">User</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Amount</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Status</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Stuck For</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {stuckIntents.map((intent) => (
                <tr key={intent.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono">{intent.id.slice(0, 8)}...</td>
                  <td className="px-4 py-3 text-sm">{intent.userId}</td>
                  <td className="px-4 py-3 text-sm">${(intent.amount / 100).toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                      {intent.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-red-600 font-medium">
                    {intent.stuckMinutes} min
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <button className="text-sge-green hover:underline">Retry</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AlertSection>
      )}

      {/* Ledger Imbalances */}
      {ledgerImbalances.length > 0 && (
        <AlertSection
          title="⚖️ Ledger Imbalances"
          description="Programs where credits and debits don't match"
          severity="error"
        >
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Program</th>
                <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Expected</th>
                <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Actual</th>
                <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Difference</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Last Checked</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {ledgerImbalances.map((imbalance) => (
                <tr key={imbalance.programId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{imbalance.programName}</td>
                  <td className="px-4 py-3 text-sm text-right">
                    ${(imbalance.expectedBalance / 100).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    ${(imbalance.actualBalance / 100).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-red-600 font-medium">
                    ${Math.abs(imbalance.difference / 100).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(imbalance.lastChecked).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AlertSection>
      )}

      {/* Pending Payouts */}
      {pendingPayouts.length > 0 && (
        <AlertSection
          title="💰 Pending Payout Batches"
          description="Payout batches awaiting approval or execution"
          severity="warning"
        >
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Batch ID</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Program</th>
                <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Affiliates</th>
                <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Total Amount</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Status</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {pendingPayouts.map((payout) => (
                <tr key={payout.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono">{payout.id.slice(0, 8)}...</td>
                  <td className="px-4 py-3 text-sm">{payout.programId}</td>
                  <td className="px-4 py-3 text-sm text-right">{payout.affiliateCount}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium">
                    ${(payout.totalAmount / 100).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded text-xs ${
                      payout.awaitingApproval
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {payout.awaitingApproval ? 'Awaiting Approval' : 'Ready'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(payout.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AlertSection>
      )}

      {/* Webhook Failures */}
      {webhookFailures.length > 0 && (
        <AlertSection
          title="🔔 Webhook Failures"
          description="Failed webhook deliveries that will be retried"
          severity="warning"
        >
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Event Type</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Endpoint</th>
                <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Attempts</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Last Error</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Next Retry</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {webhookFailures.map((failure) => (
                <tr key={failure.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{failure.eventType}</td>
                  <td className="px-4 py-3 text-sm font-mono text-xs">{failure.endpoint}</td>
                  <td className="px-4 py-3 text-sm text-right">{failure.attemptCount}</td>
                  <td className="px-4 py-3 text-sm text-red-600 max-w-xs truncate">
                    {failure.lastError}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(failure.nextRetry).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AlertSection>
      )}

      {/* All Clear */}
      {stuckIntents.length === 0 && 
       ledgerImbalances.length === 0 && 
       pendingPayouts.length === 0 && 
       webhookFailures.length === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
          <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-green-900 mb-2">All Systems Operational</h2>
          <p className="text-green-700">
            No stuck intents, ledger is balanced, and all webhooks are delivering successfully.
          </p>
          <p className="text-green-600 text-sm mt-2">
            Last reconciliation: {new Date(systemHealth.lastReconciliation).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}

function HealthCard({ 
  title, 
  status, 
  value, 
  icon: Icon 
}: { 
  title: string; 
  status: 'healthy' | 'warning' | 'error'; 
  value: string; 
  icon: any;
}) {
  const colors = {
    healthy: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    error: 'bg-red-50 border-red-200 text-red-800',
  };

  const iconColors = {
    healthy: 'text-green-600',
    warning: 'text-yellow-600',
    error: 'text-red-600',
  };

  return (
    <div className={`border rounded-lg p-4 ${colors[status]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{title}</span>
        <Icon className={`w-5 h-5 ${iconColors[status]}`} />
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function AlertSection({ 
  title, 
  description, 
  severity, 
  children 
}: { 
  title: string; 
  description: string; 
  severity: 'error' | 'warning'; 
  children: React.ReactNode;
}) {
  const colors = {
    error: 'bg-red-50 border-red-200',
    warning: 'bg-yellow-50 border-yellow-200',
  };

  return (
    <div className={`border rounded-lg p-6 mb-6 ${colors[severity]}`}>
      <h2 className="text-lg font-bold text-gray-900 mb-1">{title}</h2>
      <p className="text-sm text-gray-600 mb-4">{description}</p>
      <div className="bg-white rounded-lg overflow-hidden">
        {children}
      </div>
    </div>
  );
}

// Mock data for demo purposes
function getMockMetrics(): ReconciliationMetrics {
  return {
    stuckIntents: [
      {
        id: 'intent_abc123',
        userId: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        amount: 50000, // $500.00
        status: 'payment_pending',
        stuckMinutes: 15,
        createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      },
    ],
    ledgerImbalances: [],
    pendingPayouts: [
      {
        id: 'batch_xyz789',
        programId: 'program_main',
        affiliateCount: 45,
        totalAmount: 1250000, // $12,500.00
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        awaitingApproval: true,
      },
    ],
    webhookFailures: [],
    systemHealth: {
      intentProcessingAvg: 3500,
      ledgerBalanced: true,
      queueDepth: 12,
      workerStatus: 'healthy',
      lastReconciliation: new Date().toISOString(),
    },
  };
}
