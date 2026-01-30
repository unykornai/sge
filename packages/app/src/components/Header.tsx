import { useConnect, useAccount, useDisconnect } from 'wagmi';

export default function Header() {
  const { connectors, connect } = useConnect();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  return (
    <header style={{ marginBottom: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 style={{ fontSize: '32px', color: 'var(--green-primary)' }}>
          ⚡ SGE Energy
        </h1>
        
        {isConnected ? (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </span>
            <button className="btn btn-secondary" onClick={() => disconnect()}>
              Disconnect
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '12px' }}>
            {connectors.map((connector) => (
              <button
                key={connector.id}
                className="btn"
                onClick={() => connect({ connector })}
              >
                {connector.name}
              </button>
            ))}
          </div>
        )}
      </div>
      
      <p style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>
        Ethereum Mainnet Only • Gasless Minting • $100 USD to Claim 1,000 SGE
      </p>
    </header>
  );
}
