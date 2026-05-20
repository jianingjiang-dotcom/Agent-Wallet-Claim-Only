// Mock data for WalletConnect sessions and activity

import {
  DappSession, SessionActivity, DappMetadata, WCMethod,
  WC_SESSION_TTL_MS, WC_SESSION_EXPIRING_SOON_MS,
} from '@/types/walletconnect';

// ─── Mock dApp directory ────────────────────────────────────────────────────

export const MOCK_DAPPS: Record<string, DappMetadata> = {
  uniswap: {
    name: 'Uniswap',
    url: 'https://app.uniswap.org',
    icon: '🦄',
    description: '去中心化交易协议',
  },
  opensea: {
    name: 'OpenSea',
    url: 'https://opensea.io',
    icon: '🌊',
    description: 'NFT 交易市场',
  },
  aave: {
    name: 'Aave',
    url: 'https://app.aave.com',
    icon: '👻',
    description: '去中心化借贷协议',
  },
  hyperliquid: {
    name: 'Hyperliquid',
    url: 'https://app.hyperliquid.xyz',
    icon: '⚡',
    description: '链上永续合约交易',
  },
  polymarket: {
    name: 'Polymarket',
    url: 'https://polymarket.com',
    icon: '🎯',
    description: '去中心化预测市场',
  },
};

const STD_METHODS: WCMethod[] = [
  'personal_sign',
  'eth_signTypedData_v4',
  'eth_sendTransaction',
  'wallet_switchEthereumChain',
];

// ─── History of dApps the user has connected before ─────────────────────────
// Used to determine "first-time connect" vs "re-connect"

export const PREVIOUSLY_CONNECTED_DAPPS = new Set<string>([
  'https://app.uniswap.org',
]);

// ─── Initial mock sessions (preloaded for demo) ─────────────────────────────

export function getInitialMockSessions(
  walletIds: string[],
  defaultAddressIdByWallet?: Record<string, string>,
): DappSession[] {
  if (walletIds.length === 0) return [];
  const primary = walletIds[0];
  const primaryAddrId = defaultAddressIdByWallet?.[primary] || 'addr-evm-1';
  const now = Date.now();

  const sessions: DappSession[] = [
    {
      id: 'wc-session-1',
      topic: 'topic-uniswap-' + Math.random().toString(36).slice(2, 10),
      dapp: MOCK_DAPPS.uniswap,
      walletId: primary,
      walletAddressId: primaryAddrId,
      chains: ['ethereum', 'bsc'],
      methods: STD_METHODS,
      connectedAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
      expiresAt: new Date(now - 2 * 24 * 60 * 60 * 1000 + WC_SESSION_TTL_MS),
      status: 'active',
      lastActivityAt: new Date(now - 4 * 60 * 60 * 1000),
    },
    {
      id: 'wc-session-2',
      topic: 'topic-aave-' + Math.random().toString(36).slice(2, 10),
      dapp: MOCK_DAPPS.aave,
      walletId: primary,
      walletAddressId: primaryAddrId,
      chains: ['ethereum'],
      methods: STD_METHODS,
      connectedAt: new Date(now - 6 * 24 * 60 * 60 * 1000),
      expiresAt: new Date(now - 6 * 24 * 60 * 60 * 1000 + WC_SESSION_TTL_MS),
      status: 'expiring_soon',
      lastActivityAt: new Date(now - 5 * 24 * 60 * 60 * 1000),
    },
  ];

  return sessions;
}

// ─── Mock recent activity ────────────────────────────────────────────────────

export function getInitialMockActivity(): SessionActivity[] {
  const now = Date.now();
  return [
    {
      id: 'activity-1',
      sessionId: 'wc-session-1',
      type: 'send_transaction',
      summary: 'Swap 0.5 ETH → USDC',
      timestamp: new Date(now - 4 * 60 * 60 * 1000),
      txHash: '0xabc...def',
    },
    {
      id: 'activity-2',
      sessionId: 'wc-session-1',
      type: 'sign_message',
      summary: 'Sign in with Ethereum',
      timestamp: new Date(now - 2 * 24 * 60 * 60 * 1000),
    },
    {
      id: 'activity-3',
      sessionId: 'wc-session-1',
      type: 'sign_typed_data',
      summary: 'USDC Permit (Uniswap)',
      timestamp: new Date(now - 5 * 60 * 60 * 1000),
    },
    {
      id: 'activity-4',
      sessionId: 'wc-session-2',
      type: 'send_transaction',
      summary: 'Supply 100 USDC',
      timestamp: new Date(now - 5 * 24 * 60 * 60 * 1000),
      txHash: '0x123...456',
    },
  ];
}

// ─── Mock URI generators (for "scan QR" simulation) ─────────────────────────

export function makeMockWcUri(dappKey: keyof typeof MOCK_DAPPS = 'uniswap'): string {
  const topic = Math.random().toString(36).slice(2, 18) + Math.random().toString(36).slice(2, 18);
  const symKey = Math.random().toString(36).slice(2, 18) + Math.random().toString(36).slice(2, 18);
  return `wc:${topic}@2?relay-protocol=irn&symKey=${symKey}&dapp=${dappKey}`;
}

export { WC_SESSION_EXPIRING_SOON_MS };
