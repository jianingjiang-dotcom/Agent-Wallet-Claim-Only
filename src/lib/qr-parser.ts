// QR Code Parser for Cryptocurrency Addresses
// Supports multiple formats: plain address, EIP-681, JSON, WalletConnect URI

import { ChainId } from '@/types/wallet';

export interface ParsedQRData {
  address: string;
  network?: ChainId;
  amount?: number;
  memo?: string;
  isValid: boolean;
  error?: string;
  /** Set when QR is a WalletConnect URI; the raw URI is in `wcUri` */
  isWalletConnect?: boolean;
  wcUri?: string;
}

// Address pattern detection
const ADDRESS_PATTERNS = {
  ethereum: /^0x[a-fA-F0-9]{40}$/,
  tron: /^T[a-zA-Z0-9]{33}$/,
  bsc: /^0x[a-fA-F0-9]{40}$/, // Same as Ethereum
};

// Detect network from address format
export function detectNetworkFromAddress(address: string): ChainId | undefined {
  if (ADDRESS_PATTERNS.tron.test(address)) {
    return 'tron';
  }
  if (ADDRESS_PATTERNS.ethereum.test(address)) {
    // Could be Ethereum or BSC, default to Ethereum
    return 'ethereum';
  }
  return undefined;
}

// Parse EIP-681 format: ethereum:0x...?value=100&data=...
function parseEIP681(uri: string): ParsedQRData {
  try {
    const match = uri.match(/^(ethereum|tron|bnb):([a-zA-Z0-9]+)(\?(.*))?$/i);
    if (!match) {
      return { address: '', isValid: false, error: '无效的URI格式' };
    }

    const [, scheme, address, , queryString] = match;
    const params = new URLSearchParams(queryString || '');
    
    let network: ChainId = 'ethereum';
    if (scheme.toLowerCase() === 'tron') network = 'tron';
    if (scheme.toLowerCase() === 'bnb') network = 'bsc';

    const result: ParsedQRData = {
      address,
      network,
      isValid: true,
    };

    // Parse amount (value in smallest unit, convert to standard)
    const value = params.get('value') || params.get('amount');
    if (value) {
      // Assume value is in standard units for simplicity
      result.amount = parseFloat(value);
    }

    // Parse memo
    const memo = params.get('memo') || params.get('message') || params.get('label');
    if (memo) {
      result.memo = decodeURIComponent(memo);
    }

    return result;
  } catch {
    return { address: '', isValid: false, error: '解析URI失败' };
  }
}

// Parse JSON format: {"address":"0x...", "amount": 100, "network": "ethereum"}
function parseJSON(data: string): ParsedQRData {
  try {
    const json = JSON.parse(data);
    
    if (!json.address || typeof json.address !== 'string') {
      return { address: '', isValid: false, error: 'JSON缺少有效地址' };
    }

    const result: ParsedQRData = {
      address: json.address,
      isValid: true,
    };

    if (json.network && ['ethereum', 'tron', 'bsc'].includes(json.network)) {
      result.network = json.network as ChainId;
    } else {
      result.network = detectNetworkFromAddress(json.address);
    }

    if (json.amount && typeof json.amount === 'number') {
      result.amount = json.amount;
    }

    if (json.memo && typeof json.memo === 'string') {
      result.memo = json.memo;
    }

    return result;
  } catch {
    return { address: '', isValid: false, error: '无效的JSON格式' };
  }
}

// Parse plain address
function parsePlainAddress(data: string): ParsedQRData {
  const trimmed = data.trim();
  
  const network = detectNetworkFromAddress(trimmed);
  if (network) {
    return {
      address: trimmed,
      network,
      isValid: true,
    };
  }

  return { address: '', isValid: false, error: '无法识别的地址格式' };
}

// Main parser function
export function parseQRCode(data: string): ParsedQRData {
  if (!data || typeof data !== 'string') {
    return { address: '', isValid: false, error: '无效的二维码数据' };
  }

  const trimmed = data.trim();

  // WalletConnect URI: wc:<topic>@2?...
  if (/^wc:[a-z0-9]+@2/i.test(trimmed)) {
    return {
      address: '',
      isValid: true,
      isWalletConnect: true,
      wcUri: trimmed,
    };
  }

  // Try EIP-681 format first
  if (trimmed.match(/^(ethereum|tron|bnb):/i)) {
    return parseEIP681(trimmed);
  }

  // Try JSON format
  if (trimmed.startsWith('{')) {
    return parseJSON(trimmed);
  }

  // Try plain address
  return parsePlainAddress(trimmed);
}
