import { createConfig, http } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { coinbaseWallet, walletConnect } from '@wagmi/connectors';
import { env } from './config';

const connectors = [
  coinbaseWallet({
    appName: 'SGE Claim',
    appLogoUrl: undefined,
    preference: 'all',
  }),
];

// Add WalletConnect if project ID is provided
if (env.walletConnectProjectId) {
  connectors.push(
    walletConnect({
      projectId: env.walletConnectProjectId,
      showQrModal: true,
    })
  );
}

export const config = createConfig({
  chains: [mainnet],
  connectors,
  transports: {
    [mainnet.id]: http(env.rpcUrl),
  },
});
