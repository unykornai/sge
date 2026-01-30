<script setup>
import { ref, onMounted } from 'vue'

const mode = ref('mock')
const apiUrl = ref('https://your-api.example.com')
const health = ref(null)
const loading = ref(false)
const error = ref('')

// Mock data
const mockHealth = {
  ok: true,
  chainId: 1,
  blockNumber: 19105234,
  signerAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  sgeidAddress: '0xB0FD9bf45fF6FbF1A8b8D0F6D7d1234567890ABC',
  sgeidOwner: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  claimAddress: '0x4BFeF695a5f85a65E1Aa6015439f317494477D09',
  hasClaimCode: true,
  hasSgeidCode: true
}

const mockStats = {
  totalMints: 1247,
  totalClaims: 892,
  totalPayments: 1105,
  successRate: 71.5,
  avgClaimTime: '2.4 minutes'
}

const mockBlockHistory = [
  { time: '10:00', block: 19105180 },
  { time: '10:05', block: 19105205 },
  { time: '10:10', block: 19105220 },
  { time: '10:15', block: 19105234 }
]

const mockFunnel = [
  { stage: 'Visited', count: 2500, color: '#3b82f6' },
  { stage: 'Connected Wallet', count: 1800, color: '#22c55e' },
  { stage: 'Registered (NFT)', count: 1247, color: '#f59e0b' },
  { stage: 'Paid', count: 1105, color: '#8b5cf6' },
  { stage: 'Claimed', count: 892, color: '#22c55e' }
]

async function fetchHealth() {
  loading.value = true
  error.value = ''
  
  try {
    if (mode.value === 'mock') {
      await new Promise(resolve => setTimeout(resolve, 500))
      health.value = mockHealth
    } else {
      const res = await fetch(`${apiUrl.value}/healthz`)
      health.value = await res.json()
    }
  } catch (err) {
    error.value = `Failed to fetch health: ${err.message}`
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchHealth()
})
</script>

<template>
  <div class="dashboard">
    <h1>📊 System Dashboard</h1>
    <p class="subtitle">Real-time monitoring of the SGE claim platform</p>
    
    <!-- Mode Toggle -->
    <div class="mode-toggle">
      <label>
        <input type="radio" v-model="mode" value="mock" @change="fetchHealth" /> 
        <span class="badge badge-success">Mock Data</span>
      </label>
      <label>
        <input type="radio" v-model="mode" value="real" @change="fetchHealth" /> 
        <span class="badge badge-warning">Live API</span>
      </label>
    </div>
    
    <!--  API Config for Real Mode -->
    <div v-if="mode === 'real'" class="api-config">
      <label>API URL:</label>
      <input v-model="apiUrl" type="text" placeholder="https://your-api.example.com" />
      <button @click="fetchHealth" class="btn-small">Refresh</button>
    </div>
    
    <!-- Health Status -->
    <div v-if="health" class="health-section">
      <h2>System Health</h2>
      <div class="health-grid">
        <div class="health-card" :class="{ healthy: health.ok, unhealthy: !health.ok }">
          <div class="health-icon">{{ health.ok ? '✅' : '❌' }}</div>
          <div class="health-title">Overall Status</div>
          <div class="health-value">{{ health.ok ? 'Healthy' : 'Degraded' }}</div>
        </div>
        
        <div class="health-card">
          <div class="health-icon">⛓️</div>
          <div class="health-title">Network</div>
          <div class="health-value">Mainnet ({{ health.chainId }})</div>
        </div>
        
        <div class="health-card">
          <div class="health-icon">🔢</div>
          <div class="health-title">Latest Block</div>
          <div class="health-value">{{ health.blockNumber.toLocaleString() }}</div>
        </div>
        
        <div class="health-card">
          <div class="health-icon">👤</div>
          <div class="health-title">Relayer</div>
          <div class="health-value">{{ health.signerAddress.slice(0, 6) }}...{{ health.signerAddress.slice(-4) }}</div>
        </div>
        
        <div class="health-card" :class="{ healthy: health.hasSgeidCode }">
          <div class="health-icon">{{ health.hasSgeidCode ? '✅' : '❌' }}</div>
          <div class="health-title">SGEID Contract</div>
          <div class="health-value">{{ health.hasSgeidCode ? 'Deployed' : 'Not Found' }}</div>
        </div>
        
        <div class="health-card" :class="{ healthy: health.hasClaimCode }">
          <div class="health-icon">{{ health.hasClaimCode ? '✅' : '❌' }}</div>
          <div class="health-title">Claim Contract</div>
          <div class="health-value">{{ health.hasClaimCode ? 'Deployed' : 'Not Found' }}</div>
        </div>
      </div>
    </div>
    
    <!-- Stats Overview -->
    <div class="stats-section">
      <h2>Platform Statistics</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">🎫</div>
          <div class="stat-value">{{ mockStats.totalMints.toLocaleString() }}</div>
          <div class="stat-label">Total NFTs Minted</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">🎯</div>
          <div class="stat-value">{{ mockStats.totalClaims.toLocaleString() }}</div>
          <div class="stat-label">Total Claims</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">💳</div>
          <div class="stat-value">{{ mockStats.totalPayments.toLocaleString() }}</div>
          <div class="stat-label">Payments Processed</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">📈</div>
          <div class="stat-value">{{ mockStats.successRate }}%</div>
          <div class="stat-label">Success Rate</div>
        </div>
      </div>
    </div>
    
    <!-- Block Progress Chart -->
    <div class="chart-section">
      <h2>RPC Block Progress</h2>
      <div class="simple-chart">
        <div 
          v-for="(item, idx) in mockBlockHistory" 
          :key="idx"
          class="chart-bar"
          :style="{ 
            height: `${((item.block - 19105150) / 100) * 100}%`,
            width: `${100 / mockBlockHistory.length}%`
          }"
        >
          <div class="chart-label">{{ item.time }}</div>
          <div class="chart-value">{{ item.block }}</div>
        </div>
      </div>
    </div>
    
    <!-- Funnel Chart -->
    <div class="chart-section">
      <h2>User Journey Funnel</h2>
      <div class="funnel">
        <div 
          v-for="(stage, idx) in mockFunnel" 
          :key="idx"
          class="funnel-stage"
          :style="{ 
            width: `${(stage.count / mockFunnel[0].count) * 100}%`,
            background: stage.color
          }"
        >
          <span class="funnel-label">{{ stage.stage }}</span>
          <span class="funnel-count">{{ stage.count }}</span>
        </div>
      </div>
      <div class="funnel-stats">
        <p><strong>Conversion Rate (Visit → Claim):</strong> {{ ((mockFunnel[4].count / mockFunnel[0].count) * 100).toFixed(1) }}%</p>
        <p><strong>Average Claim Time:</strong> {{ mockStats.avgClaimTime }}</p>
      </div>
    </div>
    
    <!-- Error Message -->
    <div v-if="error" class="error-message">{{ error }}</div>
  </div>
</template>

<style scoped>
.dashboard {
  max-width: 1200px;
  margin: 2rem auto;
  padding: 2rem;
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
  background: var(--vp-c-bg-soft);
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
  display: flex;
  gap: 1rem;
  align-items: center;
}

.api-config input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
}

.btn-small {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  background: var(--vp-c-brand);
  color: white;
  cursor: pointer;
  font-weight: 600;
}

.health-section, .stats-section, .chart-section {
  margin: 3rem 0;
}

.health-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.health-card {
  padding: 1.5rem;
  background: var(--vp-c-bg-soft);
  border-radius: 8px;
  border: 2px solid var(--vp-c-divider);
  text-align: center;
  transition: all 0.3s ease;
}

.health-card.healthy {
  border-color: #22c55e;
  background: rgba(34, 197, 94, 0.05);
}

.health-card.unhealthy {
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.05);
}

.health-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.health-title {
  font-size: 0.875rem;
  color: var(--vp-c-text-2);
  margin-bottom: 0.5rem;
}

.health-value {
  font-weight: 600;
  font-size: 1.125rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-top: 1rem;
}

.stat-card {
  padding: 2rem;
  background: linear-gradient(135deg, var(--vp-c-bg-soft) 0%, var(--vp-c-bg) 100%);
  border-radius: 12px;
  border: 1px solid var(--vp-c-divider);
  text-align: center;
}

.stat-icon {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.stat-value {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--vp-c-brand);
  margin-bottom: 0.5rem;
}

.stat-label {
  color: var(--vp-c-text-2);
  font-size: 0.875rem;
}

.simple-chart {
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  height: 300px;
  padding: 2rem;
  background: var(--vp-c-bg-soft);
  border-radius: 8px;
  margin-top: 1rem;
}

.chart-bar {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  background: linear-gradient(to top, #22c55e, #3b82f6);
  border-radius: 8px 8px 0 0;
  padding: 0.5rem;
  transition: all 0.3s ease;
}

.chart-bar:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
}

.chart-label {
  font-size: 0.75rem;
  color: var(--vp-c-text-2);
  margin-bottom: 0.5rem;
}

.chart-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: white;
}

.funnel {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1rem;
}

.funnel-stage {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  border-radius: 8px;
  color: white;
  font-weight: 600;
  transition: all 0.3s ease;
  margin: 0 auto;
}

.funnel-stage:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.funnel-stats {
  margin-top: 2rem;
  padding: 1.5rem;
  background: rgba(59, 130, 246, 0.05);
  border-left: 4px solid #3b82f6;
  border-radius: 4px;
}

.funnel-stats p {
  margin: 0.5rem 0;
}

.error-message {
  padding: 1rem;
  background: rgba(239, 68, 68, 0.1);
  border-left: 4px solid #ef4444;
  border-radius: 4px;
  color: #ef4444;
  margin-top: 2rem;
}
</style>
