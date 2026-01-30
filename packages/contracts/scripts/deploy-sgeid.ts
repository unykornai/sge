import { ethers } from 'hardhat';

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║           SGE-ID NFT Contract Deployment                 ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log();

  // CRITICAL: Verify we're on mainnet
  if (network.chainId !== 1n) {
    throw new Error(
      `❌ DEPLOYMENT BLOCKED: Not on Ethereum mainnet!\n` +
      `   Current chainId: ${network.chainId}\n` +
      `   Expected: 1 (Ethereum mainnet)\n` +
      `   Check your RPC URL in .env`
    );
  }

  console.log('✅ Network verification passed');
  console.log(`   Chain: ${network.name} (chainId: ${network.chainId})`);
  console.log();

  console.log('Deployer:', deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log('Balance:', ethers.formatEther(balance), 'ETH');
  console.log();

  if (balance < ethers.parseEther('0.05')) {
    console.warn('⚠️  WARNING: Deployer balance is low. Ensure sufficient ETH for gas.');
  }

  console.log('Deploying SGEID contract...');
  const SGEID = await ethers.getContractFactory('SGEID');
  const sgeid = await SGEID.deploy('SGE ID', 'SGEID');
  
  await sgeid.waitForDeployment();
  const address = await sgeid.getAddress();

  console.log();
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║                  DEPLOYMENT SUCCESSFUL                   ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log();
  console.log('📝 Contract Details:');
  console.log('   Name:    SGE ID');
  console.log('   Symbol:  SGEID');
  console.log('   Address:', address);
  console.log('   Owner:  ', deployer.address);
  console.log();
  console.log('🔗 Etherscan:', `https://etherscan.io/address/${address}`);
  console.log();
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║              COPY THIS TO YOUR API .env                  ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log();
  console.log(`SGEID_ADDRESS=${address}`);
  console.log();
  console.log('⚠️  IMPORTANT:');
  console.log('   The deployer wallet must be the same wallet used as');
  console.log('   RELAYER_PRIVATE_KEY in the API for mintTo() to work.');
  console.log();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error();
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  });
