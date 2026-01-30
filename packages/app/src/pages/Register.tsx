import { useState } from 'react';
import { useAccount } from 'wagmi';
import { isAddress } from 'viem';
import { etherscanTx } from '@sge/shared';

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
      <h2 style={{ marginBottom: '24px' }}>Register for SGE-ID NFT</h2>

      <div className="card">
        <h3 style={{ marginBottom: '16px' }}>Gasless Minting</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
          Get your SGE-ID NFT for free! Gas fees are paid by the relayer.
        </p>

        {!isConnected && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>
              Enter your Ethereum address:
            </label>
            <input
              type="text"
              className="input"
              placeholder="0x..."
              value={manualWallet}
              onChange={(e) => setManualWallet(e.target.value)}
            />
          </div>
        )}

        {isConnected && (
          <div style={{ marginBottom: '20px', padding: '12px', background: 'rgba(18, 184, 134, 0.1)', borderRadius: '8px' }}>
            <strong>Connected wallet:</strong> {address}
          </div>
        )}

        <button
          className="btn"
          onClick={handleRegister}
          disabled={loading || !walletToUse}
        >
          {loading ? <span className="spinner" /> : 'Mint SGE-ID NFT'}
        </button>

        {error && (
          <div className="error">
            <strong>Error:</strong> {error}
          </div>
        )}

        {result && (
          <div className="success">
            <h4>✅ Success!</h4>
            <p>Token ID: <strong>#{result.tokenId}</strong></p>
            <p>
              <a href={result.etherscanUrl} target="_blank" rel="noopener noreferrer">
                View on Etherscan →
              </a>
            </p>
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '12px' }}>What is SGE-ID?</h3>
        <ul style={{ color: 'var(--text-secondary)', lineHeight: '1.8', marginLeft: '20px' }}>
          <li>Your unique identity NFT on Ethereum mainnet</li>
          <li>Required for participating in SGE ecosystem</li>
          <li>One NFT per wallet</li>
          <li>Completely free - gas paid by relayer</li>
        </ul>
      </div>
    </div>
  );
}
