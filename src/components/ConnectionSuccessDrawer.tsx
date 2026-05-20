// ConnectionSuccessDrawer — post-connection success panel.
//
// Behaviour:
//   • No "返回 dApp" / "留在 App" CTAs (user goes back to PC to operate the dApp).
//   • Includes a small "演示推送交易" panel so the user can preview the sign-request flow
//     without leaving the app.

import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, Zap } from 'lucide-react';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle,
} from '@/components/ui/drawer';
import { SuccessCheckmark } from './SuccessCheckmark';
import { useWalletConnect } from '@/contexts/WalletConnectContext';
import {
  MOCK_SIGN_VARIANTS, buildMockSignRequest, type MockSignVariant,
} from '@/lib/mock-sign-requests';
import { toast } from '@/lib/toast';
import type { DappMetadata, DappSession } from '@/types/walletconnect';

interface Props {
  open: boolean;
  /** When provided, the chip grid is enabled (we know which session to push requests to). */
  session?: DappSession | null;
  dapp: DappMetadata | null;
  /** Pre-formatted account display, e.g. "我的钱包 · 0xAb58...eC9B". */
  walletName?: string;
  onClose: () => void;
}

export function ConnectionSuccessDrawer({ open, session, dapp, walletName, onClose }: Props) {
  const { pushSignRequest } = useWalletConnect();

  const handlePushDemo = (variant: MockSignVariant) => {
    if (!session) return;
    const req = buildMockSignRequest(session.id, variant, dapp?.name);
    pushSignRequest(req);
    toast(`已模拟 ${dapp?.name || 'dApp'} 推送一笔请求`, { icon: '⚡' });
    onClose();
    // The global WalletConnectGlobal will auto-navigate to /wc-sign/:id when pending list changes.
  };

  return (
    <Drawer open={open && !!dapp} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DrawerContent>
        <DrawerHeader className="sr-only"><DrawerTitle>已连接</DrawerTitle></DrawerHeader>

        <div className="px-5 pt-4 pb-8">
          <AnimatePresence>
            {dapp && (
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center text-center"
              >
                <SuccessCheckmark size={64} className="mb-3" />
                <p className="text-[12px] font-semibold text-success uppercase tracking-wider mb-3">已连接</p>

                {/* dApp card */}
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 mb-2 rounded-2xl bg-card border border-border/60"
                >
                  <div className="w-11 h-11 rounded-xl bg-muted/50 flex items-center justify-center text-2xl shrink-0">
                    {dapp.icon}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-[15px] font-bold text-foreground truncate">{dapp.name}</p>
                    <p className="flex items-center gap-1 text-[11px] text-muted-foreground truncate">
                      <ExternalLink className="w-3 h-3" />
                      {dapp.url.replace(/^https?:\/\//, '')}
                    </p>
                    {walletName && (
                      <p className="text-[11px] text-primary mt-0.5 font-medium truncate">使用 {walletName}</p>
                    )}
                  </div>
                </motion.div>

                <motion.p
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
                  className="text-[12px] text-muted-foreground mb-5"
                >
                  请回到 dApp 端继续操作，签名请求将推送到这里
                </motion.p>

                {/* Demo push panel — lets the user simulate an incoming sign request */}
                {session && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 }}
                    className="w-full rounded-xl bg-warning/8 border border-warning/20 p-3"
                  >
                    <div className="flex items-center gap-1.5 mb-2">
                      <Zap className="w-3.5 h-3.5 text-warning" />
                      <p className="text-[11px] font-semibold text-warning uppercase tracking-wider">演示模式</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground mb-3 text-left">
                      模拟 {dapp.name} 向你的钱包推送一种签名请求
                    </p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {MOCK_SIGN_VARIANTS.slice(0, 3).map(v => (
                        <button
                          key={v.variant}
                          onClick={() => handlePushDemo(v.variant)}
                          className="flex items-center justify-center gap-1 px-2 py-2 bg-card rounded-md border border-border/60 text-[11px] font-medium active:scale-95"
                        >
                          <span>{v.emoji}</span>
                          <span>{v.label}</span>
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                      {MOCK_SIGN_VARIANTS.slice(3).map(v => (
                        <button
                          key={v.variant}
                          onClick={() => handlePushDemo(v.variant)}
                          className="flex items-center justify-center gap-1 px-2 py-2 bg-card rounded-md border border-border/60 text-[11px] font-medium active:scale-95"
                        >
                          <span>{v.emoji}</span>
                          <span>{v.label}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
