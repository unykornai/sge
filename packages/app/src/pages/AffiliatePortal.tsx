/**
 * Affiliate Portal
 * 
 * Dashboard for affiliates to manage referrals, view commissions,
 * and track downline performance.
 */

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// Types
interface AffiliateStats {
  totalReferrals: number;
  activeReferrals: number;
  pendingCommissions: string;
  paidCommissions: string;
  tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  referralCode: string;
}

interface Commission {
  id: string;
  amount: string;
  type: 'DIRECT' | 'OVERRIDE';
  status: 'PENDING' | 'ACCRUED' | 'PAID';
  createdAt: string;
  fromUser?: string;
}

// API base URL
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Mock data for demo mode
const MOCK_STATS: AffiliateStats = {
  totalReferrals: 47,
  activeReferrals: 32,
  pendingCommissions: '1,250.00',
  paidCommissions: '8,340.50',
  tier: 'GOLD',
  referralCode: 'SGE-ABC123',
};

const MOCK_COMMISSIONS: Commission[] = [
  { id: '1', amount: '125.00', type: 'DIRECT', status: 'PENDING', createdAt: '2025-01-29', fromUser: '0x1234...5678' },
  { id: '2', amount: '250.00', type: 'DIRECT', status: 'ACCRUED', createdAt: '2025-01-28', fromUser: '0x2345...6789' },
  { id: '3', amount: '75.00', type: 'OVERRIDE', status: 'PAID', createdAt: '2025-01-27', fromUser: '0x3456...7890' },
  { id: '4', amount: '180.00', type: 'DIRECT', status: 'PAID', createdAt: '2025-01-26', fromUser: '0x4567...8901' },
  { id: '5', amount: '320.00', type: 'DIRECT', status: 'PAID', createdAt: '2025-01-25', fromUser: '0x5678...9012' },
];

const MOCK_CHART_DATA = [
  { date: 'Jan 1', referrals: 5, commissions: 250 },
  { date: 'Jan 8', referrals: 8, commissions: 420 },
  { date: 'Jan 15', referrals: 12, commissions: 680 },
  { date: 'Jan 22', referrals: 15, commissions: 890 },
  { date: 'Jan 29', referrals: 7, commissions: 380 },
];

const TIER_COLORS: Record<string, string> = {
  BRONZE: '#CD7F32',
  SILVER: '#C0C0C0',
  GOLD: '#FFD700',
  PLATINUM: '#E5E4E2',
};

const COMMISSION_COLORS = ['#12B886', '#3B82F6', '#9CA3AF'];

export default function AffiliatePortal() {
  const { address, isConnected } = useAccount();
  const [stats, setStats] = useState<AffiliateStats | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [chartData, setChartData] = useState(MOCK_CHART_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'commissions' | 'downline'>('overview');

  // Fetch affiliate data
  useEffect(() => {
    async function fetchData() {
      if (!isConnected || !address) {
        setIsLoading(false);
        return;
      }

      try {
        // In demo mode, use mock data
        const isMockMode = import.meta.env.VITE_MOCK_MODE === 'true';
        
        if (isMockMode) {
          setStats(MOCK_STATS);
          setCommissions(MOCK_COMMISSIONS);
          setChartData(MOCK_CHART_DATA);
        } else {
          // Fetch real data from API
          const [statsRes, commissionsRes] = await Promise.all([
            fetch(`${API_BASE}/api/v2/affiliates/${address}/stats`),
            fetch(`${API_BASE}/api/v2/affiliates/${address}/commissions`),
          ]);

          if (statsRes.ok) {
            const statsData = await statsRes.json();
            setStats(statsData);
          }

          if (commissionsRes.ok) {
            const commissionsData = await commissionsRes.json();
            setCommissions(commissionsData.commissions || []);
          }
        }
      } catch (err: any) {
        console.error('Failed to fetch affiliate data:', err);
        setError('Failed to load affiliate data');
        // Fall back to mock data
        setStats(MOCK_STATS);
        setCommissions(MOCK_COMMISSIONS);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [isConnected, address]);

  // Copy referral link to clipboard
  const copyReferralLink = async () => {
    if (!stats?.referralCode) return;
    const link = `${window.location.origin}/?ref=${stats.referralCode}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Commission breakdown for pie chart
  const commissionBreakdown = [
    { name: 'Paid', value: parseFloat(stats?.paidCommissions?.replace(/,/g, '') || '0') },
    { name: 'Pending', value: parseFloat(stats?.pendingCommissions?.replace(/,/g, '') || '0') },
  ];

  if (!isConnected) {
    return (
      <div className="affiliate-portal">
        <div className="card text-center">
          <div className="card-icon">👥</div>
          <h2>Affiliate Portal</h2>
          <p className="text-secondary">Connect your wallet to access your affiliate dashboard</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="affiliate-portal">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading affiliate data...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="affiliate-portal">
        <div className="card text-center">
          <div className="card-icon">🚀</div>
          <h2>Become an Affiliate</h2>
          <p className="text-secondary">
            You're not registered as an affiliate yet. Join our program to earn commissions!
          </p>
          <button className="btn btn-primary mt-lg">
            Register as Affiliate
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="affiliate-portal">
      {/* Header with tier badge */}
      <div className="portal-header">
        <div className="header-info">
          <h1>Affiliate Dashboard</h1>
          <p className="text-secondary">
            Welcome back! Track your referrals and earnings.
          </p>
        </div>
        <div 
          className="tier-badge" 
          style={{ 
            backgroundColor: `${TIER_COLORS[stats.tier]}20`,
            borderColor: TIER_COLORS[stats.tier],
            color: TIER_COLORS[stats.tier],
          }}
        >
          {stats.tier} TIER
        </div>
      </div>

      {/* Referral link card */}
      <div className="card referral-card">
        <div className="referral-header">
          <h3>Your Referral Link</h3>
          <span className="referral-code">{stats.referralCode}</span>
        </div>
        <div className="referral-link-box">
          <input
            type="text"
            value={`${window.location.origin}/?ref=${stats.referralCode}`}
            readOnly
            className="referral-input"
          />
          <button 
            className={`btn ${copied ? 'btn-success' : 'btn-primary'}`}
            onClick={copyReferralLink}
          >
            {copied ? '✓ Copied!' : 'Copy Link'}
          </button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <span className="stat-value">{stats.totalReferrals}</span>
            <span className="stat-label">Total Referrals</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <span className="stat-value">{stats.activeReferrals}</span>
            <span className="stat-label">Active Users</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <span className="stat-value">${stats.pendingCommissions}</span>
            <span className="stat-label">Pending</span>
          </div>
        </div>
        <div className="stat-card highlight">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <span className="stat-value">${stats.paidCommissions}</span>
            <span className="stat-label">Total Earned</span>
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
          className={`tab-btn ${activeTab === 'commissions' ? 'active' : ''}`}
          onClick={() => setActiveTab('commissions')}
        >
          Commissions
        </button>
        <button 
          className={`tab-btn ${activeTab === 'downline' ? 'active' : ''}`}
          onClick={() => setActiveTab('downline')}
        >
          Downline
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="tab-content">
          <div className="chart-grid">
            {/* Referrals over time */}
            <div className="card chart-card">
              <h3>Referrals & Commissions</h3>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={chartData}>
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
                    <Line
                      type="monotone"
                      dataKey="referrals"
                      stroke="#12B886"
                      strokeWidth={2}
                      dot={{ fill: '#12B886' }}
                      name="Referrals"
                    />
                    <Line
                      type="monotone"
                      dataKey="commissions"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      dot={{ fill: '#3B82F6' }}
                      name="Commissions ($)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Commission breakdown */}
            <div className="card chart-card">
              <h3>Commission Status</h3>
              <div className="chart-container pie-chart">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={commissionBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {commissionBreakdown.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COMMISSION_COLORS[index]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => `$${Number(value).toFixed(2)}`}
                      contentStyle={{
                        backgroundColor: '#0F2419',
                        border: '1px solid #1E3A2A',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pie-legend">
                  {commissionBreakdown.map((entry, index) => (
                    <div key={entry.name} className="legend-item">
                      <span 
                        className="legend-dot" 
                        style={{ backgroundColor: COMMISSION_COLORS[index] }}
                      />
                      <span className="legend-label">{entry.name}</span>
                      <span className="legend-value">${entry.value.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'commissions' && (
        <div className="tab-content">
          <div className="card">
            <h3>Commission History</h3>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>From</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.map((commission) => (
                    <tr key={commission.id}>
                      <td>{commission.createdAt}</td>
                      <td>
                        <span className={`badge badge-${commission.type.toLowerCase()}`}>
                          {commission.type}
                        </span>
                      </td>
                      <td className="mono">{commission.fromUser || '—'}</td>
                      <td className="text-right">${commission.amount}</td>
                      <td>
                        <span className={`status-badge status-${commission.status.toLowerCase()}`}>
                          {commission.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'downline' && (
        <div className="tab-content">
          <div className="card">
            <h3>Your Downline</h3>
            <p className="text-secondary mb-lg">
              View your referral network and their performance.
            </p>
            <div className="downline-tree">
              <div className="tree-node root">
                <div className="node-card">
                  <span className="node-icon">👤</span>
                  <span className="node-label">You</span>
                  <span className="node-count">{stats.totalReferrals} referrals</span>
                </div>
                <div className="tree-children">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="tree-node">
                      <div className="node-card">
                        <span className="node-icon">👥</span>
                        <span className="node-label">User {i}</span>
                        <span className="node-count">{Math.floor(Math.random() * 10)} refs</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="error-toast">
          {error}
        </div>
      )}
    </div>
  );
}
