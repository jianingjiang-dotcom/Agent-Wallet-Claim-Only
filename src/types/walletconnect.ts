// WalletConnect types — mock implementation for UI prototype

/**
 * EVM-family chains that may appear in a WalletConnect session.
 *   ethereum / bsc → currently supported by the wallet
 *   polygon / arbitrum / optimism → recognised but unsupported, used to
 *     demonstrate the "chain mismatch" approval flow.
 */
export type WCEvmChain = 'ethereum' | 'bsc' | 'polygon' | 'arbitrum' | 'optimism';

export type WCMethod =
  | 'personal_sign'
  | 'eth_sign'
  | 'eth_signTypedData_v4'
  | 'eth_sendTransaction'
  | 'wallet_switchEthereumChain';

export interface DappMetadata {
  name: string;
  url: string;        // origin like "https://app.uniswap.org"
  icon: string;       // emoji or url for mock
  description?: string;
}

export interface DappSession {
  id: string;
  topic: string;             // WC v2 session topic
  dapp: DappMetadata;
  walletId: string;          // user-selected wallet (parent)
  walletAddressId: string;   // user-selected address inside that wallet (the actual account exposed to the dApp)
  chains: WCEvmChain[];      // approved chains
  methods: WCMethod[];       // approved methods
  connectedAt: Date;
  expiresAt: Date;           // 7 days from connect
  status: 'active' | 'expiring_soon' | 'expired';
  lastActivityAt?: Date;
}

// ─── Sign Request ────────────────────────────────────────────────────────────

interface BaseSignRequest {
  id: string;
  sessionId: string;
  receivedAt: Date;
  expiresAt: Date;            // 60s timeout
  status: 'pending' | 'approved' | 'rejected' | 'timeout';
}

export interface SignTransactionRequest extends BaseSignRequest {
  method: 'eth_sendTransaction';
  params: {
    chain: WCEvmChain;
    from: string;
    to: string;
    value: string;             // wei in hex
    data: string;              // hex calldata
    gas?: string;
    gasPrice?: string;
  };
  // Decoded for UI
  decoded?: {
    type: 'native_transfer' | 'erc20_transfer' | 'erc20_approve' | 'contract_call';
    contractName?: string;     // e.g. "Uniswap V3 Router"
    tokenSymbol?: string;
    tokenAmount?: string;
    spender?: string;
    isUnlimitedApprove?: boolean;
    recipient?: string;
  };
}

export interface SignMessageRequest extends BaseSignRequest {
  method: 'personal_sign' | 'eth_sign';
  params: {
    chain: WCEvmChain;
    address: string;
    message: string;           // already utf-8 decoded for personal_sign; raw hex for eth_sign
    rawHex: string;
  };
}

export interface SignTypedDataRequest extends BaseSignRequest {
  method: 'eth_signTypedData_v4';
  params: {
    chain: WCEvmChain;
    address: string;
    typedData: {
      domain: Record<string, unknown>;
      types: Record<string, Array<{ name: string; type: string }>>;
      primaryType: string;
      message: Record<string, unknown>;
    };
  };
}

export interface SwitchChainRequest extends BaseSignRequest {
  method: 'wallet_switchEthereumChain';
  params: {
    targetChain: WCEvmChain;
  };
}

export type SignRequest =
  | SignTransactionRequest
  | SignMessageRequest
  | SignTypedDataRequest
  | SwitchChainRequest;

// ─── Pending Connection ──────────────────────────────────────────────────────

export interface PendingConnection {
  topic: string;
  dapp: DappMetadata;
  requestedChains: WCEvmChain[];
  requestedMethods: WCMethod[];
  proposedAt: Date;
  /** Account the user picked while scanning — approval drawer is read-only on this */
  walletId: string;
  walletAddressId: string;
}

// ─── Recent Activity (for session detail page) ───────────────────────────────

export interface SessionActivity {
  id: string;
  sessionId: string;
  type: 'sign_message' | 'sign_typed_data' | 'send_transaction' | 'switch_chain';
  summary: string;
  timestamp: Date;
  txHash?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

export const WC_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;   // 7 days
export const WC_SESSION_EXPIRING_SOON_MS = 24 * 60 * 60 * 1000;   // last 24h
export const WC_SIGN_REQUEST_TIMEOUT_MS = 60 * 1000;        // 60s

export function isUnlimitedApproveAmount(hex: string): boolean {
  if (!hex || !hex.startsWith('0x')) return false;
  const stripped = hex.slice(2).toLowerCase().replace(/^0+/, '');
  return stripped === 'f'.repeat(64) || stripped.length >= 60;
}
