// SignTransactionView — eth_sendTransaction view
// New layout: TxStoryCard on top, technical details collapsed below.

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Code2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SignTransactionRequest, DappMetadata } from '@/types/walletconnect';
import { tellTxStory } from '@/lib/tx-storyteller';
import { TxStoryCard } from './TxStoryCard';

interface Props {
  request: SignTransactionRequest;
  dapp?: DappMetadata;
}

export function SignTransactionView({ request, dapp }: Props) {
  const [showTech, setShowTech] = useState(false);
  const story = tellTxStory(request, dapp);

  return (
    <div className="space-y-4">
      {/* Story card (Rabby-style) */}
      <TxStoryCard story={story} />

      {/* Technical details toggle */}
      <button
        onClick={() => setShowTech(!showTech)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-muted/30 rounded-lg text-[12px] text-muted-foreground active:bg-muted/50"
      >
        <span className="flex items-center gap-1.5">
          <Code2 className="w-3.5 h-3.5" />
          {showTech ? '隐藏技术细节' : '查看技术细节'}
        </span>
        {showTech ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      <AnimatePresence>
        {showTech && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-card rounded-xl border border-border/60 divide-y divide-border/40">
              {request.decoded?.type === 'erc20_approve' && request.decoded.spender && (
                <Field label="Spender" value={shortAddr(request.decoded.spender)} mono />
              )}
              {request.decoded?.recipient && (
                <Field label="接收方" value={shortAddr(request.decoded.recipient)} mono />
              )}
              <Field label="目标合约" value={shortAddr(request.params.to)} mono />
              <Field label="原生价值 (wei)" value={request.params.value || '0x0'} mono />
              <Field label="网络" value={request.params.chain.toUpperCase()} />
              <Field label="预估 Gas" value={`~$${story.gasUsd.toFixed(2)}`} />
            </div>

            {/* Raw data */}
            <div className="mt-3 p-3 bg-muted/30 rounded-lg">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Calldata</p>
              <p className="text-[11px] font-mono text-muted-foreground break-all leading-relaxed">
                {request.params.data || '(空)'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5">
      <span className="text-[12px] text-muted-foreground">{label}</span>
      <span className={cn('text-[13px] font-medium text-foreground text-right', mono && 'font-mono text-[12px] truncate ml-2 max-w-[60%]')}>{value}</span>
    </div>
  );
}

function shortAddr(addr: string) {
  if (!addr) return '';
  return addr.length > 14 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}
