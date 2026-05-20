// ConnectedDapps — list of active WalletConnect sessions

import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Link2, X, Clock, AlertCircle, Zap } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { useWalletConnect } from '@/contexts/WalletConnectContext';
import { useWallet } from '@/contexts/WalletContext';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { buildMockSignRequest, MOCK_SIGN_VARIANTS, type MockSignVariant } from '@/lib/mock-sign-requests';

function formatRelative(date: Date): string {
  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '刚刚';
  if (m < 60) return `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小时前`;
  const d = Math.floor(h / 24);
  return `${d} 天前`;
}

export default function ConnectedDapps() {
  const navigate = useNavigate();
  const { sessions, disconnectAll, pushSignRequest } = useWalletConnect();
  const { wallets } = useWallet();

  const getWalletName = (id: string) => wallets.find(w => w.id === id)?.name || '钱包';

  const getAccountDisplay = (walletId: string, addressId: string): string => {
    const w = wallets.find(x => x.id === walletId);
    if (!w) return '未知账户';
    const a = w.walletAddresses.find(x => x.id === addressId);
    if (!a) return w.name;
    const short = a.address.length > 14 ? `${a.address.slice(0, 6)}…${a.address.slice(-4)}` : a.address;
    return `${w.name} · ${short}`;
  };

  const handleDisconnectAll = () => {
    disconnectAll();
    toast.success('已断开全部 dApp 连接');
  };

  // ─── Demo trigger: mock dApp sending sign requests ─────────────────────
  const triggerMockSign = (variant: MockSignVariant) => {
    if (sessions.length === 0) return;
    const target = sessions[0];
    pushSignRequest(buildMockSignRequest(target.id, variant, target.dapp.name));
    toast(`模拟收到 ${target.dapp.name} 的签名请求`, { icon: '⚡' });
  };

  return (
    <AppLayout
      title="已连接的 dApp"
      leftAction={
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-foreground">
          <ChevronLeft className="w-5 h-5" />
        </button>
      }
      rightAction={sessions.length > 0 ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className="text-[13px] font-medium text-destructive">全部断开</button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>断开全部 dApp 连接？</AlertDialogTitle>
              <AlertDialogDescription>
                所有 {sessions.length} 个已连接的 dApp 都会失去与你钱包的连接。下次使用时需要重新扫码。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction onClick={handleDisconnectAll}>断开全部</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    >
      <div className="px-4 pt-2 pb-8">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted/40 flex items-center justify-center mb-4">
              <Link2 className="w-7 h-7 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <p className="text-[15px] font-semibold text-foreground mb-1">还没有已连接的 dApp</p>
            <p className="text-[13px] text-muted-foreground mb-6 max-w-[280px]">
              连接 dApp 后即可在 Cobo 内审批 Uniswap、Aave 等应用的签名请求
            </p>
            <Button onClick={() => navigate('/home')} className="h-10 px-6">回到主页连接</Button>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Demo trigger panel */}
            <div className="mb-3 p-3 rounded-xl bg-warning/8 border border-warning/20">
              <div className="flex items-center gap-1.5 mb-2">
                <Zap className="w-3.5 h-3.5 text-warning" />
                <p className="text-[11px] font-semibold text-warning uppercase tracking-wider">演示模式</p>
              </div>
              <p className="text-[11px] text-muted-foreground mb-2.5">点击模拟首个 dApp 发起签名请求</p>
              <div className="grid grid-cols-3 gap-1.5">
                {MOCK_SIGN_VARIANTS.map(v => (
                  <button
                    key={v.variant}
                    onClick={() => triggerMockSign(v.variant)}
                    className="flex items-center justify-center gap-1 px-2 py-1.5 bg-card rounded-md text-[11px] font-medium border border-border/60 active:scale-95"
                  >
                    <span>{v.emoji}</span>
                    <span>{v.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <AnimatePresence>
              {sessions.map(s => (
                <motion.button
                  key={s.id}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onClick={() => navigate(`/connected-dapps/${s.id}`)}
                  className="w-full flex items-center gap-3 p-4 bg-card rounded-xl border border-border/60 active:scale-[0.98] transition-transform text-left"
                >
                  <div className="w-11 h-11 rounded-xl bg-muted/50 flex items-center justify-center text-2xl shrink-0">
                    {s.dapp.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[14px] font-semibold text-foreground truncate">{s.dapp.name}</span>
                      {s.status === 'expiring_soon' && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-warning bg-warning/10 px-1.5 py-0.5 rounded font-medium">
                          <AlertCircle className="w-2.5 h-2.5" /> 即将过期
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-muted-foreground truncate mt-0.5">{s.dapp.url.replace(/^https?:\/\//, '')}</p>
                    <div className="flex items-center gap-2 mt-1 min-w-0">
                      <span className="text-[11px] text-muted-foreground truncate font-mono">{getAccountDisplay(s.walletId, s.walletAddressId)}</span>
                      <span className="text-[11px] text-muted-foreground/60 shrink-0">·</span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
                        <Clock className="w-3 h-3" />
                        {formatRelative(s.connectedAt)}
                      </span>
                    </div>
                  </div>
                  <div className={cn('w-2 h-2 rounded-full', s.status === 'active' ? 'bg-success' : 'bg-warning')} />
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
