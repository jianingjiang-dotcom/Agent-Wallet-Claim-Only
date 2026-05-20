// tx-storyteller — convert a SignTransactionRequest into a human-readable story.
// Mock implementation: maps decoded fields + dApp metadata to friendly sentences.

import type { SignTransactionRequest, DappMetadata } from '@/types/walletconnect';

export interface TxStory {
  /** Headline — first-person, action-oriented. e.g. "在 Uniswap 兑换 0.5 ETH 为 ~1700 USDC" */
  headline: string;
  /** Sub-line — secondary context, e.g. "Ethereum · Gas ~$3.20" */
  subline: string;
  /** Asset flow visualization data */
  flow?: {
    from?: { token: string; amount: string; iconHint?: string };
    to?: { token: string; amount: string; iconHint?: string };
  };
  /** Counterparty info — the contract or wallet on the other side */
  counterparty?: {
    label: string;
    address: string;
  };
  /** Risk hints — chips shown above headline */
  riskHints: RiskHint[];
  /** Estimated gas in USD (mocked) */
  gasUsd: number;
}

export interface RiskHint {
  level: 'warning' | 'danger' | 'info';
  text: string;
}

const CHAIN_DISPLAY: Record<string, string> = {
  ethereum: 'Ethereum',
  bsc: 'BNB Chain',
};

export function tellTxStory(req: SignTransactionRequest, dapp: DappMetadata | undefined): TxStory {
  const decoded = req.decoded;
  const chain = CHAIN_DISPLAY[req.params.chain] || req.params.chain.toUpperCase();
  const gasUsd = parseFloat((Math.random() * 4 + 1).toFixed(2));
  const subline = `${chain} · Gas ~$${gasUsd.toFixed(2)}`;
  const riskHints: RiskHint[] = [];

  // ── Native transfer ──
  if (decoded?.type === 'native_transfer') {
    const amount = hexToDecimal(req.params.value);
    return {
      headline: `向 ${shortAddr(decoded.recipient || req.params.to)} 转账 ${amount} ETH`,
      subline,
      flow: { from: { token: 'ETH', amount } },
      counterparty: { label: '接收方', address: decoded.recipient || req.params.to },
      riskHints,
      gasUsd,
    };
  }

  // ── ERC-20 transfer ──
  if (decoded?.type === 'erc20_transfer') {
    return {
      headline: `向 ${shortAddr(decoded.recipient || '')} 发送 ${decoded.tokenAmount || ''} ${decoded.tokenSymbol || 'Token'}`,
      subline,
      flow: { from: { token: decoded.tokenSymbol || 'Token', amount: decoded.tokenAmount || '' } },
      counterparty: { label: '接收方', address: decoded.recipient || '' },
      riskHints,
      gasUsd,
    };
  }

  // ── ERC-20 approve ──
  if (decoded?.type === 'erc20_approve') {
    if (decoded.isUnlimitedApprove) {
      riskHints.push({
        level: 'danger',
        text: `无限授权 ${decoded.tokenSymbol || 'Token'}`,
      });
    }
    return {
      headline: decoded.isUnlimitedApprove
        ? `授权 ${dapp?.name || '合约'} 无限使用你的 ${decoded.tokenSymbol || 'Token'}`
        : `授权 ${dapp?.name || '合约'} 使用 ${decoded.tokenAmount || ''} ${decoded.tokenSymbol || 'Token'}`,
      subline,
      counterparty: { label: 'Spender', address: decoded.spender || '' },
      riskHints,
      gasUsd,
    };
  }

  // ── Contract call (identified by dApp + contract name) ──
  if (decoded?.type === 'contract_call') {
    const name = decoded.contractName || '合约';
    const dappName = dapp?.name || name;

    // Heuristic: pretend Uniswap-style routers do swaps
    if (/uniswap|router|swap/i.test(name)) {
      const fromAmount = hexToDecimal(req.params.value) || '0.5';
      const toAmount = (parseFloat(fromAmount || '0') * 3400).toFixed(2);
      return {
        headline: `在 ${dappName} 兑换 ${fromAmount} ETH 为 ~${toAmount} USDC`,
        subline,
        flow: {
          from: { token: 'ETH', amount: fromAmount },
          to: { token: 'USDC', amount: toAmount },
        },
        counterparty: { label: dappName, address: req.params.to },
        riskHints: [{ level: 'info', text: '兑换价格可能因滑点变化' }],
        gasUsd,
      };
    }

    if (/aave|lend|supply/i.test(name)) {
      return {
        headline: `在 ${dappName} 供应资产生息`,
        subline,
        counterparty: { label: dappName, address: req.params.to },
        riskHints,
        gasUsd,
      };
    }

    return {
      headline: `在 ${dappName} 调用合约`,
      subline,
      counterparty: { label: dappName, address: req.params.to },
      riskHints,
      gasUsd,
    };
  }

  // ── Fallback ──
  return {
    headline: dapp ? `在 ${dapp.name} 发起交易` : '发起交易',
    subline,
    counterparty: dapp ? { label: dapp.name, address: req.params.to } : undefined,
    riskHints,
    gasUsd,
  };
}

// ─── Utils ──────────────────────────────────────────────────────────────────

function hexToDecimal(hex: string): string {
  if (!hex || !hex.startsWith('0x')) return '0';
  try {
    const wei = BigInt(hex);
    const eth = Number(wei) / 1e18;
    if (eth === 0) return '0';
    return eth.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
  } catch {
    return '0';
  }
}

function shortAddr(addr: string) {
  if (!addr) return '';
  return addr.length > 14 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}
