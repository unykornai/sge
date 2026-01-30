export default function Footer() {
  return (
    <footer className="footer">
      <div style={{ marginBottom: '16px' }}>
        <strong>⚠️ Important Disclosures</strong>
      </div>
      
      <div style={{ marginBottom: '12px' }}>
        <strong>36-Month Rewards Period:</strong> SGE token rewards are distributed over a 36-month vesting period.
      </div>
      
      <div style={{ marginBottom: '12px' }}>
        <strong>Market Risk:</strong> Cryptocurrency investments are highly volatile and speculative.
        Only invest what you can afford to lose.
      </div>
      
      <div style={{ marginBottom: '12px' }}>
        <strong>KYC Requirements:</strong> Know Your Customer verification may be required based on
        your jurisdiction and transaction volume.
      </div>
      
      <div style={{ marginBottom: '12px' }}>
        <strong>Mainnet Only:</strong> This application operates exclusively on Ethereum mainnet (chainId 1).
        No testnet or other chains are supported.
      </div>
      
      <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
        <a href="https://etherscan.io" target="_blank" rel="noopener noreferrer">
          Etherscan
        </a>
        {' • '}
        <a href="https://www.coinbase.com/wallet" target="_blank" rel="noopener noreferrer">
          Coinbase Wallet
        </a>
      </div>
      
      <div style={{ marginTop: '12px', fontSize: '12px' }}>
        © {new Date().getFullYear()} SGE Energy. All rights reserved.
      </div>
    </footer>
  );
}
