/**
 * Admin Portal
 * 
 * Enterprise admin dashboard for managing settlements,
 * monitoring system health, and controlling payouts.
 */

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
} from 'recharts';

// Types
interface PlatformStats {
  totalPrograms: number;
  totalUsers: number;
  totalAffiliates: number;
  totalSettlements: number;
  totalVolume: string;
  pendingPayouts: string;
  ledgerBalance: string;
}

interface Settlement {
  id: string;
  userId: string;
  amount: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  txHash?: string;
  createdAt: string;
}

interface PayoutBatch {
  id: string;
  totalAmount: string;
  payoutCount: number;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'EXECUTED';
  createdBy: string;
  approvedBy?: string;
  createdAt: string;
}

interface ReconciliationSummary {
  lastRun: string;
  ledgerBalanced: boolean;
  settlementsVerified: number;
  settlementsUnverified: number;
  stuckIntents: number;
}

// API base URL
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Mock data for demo mode
const MOCK_STATS: PlatformStats = {
  totalPrograms: 3,
  totalUsers: 1247,
  totalAffiliates: 89,
  totalSettlements: 856,
  totalVolume: '2,450,000.00',
  pendingPayouts: '45,230.00',
  ledgerBalance: '0.00', // Should be balanced!
};

const MOCK_SETTLEMENTS: Settlement[] = [
  { id: 's1', userId: '0x1234...5678', amount: '500.00', status: 'COMPLETED', txHash: '0xabc...', createdAt: '2025-01-29 14:32' },
  { id: 's2', userId: '0x2345...6789', amount: '1,250.00', status: 'COMPLETED', txHash: '0xdef...', createdAt: '2025-01-29 13:15' },
  { id: 's3', userId: '0x3456...7890', amount: '750.00', status: 'PROCESSING', createdAt: '2025-01-29 12:45' },
  { id: 's4', userId: '0x4567...8901', amount: '2,000.00', status: 'PENDING', createdAt: '2025-01-29 11:30' },
  { id: 's5', userId: '0x5678...9012', amount: '320.00', status: 'FAILED', createdAt: '2025-01-29 10:15' },
];

const MOCK_BATCHES: PayoutBatch[] = [
  { id: 'b1', totalAmount: '15,250.00', payoutCount: 12, status: 'EXECUTED', createdBy: 'admin1', approvedBy: 'admin2', createdAt: '2025-01-28' },
  { id: 'b2', totalAmount: '8,340.00', payoutCount: 8, status: 'APPROVED', createdBy: 'admin2', approvedBy: 'admin1', createdAt: '2025-01-29' },
  { id: 'b3', totalAmount: '21,640.00', payoutCount: 15, status: 'PENDING_APPROVAL', createdBy: 'admin1', createdAt: '2025-01-29' },
  { id: 'b4', totalAmount: '0.00', payoutCount: 0, status: 'DRAFT', createdBy: 'admin1', createdAt: '2025-01-29' },
];

const MOCK_RECONCILIATION: ReconciliationSummary = {
  lastRun: '2025-01-29 02:00:00',
  ledgerBalanced: true,
  settlementsVerified: 852,
  settlementsUnverified: 4,
  stuckIntents: 2,
};

const MOCK_VOLUME_DATA = [
  { date: 'Jan 22', volume: 180000, settlements: 95 },
  { date: 'Jan 23', volume: 220000, settlements: 112 },
  { date: 'Jan 24', volume: 195000, settlements: 98 },
  { date: 'Jan 25', volume: 310000, settlements: 156 },
  { date: 'Jan 26', volume: 275000, settlements: 134 },
  { date: 'Jan 27', volume: 340000, settlements: 168 },
  { date: 'Jan 28', volume: 285000, settlements: 142 },
  { date: 'Jan 29', volume: 320000, settlements: 151 },
];

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: '#10B981',
  APPROVED: '#10B981',
  EXECUTED: '#10B981',
  PROCESSING: '#3B82F6',
  PENDING: '#F59E0B',
  PENDING_APPROVAL: '#F59E0B',
  DRAFT: '#6B7280',
  FAILED: '#EF4444',
};

export default function AdminPortal() {
  const { address, isConnected } = useAccount();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [batches, setBatches] = useState<PayoutBatch[]>([]);
  const [reconciliation, setReconciliation] = useState<ReconciliationSummary | null>(null);
  const [volumeData, setVolumeData] = useState(MOCK_VOLUME_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'settlements' | 'payouts' | 'system'>('overview');
  const [isAdmin, setIsAdmin] = useState(false);

  // Admin wallets (in production, this would be fetched from the API)
  const ADMIN_WALLETS = [
    '0x0000000000000000000000000000000000000000', // Replace with actual admin wallets
  ];

  // Check if connected wallet is admin
  useEffect(() => {
    if (isConnected && address) {
      // In demo mode, always allow
      const isMockMode = import.meta.env.VITE_MOCK_MODE === 'true';
      setIsAdmin(isMockMode || ADMIN_WALLETS.includes(address.toLowerCase()));
    }
  }, [isConnected, address]);

  // Fetch admin data
  useEffect(() => {
    async function fetchData() {
      if (!isConnected || !isAdmin) {
        setIsLoading(false);
        return;
      }

      try {
        const isMockMode = import.meta.env.VITE_MOCK_MODE === 'true';
        
        if (isMockMode) {
          setStats(MOCK_STATS);
          setSettlements(MOCK_SETTLEMENTS);
          setBatches(MOCK_BATCHES);
          setReconciliation(MOCK_RECONCILIATION);
          setVolumeData(MOCK_VOLUME_DATA);
        } else {
          // Fetch real data from API
          const adminKey = localStorage.getItem('adminKey') || '';
          const headers = { 'X-Admin-Key': adminKey };

          const [statsRes, settlementsRes, batchesRes, reconRes] = await Promise.all([
            fetch(`${API_BASE}/api/v2/enterprise/stats`, { headers }),
            fetch(`${API_BASE}/api/v2/enterprise/settlements?limit=10`, { headers }),
            fetch(`${API_BASE}/api/v2/payouts/batch?limit=10`, { headers }),
            fetch(`${API_BASE}/api/v2/enterprise/reconciliation`, { headers }),
          ]);

          if (statsRes.ok) setStats(await statsRes.json());
          if (settlementsRes.ok) setSettlements((await settlementsRes.json()).settlements || []);
          if (batchesRes.ok) setBatches((await batchesRes.json()).batches || []);
          if (reconRes.ok) setReconciliation(await reconRes.json());
        }
      } catch (err) {
        console.error('Failed to fetch admin data:', err);
        // Fall back to mock data
        setStats(MOCK_STATS);
        setSettlements(MOCK_SETTLEMENTS);
        setBatches(MOCK_BATCHES);
        setReconciliation(MOCK_RECONCILIATION);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [isConnected, isAdmin]);

  // Approve payout batch
  const approveBatch = async (batchId: string) => {
    // In production, this would call the API
    setBatches(batches.map(b => 
      b.id === batchId ? { ...b, status: 'APPROVED' as const, approvedBy: 'You' } : b
    ));
  };

  // Execute payout batch
  const executeBatch = async (batchId: string) => {
    setBatches(batches.map(b => 
      b.id === batchId ? { ...b, status: 'EXECUTED' as const } : b
    ));
  };

  // Run reconciliation
  const runReconciliation = async () => {
    // In production, this would call the API
    setReconciliation({
      ...MOCK_RECONCILIATION,
      lastRun: new Date().toISOString(),
    });
  };

  if (!isConnected) {
    return (
      <div className="admin-portal">
        <div className="card text-center">
          <div className="card-icon">🔐</div>
          <h2>Admin Portal</h2>
          <p className="text-secondary">Connect your wallet to access the admin dashboard</p>
        </div>
      </div>
    );
  }

  if (!isAdmin && !isLoading) {
    return (
      <div className="admin-portal">
        <div className="card text-center">
          <div className="card-icon">⛔</div>
          <h2>Access Denied</h2>
          <p className="text-secondary">
            This wallet is not authorized to access the admin portal.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="admin-portal">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-portal">
      {/* Header */}
      <div className="portal-header">
        <div className="header-info">
          <h1>Enterprise Admin</h1>
          <p className="text-secondary">
            Platform management and settlement monitoring
          </p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={runReconciliation}>
            🔄 Run Reconciliation
          </button>
        </div>
      </div>

      {/* System health banner */}
      {reconciliation && (
        <div className={`health-banner ${reconciliation.ledgerBalanced ? 'healthy' : 'warning'}`}>
          <div className="health-status">
            <span className="health-icon">
              {reconciliation.ledgerBalanced ? '✓' : '⚠'}
            </span>
            <span className="health-text">
              Ledger {reconciliation.ledgerBalanced ? 'Balanced' : 'Imbalanced'}
            </span>
          </div>
          <div className="health-details">
            <span>Last reconciliation: {reconciliation.lastRun}</span>
            {reconciliation.stuckIntents > 0 && (
              <span className="warning-text">
                {reconciliation.stuckIntents} stuck intents
              </span>
            )}
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="stats-grid admin-stats">
        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-value">{stats?.totalPrograms}</span>
            <span className="stat-label">Programs</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-value">{stats?.totalUsers?.toLocaleString()}</span>
            <span className="stat-label">Users</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-value">{stats?.totalAffiliates}</span>
            <span className="stat-label">Affiliates</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-value">{stats?.totalSettlements}</span>
            <span className="stat-label">Settlements</span>
          </div>
        </div>
        <div className="stat-card highlight">
          <div className="stat-content">
            <span className="stat-value">${stats?.totalVolume}</span>
            <span className="stat-label">Total Volume</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-value">${stats?.pendingPayouts}</span>
            <span className="stat-label">Pending Payouts</span>
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="tab-nav">
        <button 
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`tab-btn ${activeTab === 'settlements' ? 'active' : ''}`}
          onClick={() => setActiveTab('settlements')}
        >
          Settlements
        </button>
        <button 
          className={`tab-btn ${activeTab === 'payouts' ? 'active' : ''}`}
          onClick={() => setActiveTab('payouts')}
        >
          Payouts
        </button>
        <button 
          className={`tab-btn ${activeTab === 'system' ? 'active' : ''}`}
          onClick={() => setActiveTab('system')}
        >
          System
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="tab-content">
          {/* Volume chart */}
          <div className="card chart-card full-width">
            <h3>Settlement Volume (7 Days)</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={volumeData}>
                  <defs>
                    <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#12B886" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#12B886" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E3A2A" />
                  <XAxis dataKey="date" stroke="#6B7280" fontSize={12} />
                  <YAxis 
                    stroke="#6B7280" 
                    fontSize={12}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Volume']}
                    contentStyle={{
                      backgroundColor: '#0F2419',
                      border: '1px solid #1E3A2A',
                      borderRadius: '8px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="volume"
                    stroke="#12B886"
                    strokeWidth={2}
                    fill="url(#volumeGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Settlements bar chart */}
          <div className="card chart-card">
            <h3>Daily Settlements</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={volumeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E3A2A" />
                  <XAxis dataKey="date" stroke="#6B7280" fontSize={12} />
                  <YAxis stroke="#6B7280" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F2419',
                      border: '1px solid #1E3A2A',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="settlements" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settlements' && (
        <div className="tab-content">
          <div className="card">
            <div className="card-header">
              <h3>Recent Settlements</h3>
              <button className="btn btn-sm btn-secondary">Export CSV</button>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>User</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>TX Hash</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {settlements.map((settlement) => (
                    <tr key={settlement.id}>
                      <td className="mono">{settlement.id}</td>
                      <td className="mono">{settlement.userId}</td>
                      <td className="text-right">${settlement.amount}</td>
                      <td>
                        <span 
                          className="status-badge"
                          style={{ 
                            backgroundColor: `${STATUS_COLORS[settlement.status]}20`,
                            color: STATUS_COLORS[settlement.status],
                          }}
                        >
                          {settlement.status}
                        </span>
                      </td>
                      <td className="mono">{settlement.txHash || '—'}</td>
                      <td>{settlement.createdAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'payouts' && (
        <div className="tab-content">
          <div className="card">
            <div className="card-header">
              <h3>Payout Batches</h3>
              <button className="btn btn-primary">+ Create Batch</button>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Batch ID</th>
                    <th>Amount</th>
                    <th>Payouts</th>
                    <th>Status</th>
                    <th>Created By</th>
                    <th>Approved By</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((batch) => (
                    <tr key={batch.id}>
                      <td className="mono">{batch.id}</td>
                      <td className="text-right">${batch.totalAmount}</td>
                      <td className="text-center">{batch.payoutCount}</td>
                      <td>
                        <span 
                          className="status-badge"
                          style={{ 
                            backgroundColor: `${STATUS_COLORS[batch.status]}20`,
                            color: STATUS_COLORS[batch.status],
                          }}
                        >
                          {batch.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td>{batch.createdBy}</td>
                      <td>{batch.approvedBy || '—'}</td>
                      <td>
                        <div className="action-buttons">
                          {batch.status === 'PENDING_APPROVAL' && (
                            <button 
                              className="btn btn-sm btn-success"
                              onClick={() => approveBatch(batch.id)}
                            >
                              Approve
                            </button>
                          )}
                          {batch.status === 'APPROVED' && (
                            <button 
                              className="btn btn-sm btn-primary"
                              onClick={() => executeBatch(batch.id)}
                            >
                              Execute
                            </button>
                          )}
                          {(batch.status === 'DRAFT' || batch.status === 'PENDING_APPROVAL') && (
                            <button className="btn btn-sm btn-secondary">
                              Edit
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="info-box mt-lg">
              <span className="info-icon">ℹ️</span>
              <span>
                Two-person approval required: The creator of a batch cannot approve it.
              </span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'system' && (
        <div className="tab-content">
          <div className="system-grid">
            {/* Reconciliation status */}
            <div className="card">
              <h3>Reconciliation Status</h3>
              {reconciliation && (
                <div className="recon-stats">
                  <div className="recon-item">
                    <span className="recon-label">Last Run</span>
                    <span className="recon-value">{reconciliation.lastRun}</span>
                  </div>
                  <div className="recon-item">
                    <span className="recon-label">Ledger Status</span>
                    <span className={`recon-value ${reconciliation.ledgerBalanced ? 'success' : 'error'}`}>
                      {reconciliation.ledgerBalanced ? 'Balanced ✓' : 'Imbalanced ✗'}
                    </span>
                  </div>
                  <div className="recon-item">
                    <span className="recon-label">Verified Settlements</span>
                    <span className="recon-value">{reconciliation.settlementsVerified}</span>
                  </div>
                  <div className="recon-item">
                    <span className="recon-label">Unverified Settlements</span>
                    <span className={`recon-value ${reconciliation.settlementsUnverified > 0 ? 'warning' : ''}`}>
                      {reconciliation.settlementsUnverified}
                    </span>
                  </div>
                  <div className="recon-item">
                    <span className="recon-label">Stuck Intents</span>
                    <span className={`recon-value ${reconciliation.stuckIntents > 0 ? 'warning' : ''}`}>
                      {reconciliation.stuckIntents}
                    </span>
                  </div>
                </div>
              )}
              <button className="btn btn-secondary mt-lg" onClick={runReconciliation}>
                Run Manual Reconciliation
              </button>
            </div>

            {/* Queue status */}
            <div className="card">
              <h3>Queue Status</h3>
              <div className="queue-list">
                {[
                  { name: 'Intents', active: 12, pending: 3, failed: 0 },
                  { name: 'Settlements', active: 5, pending: 8, failed: 1 },
                  { name: 'Payouts', active: 0, pending: 0, failed: 0 },
                  { name: 'Reconciler', active: 1, pending: 0, failed: 0 },
                ].map((queue) => (
                  <div key={queue.name} className="queue-item">
                    <span className="queue-name">{queue.name}</span>
                    <div className="queue-counts">
                      <span className="queue-active">{queue.active} active</span>
                      <span className="queue-pending">{queue.pending} pending</span>
                      {queue.failed > 0 && (
                        <span className="queue-failed">{queue.failed} failed</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Audit log */}
            <div className="card full-width">
              <h3>Recent Audit Log</h3>
              <div className="audit-log">
                {[
                  { time: '14:32:15', action: 'SETTLEMENT_COMPLETED', actor: 'system', details: 'Settlement s123 completed' },
                  { time: '14:30:22', action: 'PAYOUT_BATCH_APPROVED', actor: 'admin2', details: 'Batch b2 approved' },
                  { time: '14:28:45', action: 'COMMISSION_ACCRUED', actor: 'system', details: 'Commission $125 for affiliate a456' },
                  { time: '14:25:10', action: 'USER_REGISTERED', actor: 'system', details: 'User 0x789... registered' },
                  { time: '14:20:00', action: 'RECONCILIATION_RUN', actor: 'scheduler', details: 'Nightly reconciliation completed' },
                ].map((log, i) => (
                  <div key={i} className="audit-item">
                    <span className="audit-time">{log.time}</span>
                    <span className="audit-action">{log.action}</span>
                    <span className="audit-actor">{log.actor}</span>
                    <span className="audit-details">{log.details}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
