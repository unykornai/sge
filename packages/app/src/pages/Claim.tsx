import { useState, useEffect } from 'react';
import { useAccount, useChainId, useReadContract, useWriteContract, useWaitForTransactionReceipt, useSimulateContract } from 'wagmi';
import { type Address } from 'viem';
import * as shared from '@sge/shared';
import { env } from '../config';
import AtomicFallback from '../components/AtomicFallback';

const { erc20Abi, claimAbi, FEE_6_DECIMALS } = shared;

type TokenType = 'USDC' | 'USDT';
type ApprovalState = 'idle' | 'resetting' | 'approving' | 'approved' | 'error';
type ClaimState = 'idle' | 'simulating' | 'ready' | 'claiming' | 'claimed' | 'error';

export default function Claim() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  
  const [selectedToken, setSelectedToken] = useState<TokenType>('USDC');
  const [approvalState, setApprovalState] = useState<ApprovalState>('idle');
  const [claimState, setClaimState] = useState<ClaimState>('idle');
  const [error, setError] = useState('');
  const [showFallback, setShowFallback] = useState(false);

  const tokenAddress = selectedToken === 'USDC' ? env.usdc : env.usdt;
  const claimFunction = selectedToken === 'USDC' ? 'claimWithUSDC' : 'claimWithUSDT';

  // Read allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: tokenAddress as Address,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address ? [address, env.sgeClaim as Address] : undefined,
  });

  const currentAllowance = allowance as bigint | undefined;
  const needsApproval = !currentAllowance || currentAllowance < FEE_6_DECIMALS;
  const needsReset = selectedToken === 'USDT' && !!currentAllowance && currentAllowance > 0n && currentAllowance < FEE_6_DECIMALS;

  // Approve hooks
  const { writeContract: approve, data: approveHash } = useWriteContract();
  const { isSuccess: approveSuccess } = useWaitForTransactionReceipt({ hash: approveHash });

  // Claim simulation
  const { data: simulateData, error: simulateError } = useSimulateContract({
    address: env.sgeClaim as Address,
    abi: claimAbi,
    functionName: claimFunction as any,
    query: {
      enabled: !needsApproval && claimState === 'simulating',
    },
  });

  // Claim hooks
  const { writeContract: claim, data: claimHash } = useWriteContract();
  const { isSuccess: claimSuccess } = useWaitForTransactionReceipt({ hash: claimHash });

  // Handle approval success
  useEffect(() => {
    if (approveSuccess) {
      setApprovalState('approved');
      refetchAllowance();
    }
  }, [approveSuccess]);

  // Handle claim success
  useEffect(() => {
    if (claimSuccess) {
      setClaimState('claimed');
    }
  }, [claimSuccess]);

  const handleApprove = async () => {
    setError('');
    
    try {
      if (needsReset) {
        // USDT: Reset to 0 first
        setApprovalState('resetting');
        approve({
          address: tokenAddress as Address,
          abi: erc20Abi,
          functionName: 'approve',
          args: [env.sgeClaim as Address, 0n],
        });
        
        // Wait for reset, then approve
        setTimeout(() => {
          setApprovalState('approving');
          approve({
            address: tokenAddress as Address,
            abi: erc20Abi,
            functionName: 'approve',
            args: [env.sgeClaim as Address, FEE_6_DECIMALS],
          });
        }, 3000);
      } else {
        // Normal approval
        setApprovalState('approving');
        approve({
          address: tokenAddress as Address,
          abi: erc20Abi,
          functionName: 'approve',
          args: [env.sgeClaim as Address, FEE_6_DECIMALS],
        });
      }
    } catch (err: any) {
      setError(err.message || 'Approval failed');
      setApprovalState('error');
    }
  };

  const handleSimulate = () => {
    setError('');
    setClaimState('simulating');

    // Check simulation result
    setTimeout(() => {
      if (simulateError) {
        const errorMsg = simulateError.message.toLowerCase();
        
        if (errorMsg.includes('already claimed')) {
          setError('You have already claimed your SGE tokens');
          setClaimState('error');
        } else if (errorMsg.includes('insufficient')) {
          setError('Insufficient allowance or balance');
          setClaimState('error');
        } else {
          setError('Simulation failed. Try manual claim below.');
          setClaimState('error');
          setShowFallback(true);
        }
      } else if (simulateData) {
        setClaimState('ready');
      }
    }, 1000);
  };

  const handleClaim = async () => {
    setError('');
    setClaimState('claiming');

    try {
      claim({
        address: env.sgeClaim as Address,
        abi: claimAbi,
        functionName: claimFunction as any,
      });
    } catch (err: any) {
      setError(err.message || 'Claim failed');
      setClaimState('error');
      setShowFallback(true);
    }
  };

  if (!isConnected) {
    return (
      <div className="card">
        <h2>Claim SGE Tokens</h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Connect your wallet to claim 1,000 SGE tokens for $100 USD (USDC or USDT).
        </p>
      </div>
    );
  }

  if (chainId !== 1) {
    return (
      <div className="card">
        <h2>Claim SGE Tokens</h2>
        <div className="error">
          Please switch to Ethereum mainnet to claim.
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ marginBottom: '24px' }}>Claim 1,000 SGE Tokens</h2>

      <div className="card">
        <h3 style={{ marginBottom: '16px' }}>Select Payment Token</h3>
        
        <div className="tabs">
          <button
            className={`tab ${selectedToken === 'USDC' ? 'active' : ''}`}
            onClick={() => setSelectedToken('USDC')}
          >
            USDC
          </button>
          <button
            className={`tab ${selectedToken === 'USDT' ? 'active' : ''}`}
            onClick={() => setSelectedToken('USDT')}
          >
            USDT
          </button>
        </div>

        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
          Pay $100 {selectedToken} to receive 1,000 SGE tokens
        </p>

        {/* Approval */}
        {needsApproval && (
          <div>
            <button
              className="btn"
              onClick={handleApprove}
              disabled={approvalState === 'resetting' || approvalState === 'approving'}
            >
              {approvalState === 'resetting' && 'Resetting USDT allowance...'}
              {approvalState === 'approving' && 'Approving...'}
              {(approvalState === 'idle' || approvalState === 'error') && `Approve $100 ${selectedToken}`}
            </button>
            
            {selectedToken === 'USDT' && needsReset && (
              <div className="warning" style={{ marginTop: '12px' }}>
                USDT requires resetting allowance to 0 before new approval
              </div>
            )}
          </div>
        )}

        {/* Claim */}
        {!needsApproval && (
          <div>
            {claimState === 'idle' && (
              <button className="btn" onClick={handleSimulate}>
                Simulate Claim
              </button>
            )}
            
            {claimState === 'simulating' && (
              <button className="btn" disabled>
                <span className="spinner" /> Simulating...
              </button>
            )}
            
            {claimState === 'ready' && (
              <button className="btn" onClick={handleClaim}>
                Claim 1,000 SGE
              </button>
            )}
            
            {claimState === 'claiming' && (
              <button className="btn" disabled>
                <span className="spinner" /> Claiming...
              </button>
            )}
            
            {claimState === 'claimed' && (
              <div className="success">
                <h4>🎉 Success!</h4>
                <p>You have claimed 1,000 SGE tokens!</p>
                {claimHash && (
                  <p>
                    <a href={`https://etherscan.io/tx/${claimHash}`} target="_blank" rel="noopener noreferrer">
                      View on Etherscan →
                    </a>
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="error">
            <strong>Error:</strong> {error}
          </div>
        )}
      </div>

      {showFallback && <AtomicFallback tokenType={selectedToken} />}

      <div className="card">
        <h3 style={{ marginBottom: '12px' }}>How It Works</h3>
        <ol style={{ color: 'var(--text-secondary)', lineHeight: '1.8', marginLeft: '20px' }}>
          <li>Select USDC or USDT as payment token</li>
          <li>Approve $100 worth of tokens (one-time)</li>
          <li>Simulate the claim to verify eligibility</li>
          <li>Execute claim to receive 1,000 SGE tokens</li>
          <li>Tokens are sent directly to your wallet</li>
        </ol>
      </div>
    </div>
  );
}
