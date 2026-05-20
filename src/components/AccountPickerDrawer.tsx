// AccountPickerDrawer — pick a specific wallet address (EVM only for WalletConnect)
// to expose to a dApp before scanning / pasting a WC URI.

import { motion } from 'framer-motion';
import { CheckCircle2, Wallet as WalletIcon } from 'lucide-react';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle,
} from '@/components/ui/drawer';
import { useWallet } from '@/contexts/WalletContext';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedWalletId: string;
  selectedAddressId: string;
  onSelect: (walletId: string, addressId: string) => void;
}

function shortAddr(addr: string) {
  if (!addr) return '';
  return addr.length > 14 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}

export function AccountPickerDrawer({
  open, onOpenChange, selectedWalletId, selectedAddressId, onSelect,
}: Props) {
  const { wallets } = useWallet();

  // Flatten to all EVM addresses across all wallets (WC v2 EVM scope)
  const entries = wallets.flatMap(w =>
    (w.walletAddresses || [])
      .filter(a => a.system === 'evm')
      .map(a => ({ wallet: w, addr: a }))
  );

  // Group by wallet for display
  const grouped = wallets.map(w => ({
    wallet: w,
    addresses: entries.filter(e => e.wallet.id === w.id).map(e => e.addr),
  })).filter(g => g.addresses.length > 0);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[78vh]">
        <DrawerHeader className="sr-only"><DrawerTitle>选择账户</DrawerTitle></DrawerHeader>

        <div className="px-5 pt-2 pb-8">
          <div className="text-center mb-4">
            <p className="text-[11px] font-medium text-primary uppercase tracking-wider">选择账户</p>
            <h3 className="text-[18px] font-bold text-foreground mt-1">用哪个账户连接？</h3>
            <p className="text-[12px] text-muted-foreground mt-1 max-w-[280px] mx-auto">
              WalletConnect 把这个地址暴露给 dApp。EVM 链共享同一地址。
            </p>
          </div>

          <div className="space-y-4 overflow-y-auto">
            {grouped.map(({ wallet, addresses }) => (
              <div key={wallet.id}>
                <div className="flex items-center gap-1.5 mb-1.5 px-1">
                  <WalletIcon className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.75} />
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {wallet.name}
                  </p>
                </div>
                <div className="bg-card rounded-xl border border-border/60 divide-y divide-border/40 overflow-hidden">
                  {addresses.map(a => {
                    const isSelected = a.id === selectedAddressId && wallet.id === selectedWalletId;
                    return (
                      <motion.button
                        key={a.id}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => {
                          onSelect(wallet.id, a.id);
                          onOpenChange(false);
                        }}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-3 text-left active:bg-muted/30',
                          isSelected && 'bg-primary/5'
                        )}
                      >
                        <div className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center shrink-0 text-[11px] font-mono font-semibold">
                          {a.label.match(/\d+$/)?.[0] || 'E'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-foreground truncate">{a.label}</p>
                          <p className="text-[11px] text-muted-foreground font-mono truncate">{shortAddr(a.address)}</p>
                        </div>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {grouped.length === 0 && (
            <div className="py-12 text-center text-[13px] text-muted-foreground">
              暂无可用的 EVM 账户
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
