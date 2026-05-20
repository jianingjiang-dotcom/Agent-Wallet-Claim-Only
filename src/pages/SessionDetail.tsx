// SessionDetail — single dApp session detail page

import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ChevronLeft, ExternalLink, X,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { useWalletConnect } from '@/contexts/WalletConnectContext';
import { useWallet } from '@/contexts/WalletContext';
import { toast } from '@/lib/toast';

export default function SessionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getSessionById, disconnectSession } = useWalletConnect();
  const { wallets } = useWallet();

  const session = id ? getSessionById(id) : undefined;

  if (!session) {
    return (
      <AppLayout
        title="会话详情"
        leftAction={<button onClick={() => navigate(-1)} className="p-2 -ml-2"><ChevronLeft className="w-5 h-5" /></button>}
      >
        <div className="flex items-center justify-center h-full text-muted-foreground">
          会话不存在或已断开
        </div>
      </AppLayout>
    );
  }

  const wallet = wallets.find(w => w.id === session.walletId);
  const addr = wallet?.walletAddresses.find(a => a.id === session.walletAddressId);
  const shortAddr = addr
    ? (addr.address.length > 14 ? `${addr.address.slice(0, 6)}…${addr.address.slice(-4)}` : addr.address)
    : '';

  const handleDisconnect = () => {
    disconnectSession(session.id);
    toast.success(`已断开与 ${session.dapp.name} 的连接`);
    navigate(-1);
  };

  return (
    <AppLayout
      title="会话详情"
      leftAction={<button onClick={() => navigate(-1)} className="p-2 -ml-2"><ChevronLeft className="w-5 h-5" /></button>}
    >
      <div className="px-4 pt-2 pb-8 space-y-4">
        {/* dApp header */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border/60"
        >
          <div className="w-14 h-14 rounded-xl bg-muted/50 flex items-center justify-center text-3xl shrink-0">
            {session.dapp.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[16px] font-bold text-foreground truncate">{session.dapp.name}</p>
            <button
              onClick={() => { navigator.clipboard.writeText(session.dapp.url); toast.success('已复制 URL'); }}
              className="flex items-center gap-1 text-[12px] text-muted-foreground mt-0.5 truncate"
            >
              <ExternalLink className="w-3 h-3" />
              {session.dapp.url.replace(/^https?:\/\//, '')}
            </button>
            {session.dapp.description && (
              <p className="text-[11px] text-muted-foreground/80 mt-1">{session.dapp.description}</p>
            )}
          </div>
        </motion.div>

        {/* Connection info */}
        <div className="bg-card rounded-xl border border-border/60 divide-y divide-border/40">
          <Row label="关联钱包" value={wallet?.name || '钱包'} />
          {addr && (
            <Row
              label="账户地址"
              value={
                <span className="flex flex-col items-end">
                  <span className="text-[11px] text-muted-foreground">{addr.label}</span>
                  <span className="font-mono text-[12px] text-foreground">{shortAddr}</span>
                </span>
              }
            />
          )}
          <Row label="连接时间" value={session.connectedAt.toLocaleString('zh-CN')} />
          <Row label="过期时间" value={session.expiresAt.toLocaleString('zh-CN')} />
          <Row label="链" value={session.chains.map(c => c.toUpperCase()).join('、')} />
        </div>

        {/* Disconnect */}
        <Button
          variant="outline"
          className="w-full h-11 border-destructive/30 text-destructive hover:bg-destructive/8"
          onClick={handleDisconnect}
        >
          <X className="w-4 h-4 mr-1.5" />
          断开连接
        </Button>
      </div>
    </AppLayout>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-[12px] text-muted-foreground">{label}</span>
      <span className="text-[13px] font-medium text-foreground">{value}</span>
    </div>
  );
}
