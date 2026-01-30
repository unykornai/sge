import React from 'react';

/**
 * Coinbase Wallet Deep Link Button
 * Opens the current dApp in Coinbase Wallet's in-app browser
 */
export const CoinbaseDeepLink: React.FC<{
  className?: string;
  children?: React.ReactNode;
}> = ({ className, children }) => {
  const handleClick = () => {
    const currentUrl = window.location.origin;
    const deepLink = `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(currentUrl)}`;
    window.open(deepLink, '_blank');
  };

  return (
    <button
      onClick={handleClick}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 24px',
        backgroundColor: '#0052FF',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'background-color 0.2s',
      }}
      onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#0040CC')}
      onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#0052FF')}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="12" fill="white"/>
        <path d="M12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4ZM9.5 10.5C9.5 9.94772 9.94772 9.5 10.5 9.5H13.5C14.0523 9.5 14.5 9.94772 14.5 10.5V13.5C14.5 14.0523 14.0523 14.5 13.5 14.5H10.5C9.94772 14.5 9.5 14.0523 9.5 13.5V10.5Z" fill="#0052FF"/>
      </svg>
      {children || 'Open in Coinbase Wallet'}
    </button>
  );
};

/**
 * Install CTA for users without Coinbase Wallet
 */
export const CoinbaseInstallCTA: React.FC<{
  className?: string;
}> = ({ className }) => {
  return (
    <div className={className} style={{ textAlign: 'center', padding: '16px' }}>
      <p style={{ marginBottom: '12px', color: '#666' }}>
        Don't have Coinbase Wallet?
      </p>
      <a
        href="https://www.coinbase.com/wallet"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 20px',
          backgroundColor: '#f0f0f0',
          color: '#333',
          textDecoration: 'none',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: 500,
        }}
      >
        Download Coinbase Wallet
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
        </svg>
      </a>
    </div>
  );
};

export default CoinbaseDeepLink;
