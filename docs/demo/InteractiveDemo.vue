<script setup>
import { ref, computed } from 'vue'

// State
const wallet = ref('')
const mode = ref('mock') // 'mock' or 'real'
const apiUrl = ref('https://your-api.example.com')
const step = ref(0)
const loading = ref(false)
const error = ref('')
const success = ref('')

// Mock data
const mockData = {
  register: {
    tokenId: 42,
    txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    etherscanUrl: 'https://etherscan.io/tx/0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
  },
  status: {
    hasNFT: true,
    hasPaid: true,
    eligible: true
  },
  approve: {
    txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
  },
  claim: {
    txHash: '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
    amount: '1000000000000000000000'
  }
}

// Steps
const steps = [
  { id: 0, title: 'Connect', description: 'Enter your wallet address' },
  { id: 1, title: 'Register', description: 'Mint SGE-ID NFT (gasless)' },
  { id: 2, title: 'Status', description: 'Check eligibility' },
  { id: 3, title: 'Approve', description: 'Approve USDC/USDT' },
  { id: 4, title: 'Claim', description: 'Claim SGE tokens' },
  { id: 5, title: 'Complete', description: 'Journey finished!' }
]

// Validate wallet address
const isValidWallet = computed(() => {
  return wallet.value && /^0x[a-fA-F0-9]{40}$/.test(wallet.value)
})

// Simulate delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

// Register
async function register() {
  loading.value = true
  error.value = ''
  success.value = ''
  
  try {
    await delay(1500)
    
    if (mode.value === 'mock') {
      success.value = `✅ SGE-ID #${mockData.register.tokenId} minted!`
      step.value = 2
    } else {
      const res = await fetch(`${apiUrl.value}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: wallet.value })
      })
      const data = await res.json()
      success.value = `✅ SGE-ID #${data.tokenId} minted!`
      step.value = 2
    }
  } catch (err) {
    error.value = `❌ Error: ${err.message}`
  } finally {
    loading.value = false
  }
}

// Check status
async function checkStatus() {
  loading.value = true
  error.value = ''
  success.value = ''
  
  try {
    await delay(1000)
    
    if (mode.value === 'mock') {
      const status = mockData.status
      if (status.eligible) {
        success.value = '✅ Eligible to claim!'
        step.value = 3
      } else {
        error.value = '❌ Not eligible. Need SGE-ID and payment.'
      }
    } else {
      const res = await fetch(`${apiUrl.value}/api/status?wallet=${wallet.value}`)
      const data = await res.json()
      if (data.eligible) {
        success.value = '✅ Eligible to claim!'
        step.value = 3
      } else {
        error.value = '❌ Not eligible'
      }
    }
  } catch (err) {
    error.value = `❌ Error: ${err.message}`
  } finally {
    loading.value = false
  }
}

// Approve
async function approve() {
  loading.value = true
  error.value = ''
  success.value = ''
  
  try {
    await delay(2000)
    
    if (mode.value === 'mock') {
      success.value = `✅ Approval confirmed! Tx: ${mockData.approve.txHash.slice(0, 10)}...`
      step.value = 4
    } else {
      // Real mode would trigger wallet signing
      error.value = '⚠️ Real mode requires wallet integration'
    }
  } catch (err) {
    error.value = `❌ Error: ${err.message}`
  } finally {
    loading.value = false
  }
}

// Claim
async function claim() {
  loading.value = true
  error.value = ''
  success.value = ''
  
  try {
    await delay(2500)
    
    if (mode.value === 'mock') {
      success.value = `✅ Claimed 1000 SGE tokens! Tx: ${mockData.claim.txHash.slice(0, 10)}...`
      step.value = 5
    } else {
      error.value = '⚠️ Real mode requires wallet integration'
    }
  } catch (err) {
    error.value = `❌ Error: ${err.message}`
  } finally {
    loading.value = false
  }
}

// Reset
function reset() {
  step.value = 0
  error.value = ''
  success.value = ''
  wallet.value = ''
}
</script>

<template>
  <div class="demo-container">
    <h1>🚀 Interactive Demo</h1>
    <p class="subtitle">Experience the complete SGE claim flow in your browser</p>
    
    <!-- Mode Toggle -->
    <div class="mode-toggle">
      <label>
        <input type="radio" v-model="mode" value="mock" /> 
        <span class="badge badge-success">Mock Mode</span>
        (Simulated, always works)
      </label>
      <label>
        <input type="radio" v-model="mode" value="real" /> 
        <span class="badge badge-warning">Real Mode</span>
        (Live API, requires config)
      </label>
    </div>
    
    <!-- Real Mode Config -->
    <div v-if="mode === 'real'" class="api-config">
      <label>API URL:</label>
      <input v-model="apiUrl" type="text" placeholder="https://your-api.example.com" />
      <p class="note">⚠️ Real mode requires wallet integration and funded relayer</p>
    </div>
    
    <!-- Progress Steps -->
    <div class="steps">
      <div 
        v-for="s in steps" 
        :key="s.id" 
        class="step"
        :class="{ active: step === s.id, completed: step > s.id }"
      >
        <div class="step-icon">{{ step > s.id ? '✓' : s.id + 1 }}</div>
        <div class="step-content">
          <div class="step-title">{{ s.title }}</div>
          <div class="step-description">{{ s.description }}</div>
        </div>
      </div>
    </div>
    
    <!-- Wallet Input -->
    <div v-if="step === 0" class="action-panel">
      <h3>Enter Wallet Address</h3>
      <input 
        v-model="wallet" 
        type="text" 
        placeholder="0x..." 
        class="wallet-input"
      />
      <button 
        @click="step = 1" 
        :disabled="!isValidWallet"
        class="btn btn-primary"
      >
        Connect →
      </button>
    </div>
    
    <!-- Register -->
    <div v-if="step === 1" class="action-panel">
      <h3>Register for SGE-ID NFT</h3>
      <p>Gasless mint • Relayer pays gas • Free for you</p>
      <button 
        @click="register" 
        :disabled="loading"
        class="btn btn-success"
      >
        {{ loading ? 'Minting...' : 'Mint SGE-ID (Gasless)' }}
      </button>
    </div>
    
    <!-- Status Check -->
    <div v-if="step === 2" class="action-panel">
      <h3>Check Claim Eligibility</h3>
      <p>Verifying NFT ownership and payment status...</p>
      <button 
        @click="checkStatus" 
        :disabled="loading"
        class="btn btn-primary"
      >
        {{ loading ? 'Checking...' : 'Check Status' }}
      </button>
    </div>
    
    <!-- Approve -->
    <div v-if="step === 3" class="action-panel">
      <h3>Approve USDC/USDT</h3>
      <p>Set allowance for Claim contract to spend your stablecoins</p>
      <button 
        @click="approve" 
        :disabled="loading"
        class="btn btn-warning"
      >
        {{ loading ? 'Approving...' : 'Approve Tokens' }}
      </button>
    </div>
    
    <!-- Claim -->
    <div v-if="step === 4" class="action-panel">
      <h3>Claim SGE Tokens</h3>
      <p>Execute the claim transaction to receive your SGE tokens</p>
      <button 
        @click="claim" 
        :disabled="loading"
        class="btn btn-success"
      >
        {{ loading ? 'Claiming...' : 'Claim SGE Tokens' }}
      </button>
    </div>
    
    <!-- Complete -->
    <div v-if="step === 5" class="action-panel complete">
      <h3>🎉 Journey Complete!</h3>
      <p>You've successfully claimed your SGE tokens</p>
      <div class="summary">
        <div class="summary-item">
          <strong>Wallet:</strong> {{ wallet }}
        </div>
        <div class="summary-item">
          <strong>NFT:</strong> SGE-ID #{{ mockData.register.tokenId }}
        </div>
        <div class="summary-item">
          <strong>Claimed:</strong> 1000 SGE
        </div>
      </div>
      <button @click="reset" class="btn btn-secondary">
        Try Again
      </button>
    </div>
    
    <!-- Messages -->
    <div v-if="error" class="message error">{{ error }}</div>
    <div v-if="success" class="message success">{{ success }}</div>
    
    <!-- Info -->
    <div class="info-box">
      <h4>ℹ️ About This Demo</h4>
      <ul>
        <li><strong>Mock Mode:</strong> Simulates the complete flow with fake transactions</li>
        <li><strong>Real Mode:</strong> Connects to live API (requires wallet integration)</li>
        <li><strong>Gasless:</strong> NFT minting is paid by the relayer, not you</li>
        <li><strong>Mainnet:</strong> All transactions happen on Ethereum mainnet</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.demo-container {
  max-width: 800px;
  margin: 2rem auto;
  padding: 2rem;
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
  border: 1px solid var(--vp-c-divider);
}

.subtitle {
  color: var(--vp-c-text-2);
  margin-bottom: 2rem;
}

.mode-toggle {
  display: flex;
  gap: 2rem;
  margin-bottom: 2rem;
  padding: 1rem;
  background: var(--vp-c-bg);
  border-radius: 8px;
}

.mode-toggle label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.badge {
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 600;
}

.badge-success {
  background: rgba(34, 197, 94, 0.2);
  color: #22c55e;
}

.badge-warning {
  background: rgba(245, 158, 11, 0.2);
  color: #f59e0b;
}

.api-config {
  margin-bottom: 2rem;
  padding: 1rem;
  background: rgba(245, 158, 11, 0.1);
  border-left: 4px solid #f59e0b;
  border-radius: 4px;
}

.api-config input {
  width: 100%;
  padding: 0.5rem;
  margin: 0.5rem 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
}

.note {
  font-size: 0.875rem;
  color: var(--vp-c-text-2);
  margin-top: 0.5rem;
}

.steps {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin: 2rem 0;
}

.step {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--vp-c-bg);
  border-radius: 8px;
  border: 2px solid transparent;
  transition: all 0.3s ease;
}

.step.active {
  border-color: var(--vp-c-brand);
  background: rgba(34, 197, 94, 0.05);
}

.step.completed {
  opacity: 0.7;
}

.step-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--vp-c-bg-soft);
  border-radius: 50%;
  font-weight: 600;
}

.step.active .step-icon {
  background: var(--vp-c-brand);
  color: white;
}

.step.completed .step-icon {
  background: #22c55e;
  color: white;
}

.step-content {
  flex: 1;
}

.step-title {
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.step-description {
  font-size: 0.875rem;
  color: var(--vp-c-text-2);
}

.action-panel {
  padding: 2rem;
  background: var(--vp-c-bg);
  border-radius: 8px;
  margin: 2rem 0;
  text-align: center;
}

.action-panel h3 {
  margin-bottom: 1rem;
}

.wallet-input {
  width: 100%;
  padding: 0.75rem;
  margin: 1rem 0;
  border: 2px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  font-family: monospace;
}

.btn {
  padding: 0.75rem 2rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 1rem;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--vp-c-brand);
  color: white;
}

.btn-success {
  background: #22c55e;
  color: white;
}

.btn-warning {
  background: #f59e0b;
  color: white;
}

.btn-secondary {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
}

.btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.complete {
  background: rgba(34, 197, 94, 0.1);
}

.summary {
  margin: 2rem 0;
  text-align: left;
}

.summary-item {
  padding: 0.75rem;
  background: var(--vp-c-bg-soft);
  border-radius: 4px;
  margin-bottom: 0.5rem;
  font-family: monospace;
  font-size: 0.875rem;
}

.message {
  padding: 1rem;
  border-radius: 8px;
  margin: 1rem 0;
  font-weight: 500;
}

.message.error {
  background: rgba(239, 68, 68, 0.1);
  border-left: 4px solid #ef4444;
  color: #ef4444;
}

.message.success {
  background: rgba(34, 197, 94, 0.1);
  border-left: 4px solid #22c55e;
  color: #22c55e;
}

.info-box {
  margin-top: 3rem;
  padding: 1.5rem;
  background: rgba(59, 130, 246, 0.05);
  border-left: 4px solid #3b82f6;
  border-radius: 4px;
}

.info-box h4 {
  margin-top: 0;
  color: #3b82f6;
}

.info-box ul {
  margin: 0;
  padding-left: 1.5rem;
}

.info-box li {
  margin-bottom: 0.5rem;
  color: var(--vp-c-text-2);
}
</style>
