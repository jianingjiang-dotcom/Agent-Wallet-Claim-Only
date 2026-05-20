// ============================
// 消息（Messages）
// ============================

export type MessageCategory = 'transaction' | 'pact' | 'system';

export type TransactionSubType = 'transfer' | 'contract_interaction' | 'message_signing';
export type PactSubType = 'pact_activated' | 'pact_rejected' | 'pact_completed' | 'pact_expired' | 'pact_revoked';
export type SystemSubType = 'backup_reminder' | 'upgrade_prompt';
export type MessageSubType = TransactionSubType | PactSubType | SystemSubType;

export type StatusVariant = 'success' | 'error' | 'warning' | 'info' | 'muted';

export interface StatusBadgeData {
  label: string;
  variant: StatusVariant;
}

// 消息图标类型：币种图标（交易类）或通用图标（Pact/系统类）
export interface CryptoIconData {
  type: 'crypto';
  symbol: string;       // ETH, USDT, BTC...
  chainId: string;      // ethereum, base, solana...
}

export interface GenericIconData {
  type: 'generic';
  // 由 MessageCard 根据 subType 自动映射图标
}

export type MessageIconData = CryptoIconData | GenericIconData;

export interface Message {
  id: string;
  category: MessageCategory;
  subType: MessageSubType;
  title: string;
  summary?: string;
  status: StatusBadgeData;
  timestamp: Date;
  isRead: boolean;
  route: string;
  icon: MessageIconData;
  // 交易类专用：右侧显示的金额
  amount?: string;       // "+500 USDT" / "-1,234.56 ETH"
  metadata?: Record<string, unknown>;
}

// ============================
// 待办（Todos）
// ============================

export type TodoType = 'pact_approval' | 'excess_approval' | 'tss_signing' | 'wc_sign';
export type TodoStatus = 'pending' | 'approved' | 'rejected' | 'failed';

export interface PactApprovalMeta {
  type: 'pact_approval';
  agentName: string;
  agentId: string;
  walletName: string;
  pactId: string;
  intent: string;
  txType?: 'transfer' | 'contract_interaction' | 'message_signing';
}

export interface ExcessApprovalMeta {
  type: 'excess_approval';
  txType: 'transfer' | 'contract_interaction';
  amount: number;
  symbol: string;
  chainId: string;
  toAddress: string;
  pactId: string;
  pactName: string;
}

export interface EIP712Domain {
  name: string;
  version: string;
  chainId: string;
  verifyingContract: string;
}

export interface EIP712Data {
  domain: EIP712Domain;
  primaryType: string;
  message: Record<string, string>;
}

export interface TssSigningMeta {
  type: 'tss_signing';
  txType: 'transfer' | 'contract_interaction' | 'message_signing';
  amount?: number;
  symbol?: string;
  chainId?: string;
  toAddress?: string;
  txId: string;
  eip712?: EIP712Data;
}

/** dApp sign request surfaced into the Todo center (origin: WalletConnect). */
export interface WcSignMeta {
  type: 'wc_sign';
  requestId: string;
  method:
    | 'eth_sendTransaction'
    | 'personal_sign'
    | 'eth_sign'
    | 'eth_signTypedData_v4'
    | 'wallet_switchEthereumChain';
  /** Human-friendly subtype tag for the card row. */
  txType: 'transfer' | 'contract_interaction' | 'message_signing' | 'switch_chain';
  dappName: string;
  dappIcon: string;
  walletName: string;
  /** Short address (e.g. 0xab12…cd34) */
  addressShort: string;
  /** Optional contract / target shown as the secondary line. */
  contractName?: string;
}

export type TodoMetadata = PactApprovalMeta | ExcessApprovalMeta | TssSigningMeta | WcSignMeta;

export interface TodoItem {
  id: string;
  type: TodoType;
  title: string;
  summary: string;
  status: TodoStatus;
  createdAt: Date;
  completedAt?: Date;
  route: string;
  metadata: TodoMetadata;
}

// ============================
// Legacy compat — keep old Notification type for existing references
// ============================

export type NotificationType =
  | 'transaction_in' | 'transaction_out' | 'large_amount'
  | 'system_update' | 'maintenance' | 'promotion'
  | 'agent_tx_pending' | 'agent_tx_approved' | 'agent_tx_rejected'
  | 'agent_tx_expired' | 'agent_tx_broadcasting' | 'agent_tx_settled'
  | 'agent_tx_failed' | 'agent_paused' | 'api_key_created' | 'api_key_revoked';

export type NotificationPriority = 'urgent' | 'normal' | 'low';
export type NotificationCategory = 'transaction' | 'system' | 'agent';

export interface Notification {
  id: string;
  type: NotificationType;
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  content: string;
  timestamp: Date;
  isRead: boolean;
  action?: { label: string; route: string };
  metadata?: {
    txId?: string; amount?: number; symbol?: string;
    walletId?: string; network?: string;
    agentTxId?: string; apiKeyId?: string; controlMode?: string;
  };
}
