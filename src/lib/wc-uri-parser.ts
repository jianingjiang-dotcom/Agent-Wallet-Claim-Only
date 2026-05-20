// WalletConnect URI parser — minimal mock for UI prototype.
// Real WC v2 URI shape: wc:<topic>@2?relay-protocol=irn&symKey=<key>
// Our mock also supports a `dapp` query param to pick a known dApp from MOCK_DAPPS.

import { MOCK_DAPPS } from './mock-sessions';
import type { DappMetadata } from '@/types/walletconnect';

export interface ParsedWcUri {
  topic: string;
  version: '2';
  relayProtocol: string;
  symKey: string;
  dapp: DappMetadata;       // resolved from `dapp` query or fallback
  isValid: boolean;
  error?: string;
}

export function isWcUri(input: string): boolean {
  return /^wc:[a-z0-9]+@2(\?.*)?$/i.test(input.trim());
}

export function parseWcUri(input: string): ParsedWcUri {
  const empty: ParsedWcUri = {
    topic: '', version: '2', relayProtocol: '', symKey: '',
    dapp: { name: 'Unknown dApp', url: '', icon: '🔗' },
    isValid: false,
  };

  const trimmed = input.trim();
  if (!trimmed) return { ...empty, error: 'URI 为空' };
  if (!isWcUri(trimmed)) return { ...empty, error: '不是有效的 WalletConnect URI' };

  try {
    const [, rest] = trimmed.split('wc:');
    const [topicAtVersion, query = ''] = rest.split('?');
    const [topic, version] = topicAtVersion.split('@');
    const params = new URLSearchParams(query);

    const relayProtocol = params.get('relay-protocol') || 'irn';
    const symKey = params.get('symKey') || '';
    const dappKey = params.get('dapp') || 'uniswap';

    if (!topic || !symKey) {
      return { ...empty, error: '缺少必要字段' };
    }

    const dapp = MOCK_DAPPS[dappKey] || {
      name: 'Unknown dApp',
      url: 'https://unknown.app',
      icon: '🔗',
    };

    return {
      topic, version: '2', relayProtocol, symKey, dapp, isValid: true,
    };
  } catch {
    return { ...empty, error: '解析 URI 失败' };
  }
}
