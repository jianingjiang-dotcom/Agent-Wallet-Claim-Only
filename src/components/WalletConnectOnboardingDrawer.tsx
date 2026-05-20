// WalletConnectOnboardingDrawer — first-time use teaching (3 slides).
// Each slide uses a richer illustration composition (gradient blob + animated
// main glyph + decorative satellites) rather than a single flat icon.

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Link2, QrCode, ShieldCheck, ArrowRight, Wallet, Globe, Lock,
  Check, Sparkles,
} from 'lucide-react';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { markOnboardingDone } from '@/lib/wc-storage';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

interface Slide {
  title: string;
  body: string;
  Illustration: () => JSX.Element;
}

// ── Illustration 1: dApp <-> Wallet bridge ──────────────────────────────────
function BridgeIllustration() {
  return (
    <div className="relative w-full h-44 flex items-center justify-center overflow-hidden">
      {/* Soft radial gradient backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(closest-side, hsl(var(--primary) / 0.15), hsl(var(--primary) / 0.05), transparent)' }}
      />

      {/* Floating decoration dots */}
      {[
        { top: 12, left: 18, size: 4 }, { top: 28, right: 24, size: 6 },
        { bottom: 16, left: 28, size: 5 }, { bottom: 22, right: 18, size: 4 },
      ].map((d, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-primary/30"
          style={{ width: d.size, height: d.size, ...d }}
          animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2.5 + i * 0.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
        />
      ))}

      {/* Left: dApp orb */}
      <motion.div
        initial={{ x: -12, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/40"
      >
        <Globe className="w-8 h-8 text-white" strokeWidth={1.5} />
      </motion.div>

      {/* Center: pulsing link */}
      <div className="relative mx-3 flex items-center">
        <motion.div
          className="w-12 h-[2px] bg-gradient-to-r from-blue-500 to-primary rounded-full"
          animate={{ scaleX: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute inset-0 -m-2 flex items-center justify-center"
          animate={{ scale: [0.9, 1.1, 0.9] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/40">
            <Link2 className="w-4 h-4 text-primary-foreground" strokeWidth={2.5} />
          </div>
        </motion.div>
      </div>

      {/* Right: wallet orb */}
      <motion.div
        initial={{ x: 12, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/40"
      >
        <Wallet className="w-8 h-8 text-white" strokeWidth={1.5} />
      </motion.div>
    </div>
  );
}

// ── Illustration 2: QR scan ─────────────────────────────────────────────────
function QrScanIllustration() {
  return (
    <div className="relative w-full h-44 flex items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(closest-side, hsl(var(--success) / 0.15), hsl(var(--success) / 0.05), transparent)' }}
      />

      {/* Sparkles around */}
      {[
        { top: 14, left: '28%', delay: 0 },
        { top: 22, right: '30%', delay: 0.4 },
        { bottom: 22, left: '32%', delay: 0.8 },
      ].map((s, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{ top: s.top, left: s.left, right: s.right, bottom: s.bottom }}
          animate={{ opacity: [0, 1, 0], scale: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, delay: s.delay }}
        >
          <Sparkles className="w-3.5 h-3.5 text-success" strokeWidth={2} />
        </motion.div>
      ))}

      {/* QR frame */}
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="relative w-28 h-28 rounded-2xl bg-foreground/90 flex items-center justify-center overflow-hidden"
      >
        {/* Mock QR pattern */}
        <div className="absolute inset-3 grid grid-cols-5 grid-rows-5 gap-[3px]">
          {Array.from({ length: 25 }).map((_, i) => {
            // Pseudo-random but stable pattern
            const filled = [0, 1, 2, 4, 5, 7, 9, 11, 13, 14, 16, 17, 19, 21, 22, 23].includes(i);
            return (
              <div key={i} className={cn('rounded-[2px]', filled ? 'bg-white' : 'bg-transparent')} />
            );
          })}
        </div>

        {/* Corner marks */}
        <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-white rounded-tl" />
        <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-white rounded-tr" />
        <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-white rounded-bl" />

        {/* Scanning beam */}
        <motion.div
          className="absolute left-2 right-2 h-[2px] bg-success shadow-[0_0_8px_rgba(34,197,94,0.8)]"
          animate={{ top: [8, 102] }}
          transition={{ duration: 1.8, repeat: Infinity, repeatType: 'reverse', ease: 'linear' }}
        />
      </motion.div>

      {/* Floating phone icon */}
      <motion.div
        initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="absolute right-[20%] bottom-4 w-10 h-14 rounded-lg bg-card border border-border/60 shadow-md flex items-center justify-center"
      >
        <QrCode className="w-5 h-5 text-success" strokeWidth={1.5} />
      </motion.div>
    </div>
  );
}

// ── Illustration 3: User-controlled security ────────────────────────────────
function SecurityIllustration() {
  return (
    <div className="relative w-full h-44 flex items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(closest-side, hsl(var(--warning) / 0.15), hsl(var(--warning) / 0.05), transparent)' }}
      />

      {/* Outer ring */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
        className="absolute w-36 h-36 rounded-full border-2 border-dashed border-warning/30"
      />

      {/* Confirm dots around the shield */}
      {[0, 90, 180, 270].map((deg, i) => (
        <motion.div
          key={deg}
          className="absolute w-6 h-6 rounded-full bg-success/20 flex items-center justify-center"
          style={{
            transform: `rotate(${deg}deg) translateY(-58px) rotate(-${deg}deg)`,
          }}
          animate={{ scale: [0.85, 1, 0.85], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, delay: i * 0.25, ease: 'easeInOut' }}
        >
          <Check className="w-3.5 h-3.5 text-success" strokeWidth={3} />
        </motion.div>
      ))}

      {/* Center shield */}
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 18 }}
        className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-warning to-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/40"
      >
        <ShieldCheck className="w-10 h-10 text-white" strokeWidth={1.5} />
      </motion.div>

      {/* Small lock badge */}
      <motion.div
        initial={{ y: 6, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="absolute bottom-6 right-[24%] w-8 h-8 rounded-full bg-card border-2 border-warning flex items-center justify-center shadow-md"
      >
        <Lock className="w-3.5 h-3.5 text-warning" strokeWidth={2} />
      </motion.div>
    </div>
  );
}

const SLIDES: Slide[] = [
  {
    title: 'WalletConnect 是什么？',
    body: 'WalletConnect 是 dApp 跟你钱包之间的「对话桥梁」。无论你在 Uniswap、Aave 还是 Hyperliquid，都能用它把你的钱包安全接入。',
    Illustration: BridgeIllustration,
  },
  {
    title: '怎么用？',
    body: '在 PC 端 dApp 找到 "WalletConnect" 选项 → 会出现一张二维码 → 在 Cobo 内点「连接」扫码。手机端 dApp 则可直接深链拉起。',
    Illustration: QrScanIllustration,
  },
  {
    title: '安全永远你掌控',
    body: '连接不等于授权。每次签名 / 交易仍需你亲自确认，dApp 没法越权调用你的钱包。你随时能在「已连接的 dApp」里断开任意连接。',
    Illustration: SecurityIllustration,
  },
];

export function WalletConnectOnboardingDrawer({ open, onOpenChange, onComplete }: Props) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (open) setIdx(0);
  }, [open]);

  const slide = SLIDES[idx];
  const isLast = idx === SLIDES.length - 1;

  const handleNext = () => {
    if (isLast) {
      markOnboardingDone();
      onOpenChange(false);
      onComplete();
    } else {
      setIdx(i => i + 1);
    }
  };

  const handleSkip = () => {
    markOnboardingDone();
    onOpenChange(false);
    onComplete();
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[88vh]">
        <DrawerHeader className="sr-only"><DrawerTitle>WalletConnect 介绍</DrawerTitle></DrawerHeader>

        <div className="px-5 pt-2 pb-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-primary uppercase tracking-wider">
              第 {idx + 1} / {SLIDES.length} 步
            </span>
            <button onClick={handleSkip} className="text-[12px] text-muted-foreground">
              跳过
            </button>
          </div>

          {/* Slide */}
          <AnimatePresence mode="wait">
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.28 }}
              className="flex flex-col items-center text-center pt-2 pb-2"
            >
              <slide.Illustration />

              <h3 className="text-[22px] font-bold text-foreground mb-3 leading-tight mt-4">
                {slide.title}
              </h3>
              <p className="text-[14px] text-muted-foreground leading-relaxed max-w-[290px]">
                {slide.body}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Dots */}
          <div className="flex items-center justify-center gap-1.5 my-6">
            {SLIDES.map((_, i) => (
              <span
                key={i}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === idx ? 'w-5 bg-primary' : 'w-1.5 bg-muted-foreground/30'
                )}
              />
            ))}
          </div>

          {/* CTA */}
          <Button className="w-full h-12 gradient-primary" onClick={handleNext}>
            {isLast ? '开始使用' : '下一步'}
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
