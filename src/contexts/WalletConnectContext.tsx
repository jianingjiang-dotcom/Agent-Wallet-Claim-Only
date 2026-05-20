// WalletConnectContext — global state for sessions, pending requests, mock event bus.
// Backed by localStorage for persistence across mock "App restart".

import {
  createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode,
} from 'react';
import {
  DappSession, SignRequest, SessionActivity, PendingConnection, DappMetadata,
  WCEvmChain, WCMethod, WC_SESSION_TTL_MS, WC_SESSION_EXPIRING_SOON_MS,
} from '@/types/walletconnect';
import {
  MOCK_DAPPS, PREVIOUSLY_CONNECTED_DAPPS, getInitialMockSessions, getInitialMockActivity,
} from '@/lib/mock-sessions';
import { useWallet } from './WalletContext';

const STORAGE_KEY_SESSIONS = 'wc:sessions';
const STORAGE_KEY_HISTORY = 'wc:dapp-history';

// ─── Type ───────────────────────────────────────────────────────────────────

interface WalletConnectContextType {
  sessions: DappSession[];
  pendingRequests: SignRequest[];
  pendingConnection: PendingConnection | null;
  activity: SessionActivity[];

  // Connection flow — caller pre-selects which wallet/address to expose to the dApp
  proposeConnection: (
    dapp: DappMetadata,
    chains: WCEvmChain[],
    methods: WCMethod[],
    walletId: string,
    walletAddressId: string,
  ) => void;
  approveConnection: (approvedChains: WCEvmChain[]) => DappSession;
  rejectConnection: () => void;
  clearPendingConnection: () => void;

  // Session management
  disconnectSession: (sessionId: string) => void;
  disconnectAll: () => void;

  // Sign request flow
  pushSignRequest: (req: Omit<SignRequest, 'id' | 'receivedAt' | 'expiresAt' | 'status'>) => SignRequest;
  approveSignRequest: (requestId: string) => void;
  rejectSignRequest: (requestId: string, reason?: string) => void;
  timeoutSignRequest: (requestId: string) => void;
  removeSignRequest: (requestId: string) => void;

  // Helpers
  isFirstTimeDapp: (origin: string) => boolean;
  getSessionById: (sessionId: string) => DappSession | undefined;
  getActivityForSession: (sessionId: string) => SessionActivity[];

  // Mock events
  emitAccountsChanged: (walletId: string) => void;
  emitChainChanged: (sessionId: string, chain: WCEvmChain) => void;
}

const WalletConnectContext = createContext<WalletConnectContextType | null>(null);

// ─── Persistence helpers ────────────────────────────────────────────────────

function loadSessions(): DappSession[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SESSIONS);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DappSession[];
    return parsed.map(s => ({
      ...s,
      connectedAt: new Date(s.connectedAt),
      expiresAt: new Date(s.expiresAt),
      lastActivityAt: s.lastActivityAt ? new Date(s.lastActivityAt) : undefined,
    }));
  } catch {
    return null;
  }
}

function saveSessions(sessions: DappSession[]) {
  try {
    localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions));
  } catch { /* ignore */ }
}

function loadDappHistory(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
    if (!raw) return new Set(PREVIOUSLY_CONNECTED_DAPPS);
    return new Set([...PREVIOUSLY_CONNECTED_DAPPS, ...JSON.parse(raw) as string[]]);
  } catch {
    return new Set(PREVIOUSLY_CONNECTED_DAPPS);
  }
}

function saveDappHistory(set: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(Array.from(set)));
  } catch { /* ignore */ }
}

// ─── Status update helper ──────────────────────────────────────────────────

function refreshSessionStatus(s: DappSession): DappSession {
  const now = Date.now();
  const remaining = s.expiresAt.getTime() - now;
  if (remaining <= 0) return { ...s, status: 'expired' };
  if (remaining <= WC_SESSION_EXPIRING_SOON_MS) return { ...s, status: 'expiring_soon' };
  return { ...s, status: 'active' };
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function WalletConnectProvider({ children }: { children: ReactNode }) {
  const { wallets } = useWallet();
  const walletIds = useMemo(() => wallets.map(w => w.id), [wallets]);

  const [sessions, setSessions] = useState<DappSession[]>(() => {
    const persisted = loadSessions();
    if (persisted) return persisted.map(refreshSessionStatus).filter(s => s.status !== 'expired');
    // Build a default-address map so mock sessions point to a real EVM address per wallet
    const defaultAddrByWallet: Record<string, string> = {};
    wallets.forEach(w => {
      const firstEvm = w.walletAddresses?.find(a => a.system === 'evm');
      if (firstEvm) defaultAddrByWallet[w.id] = firstEvm.id;
    });
    return getInitialMockSessions(walletIds.length > 0 ? walletIds : ['default'], defaultAddrByWallet);
  });

  const [pendingRequests, setPendingRequests] = useState<SignRequest[]>([]);
  const [pendingConnection, setPendingConnection] = useState<PendingConnection | null>(null);
  const [activity, setActivity] = useState<SessionActivity[]>(() => getInitialMockActivity());
  const [dappHistory, setDappHistory] = useState<Set<string>>(() => loadDappHistory());

  // Persist sessions
  useEffect(() => { saveSessions(sessions); }, [sessions]);
  useEffect(() => { saveDappHistory(dappHistory); }, [dappHistory]);

  // Periodic status refresh + auto-cleanup expired
  useEffect(() => {
    const tick = setInterval(() => {
      setSessions(prev => prev
        .map(refreshSessionStatus)
        .filter(s => s.status !== 'expired')
      );
    }, 30 * 1000);
    return () => clearInterval(tick);
  }, []);

  // Auto-timeout pending sign requests
  useEffect(() => {
    if (pendingRequests.length === 0) return;
    const tick = setInterval(() => {
      const now = Date.now();
      setPendingRequests(prev => prev.map(r => {
        if (r.status === 'pending' && r.expiresAt.getTime() <= now) {
          return { ...r, status: 'timeout' };
        }
        return r;
      }));
    }, 1000);
    return () => clearInterval(tick);
  }, [pendingRequests.length]);

  // Connection flow — caller picks wallet & address up front
  const proposeConnection = useCallback((
    dapp: DappMetadata,
    chains: WCEvmChain[],
    methods: WCMethod[],
    walletId: string,
    walletAddressId: string,
  ) => {
    setPendingConnection({
      topic: 'topic-' + Math.random().toString(36).slice(2, 18),
      dapp, requestedChains: chains, requestedMethods: methods,
      walletId, walletAddressId,
      proposedAt: new Date(),
    });
  }, []);

  const approveConnection = useCallback((approvedChains: WCEvmChain[]): DappSession => {
    if (!pendingConnection) throw new Error('No pending connection');

    const now = Date.now();
    const newSession: DappSession = {
      id: 'wc-session-' + Math.random().toString(36).slice(2, 10),
      topic: pendingConnection.topic,
      dapp: pendingConnection.dapp,
      walletId: pendingConnection.walletId,
      walletAddressId: pendingConnection.walletAddressId,
      chains: approvedChains,
      methods: pendingConnection.requestedMethods,
      connectedAt: new Date(now),
      expiresAt: new Date(now + WC_SESSION_TTL_MS),
      status: 'active',
    };

    // Replace existing session for the same dApp origin (same dApp re-connect)
    setSessions(prev => {
      const filtered = prev.filter(s => s.dapp.url !== newSession.dapp.url);
      return [newSession, ...filtered];
    });

    // Mark dApp as known
    setDappHistory(prev => {
      const next = new Set(prev);
      next.add(newSession.dapp.url);
      return next;
    });

    setPendingConnection(null);
    return newSession;
  }, [pendingConnection]);

  const rejectConnection = useCallback(() => {
    setPendingConnection(null);
  }, []);

  const clearPendingConnection = useCallback(() => {
    setPendingConnection(null);
  }, []);

  // Session management
  const disconnectSession = useCallback((sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    setPendingRequests(prev => prev.filter(r => r.sessionId !== sessionId));
  }, []);

  const disconnectAll = useCallback(() => {
    setSessions([]);
    setPendingRequests([]);
  }, []);

  // Sign request flow
  const pushSignRequest = useCallback(
    (req: Omit<SignRequest, 'id' | 'receivedAt' | 'expiresAt' | 'status'>): SignRequest => {
      const now = Date.now();
      const newReq = {
        ...req,
        id: 'sr-' + Math.random().toString(36).slice(2, 10),
        receivedAt: new Date(now),
        expiresAt: new Date(now + 60 * 1000),
        status: 'pending' as const,
      } as SignRequest;
      setPendingRequests(prev => [...prev, newReq]);
      return newReq;
    },
    []
  );

  const approveSignRequest = useCallback((requestId: string) => {
    setPendingRequests(prev => prev.map(r =>
      r.id === requestId ? { ...r, status: 'approved' } as SignRequest : r
    ));

    // Add activity record
    setPendingRequests(prev => {
      const req = prev.find(r => r.id === requestId);
      if (req) {
        const summary = describeRequest(req);
        const act: SessionActivity = {
          id: 'activity-' + Math.random().toString(36).slice(2, 10),
          sessionId: req.sessionId,
          type: activityTypeOf(req),
          summary,
          timestamp: new Date(),
          txHash: req.method === 'eth_sendTransaction' ? '0x' + Math.random().toString(16).slice(2, 12) + '...' : undefined,
        };
        setActivity(a => [act, ...a]);
        // Bump session lastActivity
        setSessions(s => s.map(x => x.id === req.sessionId ? { ...x, lastActivityAt: new Date() } : x));
      }
      return prev;
    });
  }, []);

  const rejectSignRequest = useCallback((requestId: string, _reason?: string) => {
    setPendingRequests(prev => prev.map(r =>
      r.id === requestId ? { ...r, status: 'rejected' } as SignRequest : r
    ));
  }, []);

  const timeoutSignRequest = useCallback((requestId: string) => {
    setPendingRequests(prev => prev.map(r =>
      r.id === requestId ? { ...r, status: 'timeout' } as SignRequest : r
    ));
  }, []);

  const removeSignRequest = useCallback((requestId: string) => {
    setPendingRequests(prev => prev.filter(r => r.id !== requestId));
  }, []);

  const isFirstTimeDapp = useCallback((origin: string) => !dappHistory.has(origin), [dappHistory]);

  const getSessionById = useCallback(
    (sessionId: string) => sessions.find(s => s.id === sessionId),
    [sessions]
  );

  const getActivityForSession = useCallback(
    (sessionId: string) => activity.filter(a => a.sessionId === sessionId).slice(0, 5),
    [activity]
  );

  // Mock events
  const emitAccountsChanged = useCallback((_walletId: string) => {
    // In real WC SDK this would emit to all sessions
  }, []);

  const emitChainChanged = useCallback((_sessionId: string, _chain: WCEvmChain) => {
    // In real WC SDK this would emit to that session
  }, []);

  const value: WalletConnectContextType = {
    sessions, pendingRequests, pendingConnection, activity,
    proposeConnection, approveConnection, rejectConnection, clearPendingConnection,
    disconnectSession, disconnectAll,
    pushSignRequest, approveSignRequest, rejectSignRequest, timeoutSignRequest, removeSignRequest,
    isFirstTimeDapp, getSessionById, getActivityForSession,
    emitAccountsChanged, emitChainChanged,
  };

  return (
    <WalletConnectContext.Provider value={value}>
      {children}
    </WalletConnectContext.Provider>
  );
}

export function useWalletConnect() {
  const ctx = useContext(WalletConnectContext);
  if (!ctx) throw new Error('useWalletConnect must be used inside WalletConnectProvider');
  return ctx;
}

// ─── Helpers for activity description ───────────────────────────────────────

function activityTypeOf(req: SignRequest): SessionActivity['type'] {
  switch (req.method) {
    case 'eth_sendTransaction': return 'send_transaction';
    case 'eth_signTypedData_v4': return 'sign_typed_data';
    case 'wallet_switchEthereumChain': return 'switch_chain';
    default: return 'sign_message';
  }
}

function describeRequest(req: SignRequest): string {
  switch (req.method) {
    case 'eth_sendTransaction': {
      const d = (req as any).decoded;
      if (d?.type === 'erc20_transfer') return `Transfer ${d.tokenAmount} ${d.tokenSymbol}`;
      if (d?.type === 'erc20_approve') return `Approve ${d.tokenSymbol} (${d.isUnlimitedApprove ? '无限' : d.tokenAmount})`;
      if (d?.contractName) return `${d.contractName} 合约调用`;
      return '发起交易';
    }
    case 'eth_signTypedData_v4': return 'Typed Data 签名';
    case 'personal_sign': return '消息签名';
    case 'eth_sign': return '消息签名（eth_sign）';
    case 'wallet_switchEthereumChain': return '切换网络';
    default: return '请求';
  }
}
