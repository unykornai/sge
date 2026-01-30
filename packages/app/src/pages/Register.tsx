import { useState } from 'react';
import { useAccount } from 'wagmi';
import { isAddress } from 'viem';
import { Link } from 'react-router-dom';
import StatusStrip from '../components/StatusStrip';

export default function Register() {
  const { address, isConnected } = useAccount();
  const [manualWallet, setManualWallet] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  const walletToUse = isConnected ? address : manualWallet;

  const handleRegister = async () => {
    setError('');
    setResult(null);

    if (!walletToUse || !isAddress(walletToUse)) {
      setError('Please provide a valid Ethereum address');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: walletToUse }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="two-column">
        {/* Left Column - Action Card */}
        <div>
          <div className="card card-glow">
            <div className="card-header">
              <h3 className="card-title">SGE-ID Registration</h3>
              <span className="badge badge-success">FREE</span>
            </div>
            <p className="card-subtitle" style={{ marginBottom: 'var(--space-lg)' }}>
              Gasless minting powered by a relayer. You pay <strong>$0</strong> gas.
            </p>

            {!isConnected && (
              <div className="input-group">
                <label className="input-label">Ethereum Address</label>
                <input
                  type="text"
                  className="input"
                  placeholder="0x..."
                  value={manualWallet}
                  onChange={(e) => setManualWallet(e.target.value)}
                />
                <p className="input-helper">Paste your address or connect a wallet above</p>
              </div>
            )}

            {isConnected && (
              <div className="address-display" style={{ marginBottom: 'var(--space-lg)', width: '100%' }}>
                <span style={{ color: 'var(--success)' }}>●</span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {address}
                </span>
              </div>
            )}

            <button
              className="btn btn-lg btn-full"
              onClick={handleRegister}
              disabled={loading || !walletToUse}
            >
              {loading ? <span className="spinner" /> : '⚡ Mint SGE-ID (Free)'}
            </button>
            <p className="input-helper" style={{ textAlign: 'center', marginTop: 'var(--space-sm)' }}>
              Transaction will be submitted by the relayer. You'll receive an Etherscan link.
            </p>

            {error && (
              <div className="alert alert-error" style={{ marginTop: 'var(--space-md)' }}>
                <span className="alert-icon">⚠️</span>
                <div className="alert-content">
                  <div className="alert-title">Error</div>
                  {error}
                </div>
              </div>
            )}

            {result && (
              <div className="alert alert-success" style={{ marginTop: 'var(--space-md)' }}>
                <span className="alert-icon">✅</span>
                <div className="alert-content">
                  <div className="alert-title">Success!</div>
                  <p>Token ID: <strong>#{result.tokenId}</strong></p>
                  <p style={{ marginTop: 'var(--space-sm)' }}>
                    <a href={result.etherscanUrl} target="_blank" rel="noopener noreferrer">
                      View on Etherscan →
                    </a>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Info & Status */}
        <div>
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 'var(--space-md)' }}>
              What is SGE-ID?
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
              <strong>SGE-ID is your identity NFT on Ethereum mainnet.</strong>
            </p>
            <ul className="feature-list">
              <li>One per wallet (anti-duplication)</li>
              <li>Required to access SGE claim features</li>
              <li>Non-custodial, wallet-owned</li>
              <li>Mint is gas-sponsored (relayer pays)</li>
            </ul>
          </div>

          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 'var(--space-md)' }}>
              Live System Status
            </h3>
            <StatusStrip />
            <div style={{ marginTop: 'var(--space-md)', textAlign: 'center' }}>
              <Link to="/status" style={{ color: 'var(--primary)', fontWeight: 500 }}>
                View Full System Status →
              </Link>
            </div>
          </div>

          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <span>⚠️</span> Important Disclosures
            </h3>
            <ul className="disclosure-list">
              <li>
                <strong>36-Month Rewards Period:</strong> Rewards vest over 36 months; distribution schedule may vary by market conditions.
              </li>
              <li>
                <strong>Market Risk:</strong> Digital assets are volatile. Participate only with funds you can afford to lose.
              </li>
              <li>
                <strong>KYC/Compliance:</strong> Verification may be required depending on jurisdiction, volume, or payment method.
              </li>
              <li>
                <strong>Mainnet Only:</strong> This app supports Ethereum mainnet only. No testnets.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
