// WcSignRequest — fullscreen signing page for WalletConnect requests.
// Visual parity with TssSigningDetail, but data source is WalletConnectContext.

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, ArrowRight, Sparkles, ChevronDown, FileText, AlertTriangle,
  ArrowUpRight, RefreshCcw, FileCode, Code2,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { SwipeBack } from '@/components/SwipeBack';
import { Button } from '@/components/ui/button';
import { DetailRow } from '@/components/ui/detail-row';
import { BiometricVerifyDrawer } from '@/components/BiometricVerifyDrawer';
import { SuccessCheckmark } from '@/components/SuccessCheckmark';
import { TxStoryCard } from '@/components/sign-views/TxStoryCard';
import { useWalletConnect } from '@/contexts/WalletConnectContext';
import { useWallet } from '@/contexts/WalletContext';
import { tellTxStory } from '@/lib/tx-storyteller';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import type { SignRequest } from '@/types/walletconnect';

const METHOD_TITLE: Record<string, string> = {
  eth_sendTransaction: '发起交易',
  personal_sign: '消息签名',
  eth_sign: '消息签名（旧版）',
  eth_signTypedData_v4: '结构化数据签名',
  wallet_switchEthereumChain: '切换网络',
};

const CHAIN_DISPLAY: Record<string, string> = {
  ethereum: 'Ethereum',
  bsc: 'BNB Chain',
};

function shortAddr(addr: string) {
  if (!addr) return '';
  return addr.length > 14 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}

export default function WcSignRequest() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo;
  const {
    pendingRequests, approveSignRequest, rejectSignRequest, timeoutSignRequest, getSessionById,
  } = useWalletConnect();
  const { wallets } = useWallet();

  const request = pendingRequests.find(r => r.id === id);
  const session = request ? getSessionById(request.sessionId) : undefined;
  const wallet = session ? wallets.find(w => w.id === session.walletId) : undefined;
  const address = wallet?.walletAddresses.find(a => a.id === session?.walletAddressId);

  const [biometricOpen, setBiometricOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<'approve' | 'reject' | null>(null);
  const [ackEthSign, setAckEthSign] = useState(false);
  const [msgDetailOpen, setMsgDetailOpen] = useState(false);
  const [techOpen, setTechOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);

  // Pending queue (excluding current) — used for "queue badge"
  const otherPending = pendingRequests.filter(r => r.id !== id && r.status === 'pending');

  // 60s countdown (drives display + falls through to context timeout)
  useEffect(() => {
    if (!request || request.status !== 'pending') return;
    const update = () => {
      const remaining = Math.max(0, Math.floor((request.expiresAt.getTime() - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        toast.error('签名请求已超时');
        timeoutSignRequest(request.id);
        goNext();
      }
    };
    update();
    const tid = setInterval(update, 1000);
    return () => clearInterval(tid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.id, request?.status]);

  // After success/reject: navigate away after a short delay, but keep the request
  // in context so it shows up as a completed item in the todo center.
  useEffect(() => {
    if (!request) return;
    if (request.status === 'approved' || request.status === 'rejected') {
      const tid = setTimeout(() => {
        goNext();
      }, 1500);
      return () => clearTimeout(tid);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.status, request?.id]);

  const goNext = () => {
    const next = pendingRequests.find(r => r.id !== id && r.status === 'pending');
    if (next) {
      // Preserve original returnTo so chained sign requests still know where to return
      navigate(`/wc-sign/${next.id}`, { replace: true, state: { returnTo } });
    } else if (returnTo) {
      navigate(returnTo, { replace: true });
    } else {
      navigate('/home', { replace: true });
    }
  };

  // ─── No request found ─────────────────────────────────────────────────────
  if (!request) {
    return (
      <SwipeBack>
        <AppLayout showNav={false} showBack onBack={() => navigate(-1)} title="交易签名" showSecurityBanner={false}>
          <div className="flex-1 flex items-center justify-center px-6 text-center">
            <p className="text-muted-foreground text-[14px]">签名请求已不存在或已处理</p>
          </div>
        </AppLayout>
      </SwipeBack>
    );
  }

  const isPending = request.status === 'pending';
  const isApproved = request.status === 'approved';
  const isRejected = request.status === 'rejected';

  const requiresBiometric =
    request.method === 'eth_sendTransaction' || request.method === 'eth_signTypedData_v4';
  const isEthSign = request.method === 'eth_sign';

  // ─── Title block (top header, parity with TssSigningDetail) ──────────────
  const titleBlock = useMemo(() => {
    if (request.method === 'eth_sendTransaction' && request.decoded?.contractName) {
      return {
        title: request.decoded.contractName,
        Icon: ArrowUpRight,
        iconBg: 'bg-primary/10 text-primary',
      };
    }
    if (request.method === 'wallet_switchEthereumChain') {
      return {
        title: CHAIN_DISPLAY[request.params.targetChain] || request.params.targetChain.toUpperCase(),
        Icon: RefreshCcw,
        iconBg: 'bg-primary/10 text-primary',
      };
    }
    if (request.method === 'eth_signTypedData_v4') {
      return {
        title: request.params.typedData.domain.name as string || 'EIP-712 Data',
        Icon: FileCode,
        iconBg: 'bg-primary/10 text-primary',
      };
    }
    // personal_sign / eth_sign
    return {
      title: session?.dapp.name || '消息签名',
      Icon: FileText,
      iconBg: 'bg-primary/10 text-primary',
    };
  }, [request, session]);

  const handleSign = () => {
    if (isEthSign && !ackEthSign) {
      toast.error('请先确认你已了解 eth_sign 的风险');
      return;
    }
    setPendingAction('approve');
    if (requiresBiometric) {
      setBiometricOpen(true);
    } else {
      approveSignRequest(request.id);
    }
  };

  const handleReject = () => {
    setPendingAction('reject');
    rejectSignRequest(request.id, 'User rejected');
  };

  const handleBiometricVerified = () => {
    if (pendingAction === 'approve') approveSignRequest(request.id);
    setPendingAction(null);
  };

  const { Icon: TitleIcon } = titleBlock;

  return (
    <SwipeBack>
      <AppLayout
        showNav={false}
        showBack
        onBack={() => {
          if (returnTo) navigate(returnTo, { replace: true });
          else navigate(-1);
        }}
        title="交易签名"
        showSecurityBanner={false}
        rightAction={
          <motion.button
            onClick={() => navigate('/assistant')}
            className="relative flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-full overflow-hidden active:scale-95 transition-transform"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #6366F1, #3B82F6)', boxShadow: '0 2px 8px rgba(99, 102, 241, 0.4)' }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
          >
            <motion.div
              className="absolute inset-0 opacity-30"
              style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)' }}
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
            />
            <Sparkles className="w-3 h-3 text-white relative z-10" strokeWidth={2} />
            <span className="text-[11px] font-semibold text-white relative z-10 tracking-wide">Ask AI</span>
          </motion.button>
        }
      >
        <div className="flex flex-col h-full">
          <div className="flex-1 px-4 overflow-y-auto">
            {/* Queue badge if there are other pending */}
            {otherPending.length > 0 && isPending && (
              <motion.button
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => navigate(`/wc-sign/${otherPending[0].id}`, { replace: true })}
                className="w-full mt-3 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary/8 text-primary text-[12px] font-medium"
              >
                还有 {otherPending.length} 个签名请求待处理 · 查看下一个
              </motion.button>
            )}

            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center pt-8 pb-6"
            >
              <div className={cn('w-14 h-14 rounded-full flex items-center justify-center', titleBlock.iconBg)}>
                <TitleIcon className="w-7 h-7" strokeWidth={1.5} />
              </div>
              <p className="text-xl font-bold text-foreground mt-3 text-center px-4 break-words">
                {titleBlock.title}
              </p>
              {session && (
                <p className="text-[12px] text-muted-foreground mt-1">来自 {session.dapp.name}</p>
              )}
            </motion.div>

            {/* Status card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className={cn(
                'rounded-xl px-4 py-3 mb-4',
                isPending && 'bg-[#FEF3E7]',
                isApproved && 'bg-[#ECFBF2] dark:bg-success/20',
                isRejected && 'bg-[#FBEFF6]',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {isPending && <Clock className="w-4 h-4 text-warning" strokeWidth={1.5} />}
                  {isApproved && <SuccessCheckmark size={20} className="!bg-transparent" />}
                  {isRejected && <AlertTriangle className="w-4 h-4 text-destructive" strokeWidth={1.5} />}
                  <span className={cn(
                    'text-sm font-medium',
                    isPending && 'text-warning',
                    isApproved && 'text-success',
                    isRejected && 'text-destructive',
                  )}>
                    {isPending ? '等待签名确认' : isApproved ? '已签名' : '已拒绝签名'}
                  </span>
                </div>
                {isPending && (
                  <span className={cn(
                    'text-[11px] font-mono',
                    secondsLeft <= 15 ? 'text-destructive' : 'text-warning',
                  )}>{secondsLeft}s</span>
                )}
              </div>
            </motion.div>

            {/* eth_sign warning gate */}
            {isEthSign && !ackEthSign && isPending && (
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="p-4 mb-4 rounded-xl bg-destructive/8 border border-destructive/30"
              >
                <div className="flex items-start gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[14px] font-bold text-destructive">高风险：eth_sign</p>
                    <p className="text-[12px] text-destructive/80 mt-1 leading-relaxed">
                      这是一种已废弃的签名方法，被攻击者大量利用进行钓鱼。被签名的内容是任意 hash，你无法看出实际签了什么。
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline" size="sm"
                  className="w-full border-destructive/30 text-destructive"
                  onClick={() => setAckEthSign(true)}
                >
                  我已了解风险，仍要查看
                </Button>
              </motion.div>
            )}

            {/* Tx story (for sendTransaction) */}
            {request.method === 'eth_sendTransaction' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
                className="rounded-xl bg-[#F8F9FC] dark:bg-muted/30 p-4 mb-4"
              >
                <TxStoryCard story={tellTxStory(request, session?.dapp)} />
              </motion.div>
            )}

            {/* Detail rows (TssSigningDetail style) */}
            {(!isEthSign || ackEthSign) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="rounded-xl bg-[#F8F9FC] dark:bg-muted/30 py-4 space-y-4 mb-4"
              >
                <DetailRow label="交易类型" value={METHOD_TITLE[request.method] || request.method} />

                {request.method === 'eth_signTypedData_v4' && (
                  <>
                    <DetailRow label="签名类型" value={request.params.typedData.primaryType} />
                    <DetailRow
                      label="合约地址"
                      value={request.params.typedData.domain.verifyingContract as string || '-'}
                      copyValue={request.params.typedData.domain.verifyingContract as string}
                      mono
                    />
                    <DetailRow label="链" value={CHAIN_DISPLAY[request.params.chain] || request.params.chain.toUpperCase()} />
                  </>
                )}

                {request.method === 'eth_sendTransaction' && (
                  <>
                    <DetailRow label="链" value={CHAIN_DISPLAY[request.params.chain] || request.params.chain.toUpperCase()} />
                    <DetailRow
                      label="目标合约"
                      value={request.params.to}
                      copyValue={request.params.to}
                      mono
                    />
                    {request.decoded?.recipient && (
                      <DetailRow
                        label="接收方"
                        value={request.decoded.recipient}
                        copyValue={request.decoded.recipient}
                        mono
                      />
                    )}
                  </>
                )}

                {(request.method === 'personal_sign' || request.method === 'eth_sign') && (
                  <DetailRow label="链" value={CHAIN_DISPLAY[request.params.chain] || request.params.chain.toUpperCase()} />
                )}

                {request.method === 'wallet_switchEthereumChain' && (
                  <DetailRow label="目标链" value={CHAIN_DISPLAY[request.params.targetChain] || request.params.targetChain.toUpperCase()} />
                )}

                {/* Source dApp */}
                {session && (
                  <DetailRow
                    label="发起 dApp"
                    value={
                      <span className="flex items-center gap-1.5">
                        <span>{session.dapp.icon}</span>
                        <span>{session.dapp.name}</span>
                      </span>
                    }
                  />
                )}

                {/* Signing account */}
                {wallet && address && (
                  <DetailRow
                    label="签名账户"
                    value={
                      <span className="flex flex-col items-end leading-tight">
                        <span className="text-[12px] text-muted-foreground">{wallet.name}</span>
                        <span className="text-[12px] font-mono">{shortAddr(address.address)}</span>
                      </span>
                    }
                  />
                )}

                <DetailRow label="推送时间" value={request.receivedAt.toLocaleString('zh-CN')} />
              </motion.div>
            )}

            {/* Message body (personal_sign) */}
            {(request.method === 'personal_sign' || request.method === 'eth_sign') && (!isEthSign || ackEthSign) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
                className="rounded-xl bg-white dark:bg-card border border-border/60 shadow-sm overflow-hidden mb-4"
              >
                <div className="px-4 py-3.5">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">消息内容</p>
                  <p className="text-[13px] text-foreground whitespace-pre-wrap break-words leading-relaxed">
                    {request.params.message}
                  </p>
                </div>
              </motion.div>
            )}

            {/* EIP-712 Typed Data — collapsible "签名详情" */}
            {request.method === 'eth_signTypedData_v4' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                className="rounded-xl bg-white dark:bg-card border border-border/60 shadow-sm overflow-hidden mb-4"
              >
                <button
                  onClick={() => setMsgDetailOpen(v => !v)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                >
                  <FileText className="w-4 h-4 text-primary shrink-0" strokeWidth={1.5} />
                  <span className="flex-1 text-[14px] font-semibold text-foreground">签名详情</span>
                  <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', msgDetailOpen && 'rotate-180')} strokeWidth={1.5} />
                </button>
                <AnimatePresence>
                  {msgDetailOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4">
                        <pre className="text-[12px] font-mono text-foreground/80 bg-[#F8F9FC] dark:bg-muted/30 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
                          {JSON.stringify(request.params.typedData.message, null, 2)}
                        </pre>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* Raw calldata for sendTransaction — collapsible */}
            {request.method === 'eth_sendTransaction' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                className="rounded-xl bg-white dark:bg-card border border-border/60 shadow-sm overflow-hidden mb-4"
              >
                <button
                  onClick={() => setTechOpen(v => !v)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                >
                  <Code2 className="w-4 h-4 text-primary shrink-0" strokeWidth={1.5} />
                  <span className="flex-1 text-[14px] font-semibold text-foreground">技术细节 · Calldata</span>
                  <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', techOpen && 'rotate-180')} strokeWidth={1.5} />
                </button>
                <AnimatePresence>
                  {techOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4">
                        <pre className="text-[11px] font-mono text-foreground/80 bg-[#F8F9FC] dark:bg-muted/30 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
                          {request.params.data || '(空)'}
                        </pre>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* Post-action follow-up */}
            {!isPending && (
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                className="space-y-3"
              >
                {isApproved && session && (
                  <button
                    onClick={() => {
                      toast.success(`已唤起 ${session.dapp.name}`);
                      goNext();
                    }}
                    className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl bg-[#F8F9FC] dark:bg-muted/30 transition-colors active:bg-muted"
                  >
                    <span className="text-sm text-foreground">返回 {session.dapp.name}</span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}
              </motion.div>
            )}
          </div>

          {/* Bottom actions */}
          {isPending && (
            <div className="px-4 pb-8 pt-4 flex gap-3">
              <Button
                variant="outline" size="lg"
                className="flex-1 h-12 text-base font-medium"
                onClick={handleReject}
              >
                拒绝
              </Button>
              <Button
                variant="default" size="lg"
                className="flex-1 h-12 text-base font-medium"
                onClick={handleSign}
                disabled={isEthSign && !ackEthSign}
              >
                {request.method === 'wallet_switchEthereumChain' ? '切换网络' : '签名'}
              </Button>
            </div>
          )}
        </div>

        <BiometricVerifyDrawer
          open={biometricOpen}
          onOpenChange={setBiometricOpen}
          title="确认签名"
          description={`此操作将通过 ${session?.dapp.name || '该 dApp'} 触发链上交易`}
          onVerified={handleBiometricVerified}
        />
      </AppLayout>
    </SwipeBack>
  );
}
