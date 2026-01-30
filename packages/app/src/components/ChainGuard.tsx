import { useSwitchChain } from 'wagmi';

export default function ChainGuard() {
  const { switchChain } = useSwitchChain();

  return (
    <div className="warning">
      <h3>⚠️ Wrong Network</h3>
      <p>This application only works on Ethereum mainnet.</p>
      <button
        className="btn"
        onClick={() => switchChain({ chainId: 1 })}
        style={{ marginTop: '12px' }}
      >
        Switch to Ethereum Mainnet
      </button>
    </div>
  );
}
