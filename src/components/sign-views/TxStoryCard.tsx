// TxStoryCard — Rabby-style human-readable transaction summary.

import { motion } from 'framer-motion';
import { ArrowRight, AlertTriangle, Info, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CryptoIcon } from '@/components/CryptoIcon';
import type { TxStory } from '@/lib/tx-storyteller';

interface Props {
  story: TxStory;
}

const HINT_STYLE = {
  danger: 'bg-destructive/8 border-destructive/30 text-destructive',
  warning: 'bg-warning/8 border-warning/30 text-warning',
  info: 'bg-primary/8 border-primary/20 text-primary',
} as const;

const HINT_ICON = {
  danger: AlertTriangle,
  warning: AlertTriangle,
  info: Info,
} as const;

export function TxStoryCard({ story }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      {/* Risk hints (above headline) */}
      {story.riskHints.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {story.riskHints.map((hint, i) => {
            const Icon = HINT_ICON[hint.level];
            return (
              <span
                key={i}
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-1 rounded-md border text-[11px] font-medium',
                  HINT_STYLE[hint.level]
                )}
              >
                <Icon className="w-3 h-3" />
                {hint.text}
              </span>
            );
          })}
        </div>
      )}

      {/* Headline */}
      <h3 className="text-[18px] font-bold text-foreground leading-snug tracking-tight">
        {story.headline}
      </h3>

      {/* Token flow visualization */}
      {(story.flow?.from || story.flow?.to) && (
        <div className="bg-card border border-border/60 rounded-xl p-4">
          <div className="flex items-center justify-between gap-3">
            {/* From */}
            {story.flow?.from ? (
              <FlowSide
                label="支出"
                token={story.flow.from.token}
                amount={story.flow.from.amount}
              />
            ) : <div className="flex-1" />}

            {/* Arrow */}
            {story.flow?.from && story.flow?.to && (
              <motion.div
                initial={{ x: -4, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.15 }}
                className="shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center"
              >
                <ArrowRight className="w-3.5 h-3.5 text-primary" />
              </motion.div>
            )}

            {/* To */}
            {story.flow?.to ? (
              <FlowSide
                label="获得"
                token={story.flow.to.token}
                amount={story.flow.to.amount}
                align="right"
              />
            ) : <div className="flex-1" />}
          </div>
        </div>
      )}

      {/* Subline */}
      <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
        <Flame className="w-3 h-3" strokeWidth={1.5} />
        <span>{story.subline}</span>
      </div>
    </motion.div>
  );
}

function FlowSide({
  label, token, amount, align = 'left',
}: { label: string; token: string; amount: string; align?: 'left' | 'right' }) {
  return (
    <div className={cn('flex-1 min-w-0', align === 'right' && 'text-right')}>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <div className={cn('flex items-center gap-2', align === 'right' && 'flex-row-reverse')}>
        <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center shrink-0 overflow-hidden">
          <CryptoIcon symbol={token} size="md" />
        </div>
        <div className={cn('min-w-0', align === 'right' && 'text-right')}>
          <p className="text-[14px] font-bold text-foreground truncate leading-tight">{amount}</p>
          <p className="text-[11px] text-muted-foreground truncate">{token}</p>
        </div>
      </div>
    </div>
  );
}
