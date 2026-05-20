// SignMessageView — personal_sign / eth_sign view

import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ChevronDown, ChevronUp, FileSignature } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SignMessageRequest } from '@/types/walletconnect';

interface Props {
  request: SignMessageRequest;
  ethSignWarningAcknowledged: boolean;
  onAcknowledgeEthSignWarning: () => void;
}

export function SignMessageView({ request, ethSignWarningAcknowledged, onAcknowledgeEthSignWarning }: Props) {
  const [showRaw, setShowRaw] = useState(false);
  const isLegacy = request.method === 'eth_sign';

  return (
    <div className="space-y-3">
      {/* Title */}
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
          <FileSignature className="w-5 h-5 text-primary" strokeWidth={1.75} />
        </div>
        <div>
          <p className="text-[15px] font-bold text-foreground leading-tight">消息签名</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {isLegacy ? 'eth_sign（旧版，盲签风险）' : 'personal_sign'}
          </p>
        </div>
      </div>

      {/* eth_sign warning gate */}
      {isLegacy && !ethSignWarningAcknowledged && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-destructive/8 border border-destructive/30"
        >
          <div className="flex items-start gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-[14px] font-bold text-destructive">高风险：eth_sign</p>
              <p className="text-[12px] text-destructive/80 mt-1 leading-relaxed">
                这是一种已废弃的签名方法，被攻击者大量利用进行钓鱼。被签名的内容是任意 hash，
                你无法看出实际签了什么。如果你不是 100% 信任这个 dApp，建议拒绝。
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full border-destructive/30 text-destructive"
            onClick={onAcknowledgeEthSignWarning}
          >
            我已了解风险，仍要查看
          </Button>
        </motion.div>
      )}

      {/* Message body — only when not gated */}
      {(!isLegacy || ethSignWarningAcknowledged) && (
        <>
          <div className="p-4 bg-muted/40 rounded-xl border border-border/60">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">消息内容</p>
            <p className="text-[14px] text-foreground leading-relaxed whitespace-pre-wrap break-words">
              {request.params.message}
            </p>
          </div>

          <div className="bg-card rounded-xl border border-border/60 divide-y divide-border/40">
            <Field label="网络" value={request.params.chain.toUpperCase()} />
            <Field label="签名地址" value={shortAddr(request.params.address)} mono />
          </div>

          <button
            onClick={() => setShowRaw(!showRaw)}
            className="w-full flex items-center justify-between px-3 py-2.5 bg-muted/30 rounded-lg text-[12px] text-muted-foreground"
          >
            <span>{showRaw ? '隐藏原始数据' : '查看原始数据 (hex)'}</span>
            {showRaw ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {showRaw && (
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-[11px] font-mono text-muted-foreground break-all leading-relaxed">
                {request.params.rawHex || '(空)'}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5">
      <span className="text-[12px] text-muted-foreground">{label}</span>
      <span className={`text-[13px] font-medium text-foreground text-right ${mono ? 'font-mono text-[12px]' : ''}`}>{value}</span>
    </div>
  );
}

function shortAddr(addr: string) {
  if (!addr) return '';
  return addr.length > 14 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}
