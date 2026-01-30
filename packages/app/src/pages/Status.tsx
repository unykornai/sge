import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { env } from '../config';

interface Stats {
  totalMints: number;
  totalClaims: number;
  totalPayments: number;
  last24hMints: number;
  last24hClaims: number;
  timeseries: Array<{ date: string; mints: number; claims: number }>;
}

interface HealthData {
  ok: boolean;
  chainId: number;
  blockNumber: number;
  mode: 'mock' | 'mainnet';
  relayerAddress?: string;
  relayerBalance?: string;
  featureGates?: {
    kycRequired: boolean;
    commerceRequired: boolean;
    mockMode: boolean;
  };
}

export default function Status() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [healthRes, statsRes] = await Promise.all([
          fetch('/api/healthz'),
          fetch('/api/admin/stats').catch(() => null)
        ]);

        const healthData = await healthRes.json();
        setHealth(healthData);

        if (statsRes?.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        } else {
          // Mock stats for demo
          setStats({
            totalMints: 1247,
            totalClaims: 892,
            totalPayments: 892,
            last24hMints: 34,
            last24hClaims: 28,
            timeseries: generateMockTimeseries()
          });
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
        <span className="spinner" />
        <p style={{ marginTop: 'var(--space-md)', color: 'var(--text-secondary)' }}>
          Loading system status...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <span className="alert-icon">⚠️</span>
        <div className="alert-content">
          <div className="alert-title">Failed to load status</div>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* System Health Overview */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">System Health</h3>
          <span className={`badge ${health?.ok ? 'badge-success' : 'badge-error'}`}>
            <span className={`status-dot ${health?.ok ? 'online' : 'offline'}`} />
            {health?.ok ? 'All Systems Operational' : 'Issues Detected'}
          </span>
        </div>

        <div className="status-strip" style={{ marginTop: 'var(--space-md)' }}>
          <div className="status-item">
            <span className="status-label">Chain ID:</span>
            <span className="status-value">{health?.chainId || '—'}</span>
          </div>
          <div className="status-item">
            <span className="status-label">Block:</span>
            <span className="status-value">
              {health?.blockNumber ? `#${health.blockNumber.toLocaleString()}` : '—'}
            </span>
          </div>
          <div className="status-item">
            <span className="status-label">Mode:</span>
            <span className={`badge ${health?.mode === 'mock' ? 'badge-info' : 'badge-success'}`}>
              {health?.mode === 'mock' ? 'Demo' : 'Mainnet'}
            </span>
          </div>
        </div>
      </div>

      {/* Feature Gates */}
      <div className="card">
        <h3 className="card-title" style={{ marginBottom: 'var(--space-md)' }}>Feature Gates</h3>
        <div className="status-strip">
          <div className="status-item">
            <span className={`status-dot ${health?.featureGates?.kycRequired ? 'warning' : 'online'}`} />
            <span className="status-label">KYC Required:</span>
            <span className="status-value">{health?.featureGates?.kycRequired ? 'Yes' : 'No'}</span>
          </div>
          <div className="status-item">
            <span className={`status-dot ${health?.featureGates?.commerceRequired ? 'warning' : 'online'}`} />
            <span className="status-label">Commerce Required:</span>
            <span className="status-value">{health?.featureGates?.commerceRequired ? 'Yes' : 'No'}</span>
          </div>
          <div className="status-item">
            <span className={`status-dot ${health?.featureGates?.mockMode ? 'warning' : 'online'}`} />
            <span className="status-label">Mock Mode:</span>
            <span className="status-value">{health?.featureGates?.mockMode ? 'Enabled' : 'Disabled'}</span>
          </div>
        </div>
      </div>

      {/* Contract Addresses */}
      <div className="card">
        <h3 className="card-title" style={{ marginBottom: 'var(--space-md)' }}>Contract Addresses</h3>
        <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
          <ContractRow label="SGE Token" address={env.sgeToken} />
          <ContractRow label="SGE Claim" address={env.sgeClaim} />
          <ContractRow label="USDC" address={env.usdc} />
          <ContractRow label="USDT" address={env.usdt} />
        </div>
      </div>

      {/* Stats Summary */}
      {stats && (
        <div className="two-column">
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 'var(--space-md)' }}>Registrations</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-lg)' }}>
              <div>
                <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--green-primary)' }}>
                  {stats.totalMints.toLocaleString()}
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Total Mints</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--text-primary)' }}>
                  +{stats.last24hMints}
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Last 24h</div>
              </div>
            </div>
            <div className="chart-container">
              <div className="chart-title">Registrations (7d)</div>
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={stats.timeseries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'var(--bg-card)', 
                      border: '1px solid var(--border)',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="mints" 
                    stroke="var(--green-primary)" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 'var(--space-md)' }}>Claims</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-lg)' }}>
              <div>
                <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--green-primary)' }}>
                  {stats.totalClaims.toLocaleString()}
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Total Claims</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--text-primary)' }}>
                  +{stats.last24hClaims}
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Last 24h</div>
              </div>
            </div>
            <div className="chart-container">
              <div className="chart-title">Claims (7d)</div>
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={stats.timeseries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'var(--bg-card)', 
                      border: '1px solid var(--border)',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="claims" 
                    stroke="var(--info)" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ContractRow({ label, address }: { label: string; address: string }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      padding: 'var(--space-sm) 0',
      borderBottom: '1px solid var(--border)'
    }}>
      <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{label}</span>
      <div className="address-display" style={{ fontSize: '12px' }}>
        <a 
          href={`https://etherscan.io/address/${address}`} 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {address.slice(0, 6)}...{address.slice(-4)}
        </a>
        <button className="copy-btn" onClick={copyToClipboard} title="Copy address">
          {copied ? '✓' : '📋'}
        </button>
      </div>
    </div>
  );
}

function generateMockTimeseries() {
  const data = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      mints: Math.floor(Math.random() * 50) + 20,
      claims: Math.floor(Math.random() * 40) + 15
    });
  }
  return data;
}
