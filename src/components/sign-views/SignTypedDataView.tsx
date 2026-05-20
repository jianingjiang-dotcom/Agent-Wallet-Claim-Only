// SignTypedDataView — eth_signTypedData_v4 view (EIP-712)

import { FileCode } from 'lucide-react';
import type { SignTypedDataRequest } from '@/types/walletconnect';

interface Props {
  request: SignTypedDataRequest;
}

export function SignTypedDataView({ request }: Props) {
  const td = request.params.typedData;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
          <FileCode className="w-5 h-5 text-primary" strokeWidth={1.75} />
        </div>
        <div>
          <p className="text-[15px] font-bold text-foreground leading-tight">结构化数据签名</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">EIP-712 typed data · {request.params.chain.toUpperCase()}</p>
        </div>
      </div>

      {/* Domain */}
      <div className="p-3 bg-muted/40 rounded-xl border border-border/60">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Domain</p>
        <pre className="text-[11px] font-mono text-foreground leading-relaxed whitespace-pre-wrap break-words">
          {JSON.stringify(td.domain, null, 2)}
        </pre>
      </div>

      {/* Primary Type / Message */}
      <div className="p-3 bg-muted/40 rounded-xl border border-border/60">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          {td.primaryType}
        </p>
        <pre className="text-[11px] font-mono text-foreground leading-relaxed whitespace-pre-wrap break-words">
          {JSON.stringify(td.message, null, 2)}
        </pre>
      </div>

      <p className="text-[11px] text-center text-muted-foreground">
        签名地址 · {request.params.address.slice(0, 6)}…{request.params.address.slice(-4)}
      </p>
    </div>
  );
}
