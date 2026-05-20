// SessionApprovalDrawer — connection approval (read-only on account).
// User already picked the wallet address in ConnectDappDrawer; here they just confirm.

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck, Sparkles, AlertCircle, ExternalLink,
} from 'lucide-react';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { useWalletConnect } from '@/contexts/WalletConnectContext';
import { useWallet } from '@/contexts/WalletContext';
import { toast } from '@/lib/toast';
import type { WCEvmChain, DappSession } from '@/types/walletconnect';
import { ConnectionSuccessDrawer } from './ConnectionSuccessDrawer';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SUPPORTED_EVM_CHAINS: WCEvmChain[] = ['ethereum', 'bsc'];
const CHAIN_DISPLAY: Record<WCEvmChain, string> = {
  ethereum: 'Ethereum',
  bsc: 'BNB Chain',
};

function shortAddr(addr: string) {
  if (!addr) return '';
  return addr.length > 14 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}

export function SessionApprovalDrawer({ open, onOpenChange }: Props) {
  const {
    pendingConnection, approveConnection, rejectConnection, isFirstTimeDapp,
  } = useWalletConnect();
  const { wallets } = useWallet();

  const [successSession, setSuccessSession] = useState<DappSession | null>(null);
  const [successDescription, setSuccessDescription] = useState<string>('');

  const intersectedChains = useMemo(() => {
    if (!pendingConnection) return [] as WCEvmChain[];
    return pendingConnection.requestedChains.filter(c => SUPPORTED_EVM_CHAINS.includes(c));
  }, [pendingConnection]);

  const chainMismatch = !!pendingConnection && intersectedChains.length === 0;
  const isFirstTime = pendingConnection ? isFirstTimeDapp(pendingConnection.dapp.url) : false;

  // The wallet & address have been pre-selected (read-only here)
  const selectedWallet = pendingConnection
    ? wallets.find(w => w.id === pendingConnection.walletId)
    : null;
  const selectedAddress = selectedWallet?.walletAddresses.find(
    a => a.id === pendingConnection?.walletAddressId
  );

  const handleApprove = () => {
    if (!pendingConnection || chainMismatch) return;
    const newSession = approveConnection(intersectedChains);
    setSuccessSession(newSession);
    setSuccessDescription(
      selectedWallet && selectedAddress
        ? `${selectedWallet.name} · ${shortAddr(selectedAddress.address)}`
        : ''
    );
  };

  const handleReject = () => {
    rejectConnection();
    toast('已拒绝连接');
  };

  const handleSuccessClose = () => setSuccessSession(null);

  return (
    <>
      {pendingConnection && (
        <Drawer open={open && !!pendingConnection} onOpenChange={(o) => { if (!o && pendingConnection) handleReject(); else onOpenChange(o); }}>
          <DrawerContent className="max-h-[90vh]">
            <DrawerHeader className="sr-only"><DrawerTitle>连接审批</DrawerTitle></DrawerHeader>

            <div className="px-5 pt-2 pb-8 overflow-y-auto">
              <div className="text-center mb-5">
                <span className="text-[11px] font-medium text-primary uppercase tracking-wider">连接审批</span>
              </div>

              {/* dApp card */}
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center text-center mb-5"
              >
                <div className="w-16 h-16 rounded-2xl bg-muted/40 flex items-center justify-center text-4xl mb-3">
                  {pendingConnection.dapp.icon}
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-[18px] font-bold text-foreground">{pendingConnection.dapp.name}</h3>
                  {isFirstTime && !chainMismatch && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-warning bg-warning/10 px-1.5 py-0.5 rounded font-medium">
                      <Sparkles className="w-2.5 h-2.5" /> 首次连接
                    </span>
                  )}
                </div>
                <p className="flex items-center gap-1 text-[12px] text-muted-foreground">
                  <ExternalLink className="w-3 h-3" />
                  {pendingConnection.dapp.url.replace(/^https?:\/\//, '')}
                </p>
                {pendingConnection.dapp.description && (
                  <p className="text-[11px] text-muted-foreground/80 mt-1 max-w-[260px]">
                    {pendingConnection.dapp.description}
                  </p>
                )}
              </motion.div>

              {chainMismatch && (
                <div className="flex items-start gap-2 p-3 mb-4 rounded-xl bg-destructive/8 border border-destructive/30">
                  <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[13px] font-semibold text-destructive">链不支持</p>
                    <p className="text-[12px] text-destructive/80 mt-0.5">
                      此 dApp 请求的链不在 Cobo 当前支持范围（{pendingConnection.requestedChains.join('、')}）。
                    </p>
                  </div>
                </div>
              )}

              {isFirstTime && !chainMismatch && (
                <div className="flex items-start gap-2 p-3 mb-4 rounded-xl bg-warning/8 border border-warning/20">
                  <ShieldCheck className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[12px] font-semibold text-warning">这是你第一次连接此 dApp</p>
                    <p className="text-[11px] text-warning/80 mt-0.5">请仔细核对域名是否与你正在浏览的 dApp 一致</p>
                  </div>
                </div>
              )}

              <div className="space-y-3 mb-5">
                {/* Account — read-only summary */}
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">连接账户</p>
                  <div className="flex items-center gap-3 px-3 py-2.5 bg-card rounded-lg border border-border/60">
                    <div className="w-9 h-9 rounded-full bg-primary/8 flex items-center justify-center shrink-0">
                      <span className="text-[12px] font-mono font-bold text-primary">
                        {selectedAddress?.label.match(/\d+$/)?.[0] || 'E'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-foreground truncate">
                        {selectedWallet?.name || '未知钱包'}
                        <span className="text-[11px] text-muted-foreground font-normal ml-1.5">
                          · {selectedAddress?.label || ''}
                        </span>
                      </p>
                      <p className="text-[11px] text-muted-foreground font-mono truncate">
                        {selectedAddress ? selectedAddress.address : '—'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Network */}
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">网络</p>
                  <div className="flex items-center justify-between px-3 py-2.5 bg-card rounded-lg border border-border/60">
                    <span className="text-[13px] text-foreground">
                      {(chainMismatch
                        ? pendingConnection.requestedChains
                        : intersectedChains
                      )
                        .map(c => CHAIN_DISPLAY[c] || c.replace(/^./, ch => ch.toUpperCase()))
                        .join('、')}
                    </span>
                  </div>
                </div>

              </div>

              {chainMismatch ? (
                <Button variant="outline" className="w-full h-12" onClick={handleReject}>
                  返回
                </Button>
              ) : (
                <>
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1 h-12" onClick={handleReject}>
                      拒绝
                    </Button>
                    <Button
                      className="flex-1 h-12 gradient-primary"
                      onClick={handleApprove}
                    >
                      确认连接
                    </Button>
                  </div>

                  <p className="text-[11px] text-center text-muted-foreground mt-4">
                    连接后该 dApp 发起的每次签名仍需你单独确认
                  </p>
                </>
              )}
            </div>
          </DrawerContent>
        </Drawer>
      )}

      <ConnectionSuccessDrawer
        open={!!successSession}
        session={successSession}
        dapp={successSession?.dapp || null}
        walletName={successDescription}
        onClose={handleSuccessClose}
      />
    </>
  );
}
