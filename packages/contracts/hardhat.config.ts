import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import '@nomicfoundation/hardhat-ethers';
import * as dotenv from 'dotenv';

dotenv.config();

const ETH_RPC_HTTPS = process.env.ETH_RPC_HTTPS;
const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY;

if (!ETH_RPC_HTTPS) {
  throw new Error('ETH_RPC_HTTPS is required in .env');
}

if (!RELAYER_PRIVATE_KEY) {
  throw new Error('RELAYER_PRIVATE_KEY is required in .env');
}

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.23',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    mainnet: {
      url: ETH_RPC_HTTPS,
      accounts: [RELAYER_PRIVATE_KEY],
      chainId: 1,
    },
  },
};

export default config;
