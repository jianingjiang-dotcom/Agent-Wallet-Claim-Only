// Bridge WalletConnect sign requests into the TodoItem shape so the existing
// MessageCenter / TodoCard infrastructure can render them without changes to
// the WalletContext or the Todo state machine.

import type { SignRequest, DappSession } from '@/types/walletconnect';
import type { Wallet } from '@/types/wallet';
import type { TodoItem, WcSignMeta, TodoStatus } from '@/types/notification';

function shortAddr(addr: string): string {
  if (!addr) return '';
  return addr.length > 14 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}

function methodToTxType(method: SignRequest['method']): WcSignMeta['txType'] {
  switch (method) {
    case 'eth_sendTransaction':
      return 'contract_interaction';
    case 'personal_sign':
    case 'eth_sign':
    case 'eth_signTypedData_v4':
      return 'message_signing';
    case 'wallet_switchEthereumChain':
      return 'switch_chain';
  }
}

function statusMap(s: SignRequest['status']): TodoStatus {
  if (s === 'timeout') return 'failed';
  return s;
}

export function wcRequestToTodo(
  req: SignRequest,
  session: DappSession | undefined,
  wallet: Wallet | undefined,
): TodoItem {
  const address = wallet?.walletAddresses.find(a => a.id === session?.walletAddressId);
  const contractName =
    req.method === 'eth_sendTransaction' ? req.decoded?.contractName : undefined;

  const meta: WcSignMeta = {
    type: 'wc_sign',
    requestId: req.id,
    method: req.method,
    txType: methodToTxType(req.method),
    dappName: session?.dapp.name || '未知 dApp',
    dappIcon: session?.dapp.icon || '🔗',
    walletName: wallet?.name || '钱包',
    addressShort: address ? shortAddr(address.address) : '',
    contractName,
  };

  return {
    id: `wc-${req.id}`,
    type: 'wc_sign',
    title: '交易签名',
    summary: meta.dappName,
    status: statusMap(req.status),
    createdAt: req.receivedAt,
    completedAt: req.status !== 'pending' ? new Date() : undefined,
    route: `/wc-sign/${req.id}`,
    metadata: meta,
  };
}
