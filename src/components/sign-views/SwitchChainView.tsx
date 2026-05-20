// SwitchChainView — wallet_switchEthereumChain view

import { RefreshCcw, ArrowRight } from 'lucide-react';
import type { SwitchChainRequest } from '@/types/walletconnect';

const CHAIN_DISPLAY: Record<string, string> = {
  ethereum: 'Ethereum',
  bsc: 'BNB Chain',
};

interface Props {
  request: SwitchChainRequest;
}

export function SwitchChainView({ request }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
          <RefreshCcw className="w-5 h-5 text-primary" strokeWidth={1.75} />
        </div>
        <div>
          <p className="text-[15px] font-bold text-foreground leading-tight">切换网络</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">dApp 请求切换到目标链</p>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 p-5 bg-muted/40 rounded-xl border border-border/60">
        <span className="text-[20px] font-bold text-foreground">
          {CHAIN_DISPLAY[request.params.targetChain] || request.params.targetChain.toUpperCase()}
        </span>
        <ArrowRight className="w-4 h-4 text-muted-foreground" />
        <span className="text-[14px] text-muted-foreground">作为活跃链</span>
      </div>

      <p className="text-[12px] text-muted-foreground text-center">
        切换后该 dApp 的后续请求会基于新链
      </p>
    </div>
  );
}
