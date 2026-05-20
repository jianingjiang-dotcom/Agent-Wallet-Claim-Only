// ConnectDappDrawer — unified "connect / manage" panel.
// Mode A (sessions === 0): scan / paste / clipboard hint (entry flow)
// Mode B (sessions  >  0): manage active sessions + add a new dApp inline
//
// Pre-scan account picker: user picks a specific wallet address to expose to the dApp
// (EVM-scope), so the approval drawer doesn't need a wallet switcher anymore.

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  QrCode, ClipboardCheck, Camera, Link2, AlertCircle, Sparkles, Image as ImageIcon,
  Flashlight, FlashlightOff, ChevronDown, ChevronUp, Settings as SettingsIcon, CameraOff,
  Unlink, ChevronRight, ExternalLink,
} from 'lucide-react';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { useWalletConnect } from '@/contexts/WalletConnectContext';
import { useWallet } from '@/contexts/WalletContext';
import { parseWcUri, isWcUri } from '@/lib/wc-uri-parser';
import { makeMockWcUri, MOCK_DAPPS } from '@/lib/mock-sessions';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import type { WCMethod, DappSession } from '@/types/walletconnect';
import { AccountPickerDrawer } from './AccountPickerDrawer';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STD_METHODS: WCMethod[] = [
  'personal_sign', 'eth_signTypedData_v4', 'eth_sendTransaction', 'wallet_switchEthereumChain',
];

type SubMode = 'list' | 'scan' | 'paste';

function shortAddr(addr: string) {
  if (!addr) return '';
  return addr.length > 14 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}

export function ConnectDappDrawer({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const { proposeConnection, sessions, disconnectSession } = useWalletConnect();
  const { wallets, currentWallet } = useWallet();

  const [subMode, setSubMode] = useState<SubMode>('list');

  const [pasteValue, setPasteValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [clipboardHint, setClipboardHint] = useState<string | null>(null);

  // Scan-mode state
  const [flashlightOn, setFlashlightOn] = useState(false);
  const [cameraDenied, setCameraDenied] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

  // Account selection (EVM-scope) — used when scanning / pasting
  const [selectedWalletId, setSelectedWalletId] = useState<string>('');
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [pickerOpen, setPickerOpen] = useState(false);

  // Compute default selection: prefer current wallet's first EVM address
  const initSelection = useMemo(() => {
    const w = currentWallet || wallets[0];
    if (!w) return { walletId: '', addressId: '' };
    const evm = (w.walletAddresses || []).find(a => a.system === 'evm');
    return { walletId: w.id, addressId: evm?.id || '' };
  }, [currentWallet, wallets]);

  const activeSessions = sessions.filter(s => s.status !== 'expired');
  const hasSessions = activeSessions.length > 0;

  const selectedWallet = wallets.find(w => w.id === selectedWalletId);
  const selectedAddress = selectedWallet?.walletAddresses.find(a => a.id === selectedAddressId);

  useEffect(() => {
    if (open) {
      setSubMode('list');
      setPasteValue('');
      setError(null);
      setClipboardHint(null);
      setFlashlightOn(false);
      setCameraDenied(false);
      setShowDemo(false);
      setSelectedWalletId(initSelection.walletId);
      setSelectedAddressId(initSelection.addressId);

      try {
        navigator.clipboard?.readText?.().then(text => {
          if (text && isWcUri(text)) setClipboardHint(text);
        }).catch(() => { /* silent */ });
      } catch { /* ignore */ }
    }
  }, [open, initSelection.walletId, initSelection.addressId]);

  const handleConnect = useCallback((uri: string) => {
    if (!selectedWalletId || !selectedAddressId) {
      setError('请先选择要连接的账户');
      return;
    }
    const parsed = parseWcUri(uri);
    if (!parsed.isValid) {
      setError(parsed.error || '无效的配对码');
      return;
    }
    setError(null);
    proposeConnection(parsed.dapp, ['ethereum', 'bsc'], STD_METHODS, selectedWalletId, selectedAddressId);
    onOpenChange(false);
  }, [proposeConnection, onOpenChange, selectedWalletId, selectedAddressId]);

  const handleApplyClipboard = () => clipboardHint && handleConnect(clipboardHint);
  const handleSimulateScan = (dappKey: keyof typeof MOCK_DAPPS) => handleConnect(makeMockWcUri(dappKey));
  const handleGalleryImport = () => {
    toast('正在识别二维码...', { icon: '🖼️' });
    setTimeout(() => handleSimulateScan('uniswap'), 600);
  };

  // Demo only: trigger an "unsupported chain" approval flow (used to exercise
  // the chainMismatch branch in SessionApprovalDrawer).
  const handleSimulateUnsupportedChain = () => {
    if (!selectedWalletId || !selectedAddressId) {
      setError('请先选择要连接的账户');
      return;
    }
    setError(null);
    proposeConnection(
      {
        name: 'Polymarket',
        url: 'https://polymarket.com',
        icon: '🎯',
        description: '去中心化预测市场（在 Polygon 上运行）',
      },
      ['polygon'],
      STD_METHODS,
      selectedWalletId,
      selectedAddressId,
    );
    onOpenChange(false);
  };

  const handleDisconnect = (s: DappSession) => {
    disconnectSession(s.id);
    toast.success(`已断开与 ${s.dapp.name} 的连接`);
  };

  // ─── Account selector card (shared by scan + paste) ──────────────────────
  const AccountSelectorCard = (
    <button
      onClick={() => setPickerOpen(true)}
      className="w-full flex items-center gap-3 p-3 mb-3 bg-card rounded-xl border border-border/60 active:scale-[0.99] transition-transform text-left"
    >
      <div className="w-9 h-9 rounded-full bg-primary/8 flex items-center justify-center shrink-0">
        <span className="text-[12px] font-mono font-bold text-primary">
          {selectedAddress?.label.match(/\d+$/)?.[0] || 'E'}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">连接账户</span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[13px] font-semibold text-foreground truncate">
            {selectedWallet?.name || '未选择'}
          </span>
          <span className="text-[11px] text-muted-foreground">·</span>
          <span className="text-[11px] text-muted-foreground font-mono truncate">
            {selectedAddress ? shortAddr(selectedAddress.address) : '—'}
          </span>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
    </button>
  );

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[88vh]">
          <DrawerHeader className="sr-only"><DrawerTitle>连接 dApp</DrawerTitle></DrawerHeader>

          <div className="px-5 pt-2 pb-8 overflow-y-auto">
            {/* Header — drag handle + swipe / backdrop tap handle drawer close */}
            <div className="text-center mb-4">
              <p className="text-[11px] font-medium text-primary uppercase tracking-wider">连接 dApp</p>
              {subMode === 'list' && hasSessions && (
                <p className="text-[11px] text-muted-foreground mt-0.5">已连接 {activeSessions.length} 个</p>
              )}
            </div>

            <AnimatePresence mode="wait">
              {/* Mode A: no sessions */}
              {subMode === 'list' && !hasSessions && (
                <motion.div key="modeA" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/8 flex items-center justify-center mb-3">
                      <Link2 className="w-7 h-7 text-primary" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-[18px] font-bold text-foreground mb-1">连接到 dApp</h3>
                    <p className="text-[13px] text-muted-foreground max-w-[280px] mx-auto">
                      在 Uniswap、Aave 等 dApp 端选择 WalletConnect，扫描或复制配对码到这里
                    </p>
                  </div>

                  {clipboardHint && (
                    <ClipboardHintCard uri={clipboardHint} onApply={handleApplyClipboard} />
                  )}

                  <div className="space-y-2">
                    <EntryCTA icon={QrCode} title="扫描二维码" desc="扫描 dApp 端的 WalletConnect 二维码" onClick={() => setSubMode('scan')} />
                    <EntryCTA icon={ClipboardCheck} title="粘贴配对码" desc="手动粘贴 wc:... 链接" onClick={() => setSubMode('paste')} />
                  </div>
                </motion.div>
              )}

              {/* Mode B: has sessions */}
              {subMode === 'list' && hasSessions && (
                <motion.div key="modeB" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
                  {clipboardHint && (
                    <ClipboardHintCard uri={clipboardHint} onApply={handleApplyClipboard} />
                  )}

                  <div className="space-y-2 mb-5">
                    {activeSessions.map(s => {
                      const wallet = wallets.find(w => w.id === s.walletId);
                      const addr = wallet?.walletAddresses.find(a => a.id === s.walletAddressId);
                      return (
                        <div
                          key={s.id}
                          className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border/60 active:scale-[0.99] transition-transform"
                        >
                          <button
                            onClick={() => { onOpenChange(false); setTimeout(() => navigate(`/connected-dapps/${s.id}`), 50); }}
                            className="flex-1 flex items-center gap-3 min-w-0 text-left"
                          >
                            <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center text-2xl shrink-0">
                              {s.dapp.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[14px] font-semibold text-foreground truncate">{s.dapp.name}</span>
                                {s.status === 'expiring_soon' && (
                                  <span className="text-[10px] text-warning bg-warning/10 px-1.5 py-0.5 rounded font-medium">即将过期</span>
                                )}
                              </div>
                              <p className="flex items-center gap-1 text-[11px] text-muted-foreground truncate">
                                <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                                <span className="truncate">{s.dapp.url.replace(/^https?:\/\//, '')}</span>
                                <span className="text-muted-foreground/50 mx-0.5">·</span>
                                <span className="font-mono truncate">
                                  {addr ? shortAddr(addr.address) : (wallet?.name || '钱包')}
                                </span>
                              </p>
                            </div>
                          </button>
                          <button
                            onClick={() => handleDisconnect(s)}
                            aria-label={`断开 ${s.dapp.name}`}
                            className="flex items-center gap-1 h-9 px-2.5 rounded-lg bg-muted/40 hover:bg-destructive/10 text-muted-foreground hover:text-destructive shrink-0 active:scale-95 transition"
                          >
                            <Unlink className="w-3.5 h-3.5" strokeWidth={1.75} />
                            <span className="text-[11px] font-medium">断开</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-border/60" />
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">连接新的 dApp</span>
                    <div className="flex-1 h-px bg-border/60" />
                  </div>

                  <div className="space-y-2">
                    <EntryCTA icon={QrCode} title="扫描二维码" desc="扫描 dApp 端的 WalletConnect 二维码" onClick={() => setSubMode('scan')} />
                    <EntryCTA icon={ClipboardCheck} title="粘贴配对码" desc="手动粘贴 wc:... 链接" onClick={() => setSubMode('paste')} />
                  </div>
                </motion.div>
              )}

              {/* Sub-mode: scan */}
              {subMode === 'scan' && (
                <motion.div key="scan" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
                  <div className="text-center mb-3">
                    <h3 className="text-[18px] font-bold text-foreground mb-1">扫描二维码</h3>
                    <p className="text-[12px] text-muted-foreground">将 dApp 端的二维码对准取景框</p>
                  </div>

                  {AccountSelectorCard}

                  {!cameraDenied ? (
                    <ScanViewport flashlightOn={flashlightOn} setFlashlightOn={setFlashlightOn} onGallery={handleGalleryImport} />
                  ) : (
                    <ScanPermissionDenied
                      onSettings={() => toast('请到系统设置开启权限', { icon: '⚙️' })}
                      onSwitchPaste={() => setSubMode('paste')}
                    />
                  )}

                  <button
                    onClick={() => setShowDemo(!showDemo)}
                    className="w-full flex items-center justify-between px-3 py-2 mt-1 rounded-lg bg-warning/8 text-warning text-[11px] font-medium"
                  >
                    <span>演示模式</span>
                    {showDemo ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  <AnimatePresence>
                    {showDemo && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <div className="pt-2 space-y-2">
                          <div className="grid grid-cols-3 gap-1.5">
                            {(['uniswap', 'aave', 'opensea'] as const).map(key => (
                              <button
                                key={key}
                                onClick={() => handleSimulateScan(key)}
                                className="flex items-center justify-center gap-1 px-2 py-1.5 bg-card rounded-md border border-border/60 text-[11px] active:scale-95"
                              >
                                <span>{MOCK_DAPPS[key].icon}</span>
                                <span className="font-medium">{MOCK_DAPPS[key].name}</span>
                              </button>
                            ))}
                          </div>
                          <button
                            onClick={handleSimulateUnsupportedChain}
                            className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 bg-destructive/5 border border-destructive/30 rounded-md text-[11px] text-destructive font-medium active:scale-95"
                          >
                            <span>🚫</span>
                            <span>模拟链不支持（Polymarket · Polygon）</span>
                          </button>
                          <button onClick={() => setCameraDenied(c => !c)} className="w-full text-[11px] text-muted-foreground py-1 underline">
                            切换"权限{cameraDenied ? '正常' : '被拒'}"状态
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <Button variant="outline" className="w-full h-11 mt-3" onClick={() => setSubMode('list')}>
                    返回
                  </Button>
                </motion.div>
              )}

              {/* Sub-mode: paste */}
              {subMode === 'paste' && (
                <motion.div key="paste" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
                  <div className="text-center mb-4">
                    <h3 className="text-[18px] font-bold text-foreground mb-1">粘贴配对码</h3>
                    <p className="text-[12px] text-muted-foreground">从 dApp 复制 WalletConnect 配对码</p>
                  </div>

                  {AccountSelectorCard}

                  <div className="space-y-3">
                    <textarea
                      value={pasteValue}
                      onChange={(e) => { setPasteValue(e.target.value); setError(null); }}
                      placeholder="wc:..."
                      className={cn(
                        'w-full min-h-[100px] p-3 rounded-xl border bg-card text-[13px] font-mono resize-none focus:outline-none focus:ring-2 focus:ring-primary/30',
                        error ? 'border-destructive/50' : 'border-border/60'
                      )}
                    />
                    {error && (
                      <div className="flex items-center gap-1.5 text-[12px] text-destructive">
                        <AlertCircle className="w-3.5 h-3.5" /> {error}
                      </div>
                    )}
                    <Button className="w-full h-11" disabled={!pasteValue.trim()} onClick={() => handleConnect(pasteValue)}>
                      连接
                    </Button>
                    <Button variant="outline" className="w-full h-11" onClick={() => setSubMode('list')}>
                      返回
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </DrawerContent>
      </Drawer>

      <AccountPickerDrawer
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        selectedWalletId={selectedWalletId}
        selectedAddressId={selectedAddressId}
        onSelect={(walletId, addressId) => {
          setSelectedWalletId(walletId);
          setSelectedAddressId(addressId);
        }}
      />
    </>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function ClipboardHintCard({ uri, onApply }: { uri: string; onApply: () => void }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
      onClick={onApply}
      className="w-full flex items-center gap-3 p-3 mb-3 bg-primary/8 border border-primary/20 rounded-xl text-left active:scale-[0.98] transition-transform"
    >
      <Sparkles className="w-4 h-4 text-primary shrink-0" strokeWidth={1.75} />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold text-primary">检测到配对码</p>
        <p className="text-[11px] text-primary/70 truncate font-mono">{uri}</p>
      </div>
      <span className="text-[12px] font-semibold text-primary shrink-0">使用</span>
    </motion.button>
  );
}

function EntryCTA({
  icon: Icon, title, desc, onClick,
}: { icon: typeof QrCode; title: string; desc: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-4 bg-card rounded-xl border border-border/60 active:scale-[0.98] transition-transform text-left"
    >
      <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-primary" strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-foreground">{title}</p>
        <p className="text-[12px] text-muted-foreground mt-0.5">{desc}</p>
      </div>
    </button>
  );
}

function ScanViewport({
  flashlightOn, setFlashlightOn, onGallery,
}: { flashlightOn: boolean; setFlashlightOn: (v: boolean | ((p: boolean) => boolean)) => void; onGallery: () => void }) {
  return (
    <div className="aspect-square w-full max-w-[280px] mx-auto bg-foreground/90 rounded-2xl mb-3 relative overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center">
        <Camera className="w-12 h-12 text-white/15" strokeWidth={1.25} />
      </div>
      <div className="absolute inset-6">
        <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary rounded-tl-md" />
        <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary rounded-tr-md" />
        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-primary rounded-bl-md" />
        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary rounded-br-md" />
      </div>
      <motion.div
        className="absolute inset-x-6 h-[2px] bg-primary shadow-[0_0_8px_rgba(31,50,214,0.8)]"
        animate={{ top: ['24px', 'calc(100% - 26px)'] }}
        transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse', ease: 'linear' }}
      />
      <button
        onClick={() => {
          setFlashlightOn(v => !v);
          toast(flashlightOn ? '已关闭手电筒' : '已打开手电筒', { icon: flashlightOn ? '🔦' : '💡' });
        }}
        className="absolute bottom-3 left-3 w-9 h-9 rounded-full bg-black/40 backdrop-blur flex items-center justify-center active:scale-95"
      >
        {flashlightOn
          ? <Flashlight className="w-4 h-4 text-warning" strokeWidth={2} />
          : <FlashlightOff className="w-4 h-4 text-white/80" strokeWidth={1.75} />}
      </button>
      <button
        onClick={onGallery}
        className="absolute bottom-3 right-3 flex items-center gap-1 h-9 px-3 rounded-full bg-black/40 backdrop-blur active:scale-95"
      >
        <ImageIcon className="w-4 h-4 text-white" strokeWidth={1.75} />
        <span className="text-[11px] font-medium text-white">相册</span>
      </button>
    </div>
  );
}

function ScanPermissionDenied({ onSettings, onSwitchPaste }: { onSettings: () => void; onSwitchPaste: () => void }) {
  return (
    <div className="aspect-square w-full max-w-[280px] mx-auto bg-muted/40 rounded-2xl mb-3 flex flex-col items-center justify-center p-6 text-center border border-dashed border-border">
      <CameraOff className="w-10 h-10 text-muted-foreground/50 mb-3" strokeWidth={1.5} />
      <p className="text-[14px] font-semibold text-foreground mb-1">摄像头权限被拒</p>
      <p className="text-[11px] text-muted-foreground mb-4 max-w-[200px]">
        请在系统设置中开启摄像头权限，或改用粘贴配对码
      </p>
      <Button size="sm" className="h-8 px-4 text-[12px]" onClick={onSettings}>
        <SettingsIcon className="w-3.5 h-3.5 mr-1" />
        前往设置
      </Button>
      <button onClick={onSwitchPaste} className="text-[12px] text-primary font-medium mt-3">
        改用粘贴
      </button>
    </div>
  );
}
