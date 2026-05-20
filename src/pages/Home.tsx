import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye, EyeOff, ChevronRight, Send, QrCode,
  TrendingDown, Wallet, Plus, Shield, AlertTriangle,
  CheckCircle2, Sparkles, Lock, ChevronDown, Clock, Bell, Bot, ClipboardCheck,
  LayoutGrid, Key, HelpCircle, Copy, Link2, SlidersHorizontal, Loader2
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import CoboLogo from '@/assets/cobo-logo.svg';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useWallet, aggregateByChain } from '@/contexts/WalletContext';
import { useWalletConnect } from '@/contexts/WalletConnectContext';
import { ConnectDappDrawer } from '@/components/ConnectDappDrawer';
import { WalletConnectOnboardingDrawer } from '@/components/WalletConnectOnboardingDrawer';
import { isOnboardingDone } from '@/lib/wc-storage';
import { cn } from '@/lib/utils';
import { ChainDropdown } from '@/components/ChainDropdown';
import { CryptoIcon } from '@/components/CryptoIcon';
import { CryptoIconWithChain } from '@/components/CryptoIconWithChain';
import { ChainIcon } from '@/components/ChainIcon';
import { TokenManager } from '@/components/TokenManager';
import { PullToRefresh } from '@/components/PullToRefresh';
import { WalletSwitcher } from '@/components/WalletSwitcher';
import { BalanceCardSkeleton, AssetListSkeleton, TransactionListSkeleton } from '@/components/skeletons';
import { EmptyState } from '@/components/EmptyState';
import { AnimatedBalance } from '@/components/AnimatedNumber';
import { WalletModeBadge } from '@/components/WalletModeBadge';
import { ProfileSidebar } from '@/components/ProfileSidebar';
import { RecoveryBanner } from '@/components/RecoveryBanner';
import { RecoveryRequiredDrawer } from '@/components/RecoveryRequiredDrawer';
import { useRequireRecovery } from '@/hooks/useRequireRecovery';

import { AddressPicker } from '@/components/AddressPicker';
import { ChainId, SUPPORTED_CHAINS, Transaction, isAgentLinked, AddressSelection, ADDRESS_SYSTEMS } from '@/types/wallet';
import { TokenInfo } from '@/lib/tokens';
import { toast } from '@/lib/toast';
import { showInAppNotification } from '@/lib/in-app-notification';
import { getChainShortName } from '@/lib/chain-utils';

// Welcome + pairing page when no wallet exists
function EmptyWalletState() {
  const navigate = useNavigate();

  return (
    <AppLayout showNav>
      <div className="h-full flex flex-col items-center justify-center px-6 pb-20">
        <div className="w-full max-w-sm space-y-8">
          {/* Header — centered */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <div className="flex items-center justify-center gap-2.5 mb-2">
              <h1 className="text-xl font-bold text-foreground">欢迎使用</h1>
              <div className="flex items-center gap-1.5">
                <img src={CoboLogo} alt="Cobo" className="h-4" />
                <span className="text-[10px] font-bold text-foreground tracking-wide leading-none">AGENTIC<br />WALLET</span>
              </div>
            </div>
            <p className="text-muted-foreground text-sm">Agent 驱动的下一代加密钱包</p>
          </motion.div>

          {/* 3-step marketing flow */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="space-y-4">
            {[
              { icon: Bot, color: 'text-primary', bg: 'bg-primary/8', title: '钱包创建', desc: '您的 Agent 在链上创建 MPC 钱包' },
              { icon: Link2, color: 'text-primary', bg: 'bg-primary/8', title: '配对关联', desc: '输入口令，将钱包控制权转移到您手中' },
              { icon: SlidersHorizontal, color: 'text-primary', bg: 'bg-primary/8', title: 'Pact 管控', desc: '设定规则，让 Agent 在边界内自主运行' },
            ].map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.08 }}
                className="flex items-center gap-3.5"
              >
                <div className={cn('w-10 h-10 rounded-full flex items-center justify-center shrink-0', step.bg)}>
                  <step.icon className={cn('w-4.5 h-4.5', step.color)} strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-foreground">{step.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* CTA */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Button size="lg" className="w-full text-base gradient-primary" onClick={() => navigate('/claim-wallet')}>
              开始认领钱包
            </Button>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
}

// Helper to format balance with different sizes for integer and decimal parts
function formatBalanceParts(value: number) {
  const [integer, decimal] = value.toFixed(2).split('.');
  const formattedInteger = parseInt(integer).toLocaleString('en-US');
  return { integer: formattedInteger, decimal };
}

// Helper to mask email for privacy
function maskEmail(email: string) {
  const [name, domain] = email.split('@');
  if (!domain) return email;
  const maskedName = name.length > 2 ? `${name[0]}***${name[name.length - 1]}` : name;
  return `${maskedName}@${domain}`;
}

export default function HomePage() {
  const [hideBalance, setHideBalance] = useState(false);
  const [selectedChain, setSelectedChain] = useState<ChainId>('all');
  const [addressSelection, setAddressSelection] = useState<AddressSelection>({ mode: 'all' });
  const [showTokenSearch, setShowTokenSearch] = useState(false);
  const [showWalletSwitcher, setShowWalletSwitcher] = useState(false);

  const [showProfileDrawer, setShowProfileDrawer] = useState(false);
  const [showAllAssets, setShowAllAssets] = useState(false);
  const [isLoading] = useState(false);
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [connectDappOpen, setConnectDappOpen] = useState(false);
  const [wcOnboardingOpen, setWcOnboardingOpen] = useState(false);
  const { sessions: wcSessions, pendingRequests: wcPendingRequests } = useWalletConnect();
  const wcPendingCount = wcPendingRequests.filter(r => r.status === 'pending').length;

  const handleConnectDappTrigger = () => {
    if (isOnboardingDone()) {
      setConnectDappOpen(true);
    } else {
      setWcOnboardingOpen(true);
    }
  };
  const navigate = useNavigate();
  const location = useLocation();
  const handledSidebarOpen = useRef(false);

  // Re-open sidebar when returning from a sidebar-originated navigation
  useEffect(() => {
    if ((location.state as { openSidebar?: boolean })?.openSidebar && !handledSidebarOpen.current) {
      handledSidebarOpen.current = true;
      setShowProfileDrawer(true);
    } else if (!(location.state as { openSidebar?: boolean })?.openSidebar) {
      handledSidebarOpen.current = false;
    }
  }, [location.state]);
  const { assets, transactions, currentWallet, walletStatus, addToken, removeToken, unreadMessageCount, pendingTodoCount, getAgentTxByWallet, agentTransactions, systemStatus, setSystemStatus } = useWallet();
  const { guard, drawerOpen, setDrawerOpen, needsRecovery } = useRequireRecovery();

  // Claimed wallet states
  const needsKeyGen = walletStatus === 'claimed_no_key';
  const needsBackup = currentWallet?.origin === 'claimed' && walletStatus === 'created_no_backup';
  const needsSetup = needsKeyGen || needsBackup;


  // Number of assets to show initially
  const INITIAL_ASSETS_COUNT = 5;

  // Get list of already added token symbols for each network
  const addedSymbols = useMemo(() => {
    return assets.map(a => a.symbol);
  }, [assets]);

  // Handle adding token to all supported networks
  const handleAddToken = (token: TokenInfo) => {
    token.networks.forEach(network => {
      addToken(token.symbol, token.name, network, token.price, token.change24h);
    });
    toast.success(`已添加 ${token.symbol} (${token.networks.length} 个网络)`);
  };

  // Handle removing token from all networks
  const handleRemoveToken = (symbol: string) => {
    removeToken(symbol);
    toast.success(`已删除 ${symbol}`);
  };

  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    // Simulate API call to refresh balances
    await new Promise(resolve => setTimeout(resolve, 1500));
    toast.success('余额已刷新');
  }, []);

  // Address selection change handler — resets chain filter
  const handleAddressChange = useCallback((sel: AddressSelection) => {
    setAddressSelection(sel);
    setSelectedChain('all');
  }, []);

  // Reset address & chain selection when wallet changes
  useEffect(() => {
    setAddressSelection({ mode: 'all' });
    setSelectedChain('all');
  }, [currentWallet?.id]);

  // L1 filter: filter assets by selected address
  const filteredAssetsByAddress = useMemo(() => {
    if (addressSelection.mode === 'all') return assets;
    return assets.filter(a => a.addressId === addressSelection.addressId);
  }, [assets, addressSelection]);

  // L2 filter + aggregate: chain filter on top of address-filtered assets
  const displayAssets = useMemo(() => {
    const allChainAssets = aggregateByChain(filteredAssetsByAddress, currentWallet);
    if (selectedChain === 'all') {
      return allChainAssets;
    }
    return allChainAssets.filter(a => a.network === selectedChain);
  }, [filteredAssetsByAddress, selectedChain, currentWallet]);

  // Calculate total balance from two-level filtered assets
  const totalBalance = useMemo(() => {
    let filtered = filteredAssetsByAddress;
    if (selectedChain !== 'all') {
      filtered = filtered.filter(a => a.network === selectedChain);
    }
    return filtered.reduce((sum, asset) => sum + asset.usdValue, 0);
  }, [filteredAssetsByAddress, selectedChain]);

  // Filter transactions based on selected address + chain
  const filteredTransactions = useMemo(() => {
    let filtered = transactions;
    // L1: address filter — match by the address system's chains
    if (addressSelection.mode === 'address') {
      const selectedAddr = currentWallet?.walletAddresses?.find(
        a => a.id === addressSelection.addressId
      );
      if (selectedAddr) {
        const systemInfo = ADDRESS_SYSTEMS.find(s => s.id === selectedAddr.system);
        const systemChains = systemInfo?.chains || [];
        filtered = filtered.filter(tx => systemChains.includes(tx.network as ChainId));
      }
    }
    // L2: chain filter
    if (selectedChain !== 'all') {
      filtered = filtered.filter(tx => tx.network === selectedChain);
    }
    // Sort by timestamp descending (newest first)
    return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [transactions, addressSelection, selectedChain, currentWallet]);

  // Group transactions by date and limit to 5 items
  const groupedTransactions = useMemo(() => {
    const MAX_DISPLAY = 5;
    const displayTxs = filteredTransactions.slice(0, MAX_DISPLAY);
    
    const groups: { date: string; dateLabel: string; transactions: Transaction[] }[] = [];
    
    displayTxs.forEach(tx => {
      const txDate = new Date(tx.timestamp);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      let dateLabel: string;
      const dateKey = txDate.toDateString();
      
      if (txDate.toDateString() === today.toDateString()) {
        dateLabel = '今天';
      } else if (txDate.toDateString() === yesterday.toDateString()) {
        dateLabel = '昨天';
      } else {
        dateLabel = `${txDate.getMonth() + 1}月${txDate.getDate()}日`;
      }
      
      const existingGroup = groups.find(g => g.date === dateKey);
      if (existingGroup) {
        existingGroup.transactions.push(tx);
      } else {
        groups.push({ date: dateKey, dateLabel, transactions: [tx] });
      }
    });
    
    return groups;
  }, [filteredTransactions]);

  const hasMoreTransactions = filteredTransactions.length > 5;

  // Pending agent transactions for current wallet
  const walletPendingCount = useMemo(() => {
    return agentTransactions.filter(tx => tx.status === 'pending_approval').length;
  }, [agentTransactions]);

  const balanceParts = formatBalanceParts(totalBalance);

  // Show empty state when no wallet exists
  if (walletStatus === 'not_created') {
    return <EmptyWalletState />;
  }

  return (
    <AppLayout showNav>
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="px-4 relative">
        {/* Header - Wallet Selector */}
        <div className="flex items-center justify-between h-[44px] mb-2">
          <motion.button
            onClick={() => setShowWalletSwitcher(true)}
            className="flex items-center gap-3 rounded-xl p-1 -m-1 active:bg-muted/50 transition-colors"
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
          <motion.div
            className="w-9 h-9 rounded-full flex items-center justify-center bg-muted"
            whileTap={{ scale: 0.9 }}
          >
            <Wallet className="w-5 h-5 text-muted-foreground" />
          </motion.div>
          <div className="text-left">
            <p className="text-xs text-muted-foreground">
              当前钱包
            </p>
            <div className="flex items-center gap-1">
              <p className="font-semibold text-foreground text-sm">
                {currentWallet?.name || '我的钱包'}
              </p>
              {isAgentLinked(currentWallet) && (
                <span className="text-[10px] px-1.5 py-0.5 bg-primary/8 text-primary rounded ml-1">
                  Agent
                </span>
              )}
              {needsKeyGen && (
                <span className="text-[10px] px-1.5 py-0.5 bg-destructive/8 text-destructive rounded ml-1">
                  MPC分片未生成
                </span>
              )}
              {needsBackup && !needsKeyGen && (
                <span className="text-[10px] px-1.5 py-0.5 bg-warning/8 text-warning rounded ml-1">
                  未备份
                </span>
              )}
              {needsRecovery && (
                <span className="text-[10px] px-1.5 py-0.5 bg-warning/10 text-warning rounded ml-1 font-medium">
                  未激活
                </span>
              )}
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
          </motion.button>

          <div className="flex items-center gap-2.5">
            {/* TODO: 临时测试按钮，上线前删除 */}
            <button
              onClick={() => setSystemStatus(systemStatus === 'normal' ? 'service_down' : systemStatus === 'service_down' ? 'chain_congestion' : 'normal')}
              className={cn('px-1.5 py-0.5 rounded text-[9px] font-medium border', systemStatus !== 'normal' ? 'bg-destructive/8 text-destructive border-destructive/20' : 'bg-muted/50 text-muted-foreground border-border/60')}
            >
              {systemStatus === 'normal' ? 'SYS' : systemStatus === 'service_down' ? '故障' : '拥堵'}
            </button>
            {/* TODO: 临时通知测试按钮，上线前删除 */}
            <button
              onClick={() => {
                const demos = [
                  { icon: <CryptoIcon symbol="ETH" size="sm" />, title: '收到转账', subtitle: '+1.5 ETH (≈$2,847)', route: '/messages' },
                  { icon: <Shield className="w-5 h-5 text-violet-500" />, title: '新 Pact 待审批', subtitle: 'ETH 定投策略', route: '/messages' },
                  { icon: <Key className="w-5 h-5 text-primary" />, title: '交易签名请求', subtitle: '1inch Aggregation Router', route: '/messages' },
                ];
                const demo = demos[Math.floor(Math.random() * demos.length)];
                showInAppNotification(demo);
              }}
              className="px-1.5 py-0.5 rounded text-[9px] font-medium border bg-muted/50 text-muted-foreground border-border/60"
            >
              通知
            </button>
            {/* AI Assistant Entry */}
            <motion.button
              onClick={() => navigate('/assistant')}
              className="flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-full bg-primary active:opacity-80 transition-opacity"
              whileTap={{ scale: 0.92 }}
            >
              <Sparkles className="w-3 h-3 text-primary-foreground" strokeWidth={2} />
              <span className="text-[11px] font-semibold text-primary-foreground tracking-wide">AI</span>
            </motion.button>
            {/* Message Center Entry */}
            <motion.button
              className="relative flex items-center justify-center"
              onClick={() => navigate('/messages')}
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <Bell className="w-6 h-6" strokeWidth={1.5} style={{ color: '#000000' }} />
              {(unreadMessageCount + pendingTodoCount + wcPendingCount) > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-[6px] -right-[6px] min-w-4 h-4 px-1 bg-destructive text-destructive-foreground text-[10px] font-medium rounded-full flex items-center justify-center"
                >
                  {(unreadMessageCount + pendingTodoCount + wcPendingCount) > 9 ? '9+' : (unreadMessageCount + pendingTodoCount + wcPendingCount)}
                </motion.span>
              )}
            </motion.button>
          </div>
        </div>

        {/* Recovery banner — only shown when current wallet's key share isn't on this device */}
        {needsRecovery && <RecoveryBanner returnTo="/home" />}

        {/* Balance Card with Light Gradient Overlay */}
        {isLoading ? (
          <BalanceCardSkeleton />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl p-5 mb-4"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
          >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    总资产
                  </span>
                  <button onClick={() => setHideBalance(!hideBalance)}>
                    {hideBalance ? (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
                <ChainDropdown
                  selectedChain={selectedChain}
                  onSelectChain={setSelectedChain}
                />
              </div>

              <div className="mb-5">
                <AnimatedBalance
                  integer={balanceParts.integer}
                  decimal={balanceParts.decimal}
                  hidden={hideBalance}
                  integerClassName="text-[34px] font-bold text-foreground tracking-tight"
                  decimalClassName="text-xl font-medium text-muted-foreground"
                />
              </div>

              {/* Quick Actions — Apple style pill buttons */}
              <div className="flex gap-2.5">
                <Button
                  className="flex-1 h-11 bg-primary text-primary-foreground rounded-xl text-[14px] font-semibold px-2"
                  onClick={() => {
                    if (needsSetup) {
                      setShowSetupDialog(true);
                    } else {
                      guard(() => navigate(isAgentLinked(currentWallet) ? '/request-agent' : '/send'));
                    }
                  }}
                >
                  {isAgentLinked(currentWallet) ? (
                    <Bot className="w-4 h-4 mr-1.5" strokeWidth={1.5} />
                  ) : (
                    <Send className="w-4 h-4 mr-1.5" strokeWidth={1.5} />
                  )}
                  {isAgentLinked(currentWallet) ? '请求 Agent' : '转账'}
                </Button>
                <Button
                  variant="secondary"
                  className="flex-1 h-11 rounded-xl text-[14px] font-semibold px-2"
                  onClick={() => navigate('/receive')}
                >
                  <QrCode className="w-4 h-4 mr-1.5" strokeWidth={1.5} />
                  收款
                </Button>
                <Button
                  variant="secondary"
                  className="flex-1 h-11 rounded-xl text-[14px] font-semibold px-2 relative"
                  onClick={() => guard(() => handleConnectDappTrigger())}
                >
                  <Link2 className="w-4 h-4 mr-1.5" strokeWidth={1.5} />
                  连接
                  {wcSessions.length > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-primary text-primary-foreground rounded-full text-[10px] font-bold flex items-center justify-center">
                      {wcSessions.length}
                    </span>
                  )}
                </Button>
              </div>
          </motion.div>
        )}

        {/* Pending Approval Banner — hidden */}

        {/* Assets */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-4"
        >
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-foreground text-sm">资产</h2>
            <AddressPicker
              selection={addressSelection}
              onSelectionChange={handleAddressChange}
              walletAddresses={currentWallet?.walletAddresses || []}
            />
          </div>

          {isLoading ? (
            <AssetListSkeleton count={5} />
          ) : displayAssets.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="暂无资产"
              description="添加代币开始管理您的资产"
              action={{
                label: '添加代币',
                icon: Plus,
                onClick: () => setShowTokenSearch(true),
              }}
            />
          ) : (
            <div className="space-y-1.5 no-card-shadow">
              <AnimatePresence mode="popLayout">
                {(showAllAssets ? displayAssets : displayAssets.slice(0, INITIAL_ASSETS_COUNT)).map((asset, index) => (
                  <motion.button
                    key={`${asset.symbol}-${asset.network}`}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: 0.05 * index }}
                    onClick={() => navigate(`/asset/${asset.symbol}?chain=${asset.network}`)}
                    className="w-full card-elevated p-3 flex items-center justify-between active:scale-[0.98] active:bg-muted/50 transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <CryptoIconWithChain symbol={asset.symbol} chainId={asset.network} size="md" />
                      <div className="text-left">
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-foreground text-sm">{asset.symbol}</p>
                          <span className="text-[10px] leading-none px-1.5 py-0.5 bg-muted rounded text-muted-foreground">
                            {getChainShortName(asset.network)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {asset.name}
                          {asset.addressCount > 1 && (
                            <span className="ml-1 text-accent">· {asset.addressCount} 个地址</span>
                          )}
                        </p>
                      </div>
                    </div>
                      <div className="text-right flex items-center gap-2">
                      <div>
                        <p className="font-medium text-foreground text-sm">
                          {hideBalance ? '****' : asset.totalBalance.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {hideBalance ? '**' : `$${asset.totalUsdValue.toLocaleString()}`}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </motion.button>
                ))}
              </AnimatePresence>
              
              {/* Show more / Show less button */}
              {displayAssets.length > INITIAL_ASSETS_COUNT && (
                <motion.button
                  layout
                  onClick={() => setShowAllAssets(!showAllAssets)}
                  className="w-full py-3 flex items-center justify-center gap-2 text-sm text-muted-foreground transition-colors rounded-xl"
                >
                  <motion.div
                    animate={{ rotate: showAllAssets ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </motion.div>
                  {showAllAssets ? '收起' : '展开全部'}
                </motion.button>
              )}
            </div>
          )}
        </motion.div>

        {/* Recent Transactions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-foreground text-sm">最近交易</h2>
          </div>

          {isLoading ? (
            <TransactionListSkeleton count={5} showDateHeader={true} />
          ) : groupedTransactions.length === 0 ? (
            <EmptyState
              icon={Send}
              title="暂无交易记录"
              description="您的交易记录将在此显示"
            />
          ) : (
            <div className="space-y-3">
              {groupedTransactions.map((group) => (
                <div key={group.date}>
                  {/* Date Header */}
                  <p className="text-xs text-muted-foreground mb-1.5 px-1">
                    {group.dateLabel}
                  </p>
                  <div className="space-y-1.5 no-card-shadow">
                    {group.transactions.map((tx, index) => (
                      <motion.button
                        key={tx.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05 * index }}
                        onClick={() => navigate(`/transaction/${tx.id}`)}
                        className="w-full card-elevated p-3 flex items-center justify-between text-left active:scale-[0.98] active:bg-muted/50 transition-all"
                      >
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center',
                            tx.type === 'receive' ? 'icon-gradient-success' : 'icon-gradient-primary'
                          )}>
                            {tx.type === 'receive' ? (
                              <TrendingDown className="w-4 h-4 text-success rotate-180" />
                            ) : (
                              <Send className="w-4 h-4 text-accent" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground text-sm">
                              {tx.type === 'receive' ? '转入' : '转出'}
                            </p>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                                {tx.counterpartyLabel || `${tx.counterparty.slice(0, 6)}...${tx.counterparty.slice(-4)}`}
                              </span>
                              <span className="text-xs text-muted-foreground/60">·</span>
                              <span className="text-xs text-muted-foreground">
                                {SUPPORTED_CHAINS.find(c => c.id === tx.network)?.shortName || tx.network}
                              </span>
                              {tx.status === 'pending' && (
                                <span className="text-xs text-warning flex items-center gap-0.5">
                                  <Clock className="w-3 h-3" />
                                </span>
                              )}
                              {tx.status === 'confirmed' && (
                                <span className="text-xs text-success flex items-center gap-0.5">
                                  <CheckCircle2 className="w-3 h-3" />
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-2">
                          <div>
                            <p className={cn(
                              'font-medium text-sm',
                              tx.type === 'receive' ? 'text-success' : 'text-foreground'
                            )}>
                              {tx.type === 'receive' ? '+' : '-'}{tx.amount} {tx.symbol}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              ${tx.usdValue.toLocaleString()}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>
              ))}
              
              {/* View All Button - positioned below the list */}
              {hasMoreTransactions && (
                <motion.button
                  onClick={() => navigate('/history')}
                  className="w-full py-3 flex items-center justify-center gap-1 text-sm text-muted-foreground transition-colors rounded-xl"
                >
                  查看全部
                  <ChevronRight className="w-4 h-4" />
                </motion.button>
              )}
            </div>
          )}
        </motion.div>
      </div>
      </PullToRefresh>

      {/* Token Search Modal */}
      <AnimatePresence>
        {showTokenSearch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-background"
          >
            <TokenManager
              addedSymbols={addedSymbols}
              addedAssets={assets}
              onAddToken={handleAddToken}
              onRemoveToken={handleRemoveToken}
              onClose={() => setShowTokenSearch(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Wallet Switcher */}
      <WalletSwitcher
        isOpen={showWalletSwitcher}
        onClose={() => setShowWalletSwitcher(false)}
        onCreateNew={() => {
          setShowWalletSwitcher(false);
          navigate('/create-wallet');
        }}
      />

      {/* Setup required dialog — blocks transfers for incomplete claimed wallets */}
      <AlertDialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {needsKeyGen ? '请先生成 MPC 密钥分片' : '请先完成密钥备份'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {needsKeyGen
                ? '您的钱包尚未生成 MPC 密钥分片，无法签名交易。请先完成密钥生成。'
                : '您的钱包尚未完成密钥备份，无法发起转账。请先完成备份以确保资产安全。'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => navigate(needsKeyGen ? '/claim-wallet?resume=keygen' : '/claim-wallet?resume=backup')}>
              去完成
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Recovery required drawer */}
      <RecoveryRequiredDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        walletName={currentWallet?.name}
        returnTo="/home"
      />

      {/* WalletConnect — connect entry (session approval is mounted globally in WalletConnectGlobal) */}
      <ConnectDappDrawer open={connectDappOpen} onOpenChange={setConnectDappOpen} />

      {/* WalletConnect — first-time onboarding (3 slides). After completion, opens ConnectDappDrawer. */}
      <WalletConnectOnboardingDrawer
        open={wcOnboardingOpen}
        onOpenChange={setWcOnboardingOpen}
        onComplete={() => setConnectDappOpen(true)}
      />

    </AppLayout>
  );
}
