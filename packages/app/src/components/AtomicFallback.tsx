import { env } from '../config';

interface Props {
  tokenType: 'USDC' | 'USDT';
}

export default function AtomicFallback({ tokenType }: Props) {
  const tokenAddress = tokenType === 'USDC' ? env.usdc : env.usdt;
  const claimFunction = tokenType === 'USDC' ? 'claimWithUSDC' : 'claimWithUSDT';

  return (
    <div className="card" style={{ background: 'rgba(255, 193, 7, 0.05)', border: '2px solid var(--warning)' }}>
      <h3 style={{ color: 'var(--warning)', marginBottom: '16px' }}>
        🔧 Manual Claim Instructions
      </h3>
      
      <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
        If the automated claim flow isn't working, you can interact directly with the contracts on Etherscan:
      </p>

      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ marginBottom: '12px' }}>Step 1: Approve {tokenType}</h4>
        <ol style={{ marginLeft: '20px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
          <li>
            Open the{' '}
            <a href={`https://etherscan.io/token/${tokenAddress}#writeContract`} target="_blank" rel="noopener noreferrer">
              {tokenType} contract on Etherscan
            </a>
          </li>
          <li>Connect your wallet (click "Connect to Web3")</li>
          <li>Find the <code>approve</code> function</li>
          {tokenType === 'USDT' && (
            <li style={{ color: 'var(--warning)' }}>
              <strong>USDT ONLY:</strong> If you have an existing allowance, first call <code>approve</code> with amount <code>0</code>, wait for confirmation
            </li>
          )}
          <li>
            Call <code>approve</code> with:
            <ul style={{ marginTop: '8px' }}>
              <li>spender: <code>{env.sgeClaim}</code></li>
              <li>amount: <code>100000000</code> (100 USD in 6 decimals)</li>
            </ul>
          </li>
          <li>Confirm the transaction and wait for confirmation</li>
        </ol>
      </div>

      <div>
        <h4 style={{ marginBottom: '12px' }}>Step 2: Call Claim Function</h4>
        <ol style={{ marginLeft: '20px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
          <li>
            Open the{' '}
            <a href={`https://etherscan.io/address/${env.sgeClaim}#writeContract`} target="_blank" rel="noopener noreferrer">
              SGE Claim contract on Etherscan
            </a>
          </li>
          <li>Connect your wallet if not already connected</li>
          <li>Find the <code>{claimFunction}</code> function</li>
          <li>Click "Write" to execute (no parameters needed)</li>
          <li>Confirm the transaction</li>
        </ol>
      </div>

      <div style={{ marginTop: '20px', padding: '12px', background: 'rgba(76, 175, 80, 0.1)', borderRadius: '8px' }}>
        <strong>After successful claim:</strong> You will receive 1,000 SGE tokens in your wallet. 🎉
      </div>
    </div>
  );
}
