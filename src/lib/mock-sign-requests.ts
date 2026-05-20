// Shared builder for mock sign requests dispatched by a fake dApp
// (used by ConnectedDapps demo panel and the post-connect success drawer).

import type { SignRequest } from '@/types/walletconnect';
import { isUnlimitedApproveAmount } from '@/types/walletconnect';

export type MockSignVariant = 'tx' | 'approve' | 'message' | 'typed' | 'switch';

export interface MockSignVariantMeta {
  variant: MockSignVariant;
  label: string;
  emoji: string;
  description: string;
}

export const MOCK_SIGN_VARIANTS: MockSignVariantMeta[] = [
  { variant: 'tx',       label: '交易',        emoji: '💸', description: 'Swap / contract call' },
  { variant: 'approve',  label: '无限授权',     emoji: '⚠️', description: 'unlimited ERC-20 approve' },
  { variant: 'message',  label: '消息签名',     emoji: '✍️', description: 'personal_sign / SIWE' },
  { variant: 'typed',    label: 'Typed Data', emoji: '📑', description: 'EIP-712 permit' },
  { variant: 'switch',   label: '切换网络',     emoji: '🔀', description: 'wallet_switchEthereumChain' },
];

/** Build a mock sign-request payload for the given session and variant. */
export function buildMockSignRequest(
  sessionId: string,
  variant: MockSignVariant,
  dappLabel: string = 'dApp',
): Omit<SignRequest, 'id' | 'receivedAt' | 'expiresAt' | 'status'> {
  const base = { sessionId };

  switch (variant) {
    case 'tx':
      return {
        ...base,
        method: 'eth_sendTransaction',
        params: {
          chain: 'ethereum',
          from: '0xUser',
          to: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
          value: '0x6f05b59d3b20000',
          data: '0xabcdef0000000000000000000000000000000000000000000000000000000000',
        },
        decoded: {
          type: 'contract_call',
          contractName: `${dappLabel} Router`,
        },
      };

    case 'approve':
      return {
        ...base,
        method: 'eth_sendTransaction',
        params: {
          chain: 'ethereum',
          from: '0xUser',
          to: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          value: '0x0',
          data: '0x095ea7b3' + 'f'.repeat(64) + 'f'.repeat(64),
        },
        decoded: {
          type: 'erc20_approve',
          tokenSymbol: 'USDC',
          spender: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
          isUnlimitedApprove: isUnlimitedApproveAmount('0x' + 'f'.repeat(64)),
        },
      };

    case 'message':
      return {
        ...base,
        method: 'personal_sign',
        params: {
          chain: 'ethereum',
          address: '0xUser',
          message:
            `Sign in to ${dappLabel}\n\nNonce: ${Math.random().toString(36).slice(2, 12)}\nIssued: ${new Date().toISOString()}`,
          rawHex: '0x' + Math.random().toString(16).slice(2, 18),
        },
      };

    case 'typed':
      return {
        ...base,
        method: 'eth_signTypedData_v4',
        params: {
          chain: 'ethereum',
          address: '0xUser',
          typedData: {
            domain: {
              name: 'USDC', version: '2', chainId: 1,
              verifyingContract: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            },
            types: {
              Permit: [
                { name: 'owner', type: 'address' },
                { name: 'spender', type: 'address' },
                { name: 'value', type: 'uint256' },
              ],
            },
            primaryType: 'Permit',
            message: { owner: '0xUser', spender: dappLabel, value: '1000000' },
          },
        },
      };

    case 'switch':
      return {
        ...base,
        method: 'wallet_switchEthereumChain',
        params: { targetChain: 'bsc' },
      };
  }
}
