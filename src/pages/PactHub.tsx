import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, Bot, ChevronRight, Shield, FileText, MessageSquare,
  CheckCircle2, XCircle, ShieldCheck, Timer, Fingerprint, ArrowRight,
  TrendingUp, ShieldAlert, Coins, Copy, ChevronDown, ChevronLeft, X,
  Sprout, BarChart3, CreditCard, Globe,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n';
import { mockPacts, mockDefaultPacts } from '@/lib/mock-pacts';
import { mockRecipes, categoryLabels, type Recipe, type RecipeCategory } from '@/lib/mock-recipes';
import { getPactHistoryData, type DailyPactData } from '@/lib/mock-pact-history';
import { toast } from '@/lib/toast';
import { CryptoIcon } from '@/components/CryptoIcon';
import { RecipeIcon } from '@/components/RecipeIcon';
import type { Pact, PactStatus } from '@/types/pact';

type ListTab = 'all' | 'pending' | 'active' | 'rejected' | 'completed' | 'expired' | 'revoked';

// Threshold: 3+ pacts = normal dashboard
const ONBOARDING_THRESHOLD = 3;

export default function PactHub() {
  const navigate = useNavigate();
  const t = useT();
  const [forceEmpty, setForceEmpty] = useState(false);
  const [listTab, setListTab] = useState<ListTab>('all');

  const allPacts = mockPacts;
  const activePacts = useMemo(() => allPacts.filter(p => p.status === 'active'), []);
  const pendingCount = allPacts.filter(p => p.status === 'pending').length;
  const hasAnyPact = allPacts.length > 0;
  const isEarlyUser = allPacts.length < ONBOARDING_THRESHOLD;

  const listTabs: { value: ListTab; label: string; statuses: PactStatus[]; count?: number }[] = [
    { value: 'all', label: '全部', statuses: ['pending', 'active', 'rejected', 'completed', 'expired', 'revoked'] },
    { value: 'pending', label: '待审批', statuses: ['pending'], count: pendingCount || undefined },
    { value: 'active', label: '生效中', statuses: ['active'] },
    { value: 'rejected', label: '已拒绝', statuses: ['rejected'] },
    { value: 'completed', label: '已完成', statuses: ['completed'] },
    { value: 'expired', label: '已过期', statuses: ['expired'] },
    { value: 'revoked', label: '已撤回', statuses: ['revoked'] },
  ];

  const statusConfig: Record<PactStatus, { label: string; color: string; bg: string; dot: string }> = {
    pending: { label: '待审批', color: 'text-warning', bg: 'bg-warning/8', dot: 'bg-warning' },
    active: { label: '生效中', color: 'text-primary', bg: 'bg-primary/8', dot: 'bg-primary' },
    completed: { label: '已完成', color: 'text-muted-foreground', bg: 'bg-muted', dot: 'bg-muted-foreground' },
    rejected: { label: '已拒绝', color: 'text-destructive', bg: 'bg-destructive/8', dot: 'bg-destructive' },
    expired: { label: '已过期', color: 'text-muted-foreground', bg: 'bg-muted', dot: 'bg-muted-foreground' },
    revoked: { label: '已撤回', color: 'text-destructive', bg: 'bg-destructive/8', dot: 'bg-destructive' },
  };

  const filteredPacts = useMemo(() => {
    const statuses = listTabs.find(t => t.value === listTab)!.statuses;
    return allPacts
      .filter(p => statuses.includes(p.status))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [listTab]);

  return (
    <AppLayout
      showNav
      pageBg="bg-page"
      title="Pact"
      rightAction={
        <button
          onClick={() => setForceEmpty(f => !f)}
          className={cn('px-2 py-0.5 rounded text-[10px] font-medium border', forceEmpty ? 'bg-destructive/8 text-destructive border-destructive/20' : 'bg-muted/50 text-muted-foreground border-border/60')}
        >
          {forceEmpty ? '新用户' : '测试'}
        </button>
      }
    >
      {forceEmpty || isEarlyUser ? (
        <PactOnboarding
          pacts={forceEmpty ? [] : allPacts}
          statusConfig={statusConfig}
        />
      ) : (
        <>
          {/* ===== Marketing Banner — sticky ===== */}
          <div className="sticky top-0 z-10 px-4 pt-2 pb-2 bg-page">
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-primary/8/60">
              <ShieldCheck className="w-4 h-4 text-primary/70 shrink-0" strokeWidth={1.5} />
              <p className="text-[12px] text-primary/70/70 leading-relaxed">
                Pact 已守护 <span className="font-semibold text-primary">{mockPacts.length}</span> 个策略，完成 <span className="font-semibold text-primary">{mockPacts.reduce((s, p) => s + (p.exitConditionList?.find(c => c.type === 'tx_count')?.current ?? 0), 0)}</span> 笔交易，累计 <span className="font-semibold text-primary">${mockPacts.reduce((s, p) => s + (p.exitConditionList?.find(c => c.type === 'tx_amount')?.current ?? 0), 0).toLocaleString()}</span>
              </p>
            </div>
          </div>

          <div className="pb-6 space-y-5">
            <div className="px-4"><PactHistoryChart /></div>
            <TemplateCarousel />

            {/* ===== Pact List with Tabs ===== */}
            <div className="px-4">
              <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
                {listTabs.map(tab => {
                  const isActive = listTab === tab.value;
                  return (
                    <button key={tab.value} onClick={() => setListTab(tab.value)} className={cn('shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-all border', isActive ? 'bg-foreground text-background border-foreground' : 'bg-white text-muted-foreground border-border/60')}>
                      {tab.label}
                      {tab.count && tab.count > 0 && <span className="ml-1 text-[10px] font-bold">{tab.count}</span>}
                    </button>
                  );
                })}
              </div>
              <AnimatePresence mode="wait">
                {filteredPacts.length === 0 ? (
                  <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-12 text-center">
                    <Shield className="w-10 h-10 mx-auto text-muted-foreground/20 mb-2" strokeWidth={1.5} />
                    <p className="text-[13px] text-muted-foreground">暂无记录</p>
                  </motion.div>
                ) : (
                  <motion.div key={listTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2.5">
                    {filteredPacts.map((pact, i) => {
                      const status = statusConfig[pact.status];
                      return (
                        <motion.div key={pact.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} onClick={() => navigate(`/pact/${pact.id}`)} className="bg-white rounded-2xl p-4 border border-border/60 shadow-sm cursor-pointer active:scale-[0.98] transition-transform">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-full', status.color, status.bg)}>{status.label}</span>
                              </div>
                              <h3 className="text-[14px] font-bold text-foreground leading-snug mb-1">{pact.title}</h3>
                              <p className="text-[12px] text-muted-foreground line-clamp-2">{pact.description}</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" strokeWidth={1.5} />
                          </div>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </>
      )}
    </AppLayout>
  );
}

// ═══════════════════════════════════════════════════════════
// ─── New User Onboarding (redesigned) ─────────────────────
// ═══════════════════════════════════════════════════════════

// Intent-based categories → Recipe mapping
const GOAL_CATEGORIES = [
  {
    id: 'yield',
    icon: Sprout,
    emoji: '🌱',
    title: '赚取收益',
    desc: '闲置资产生息、借贷优化',
    filter: (r: Recipe) => r.category === 'defi' && r.tags.some(t => ['lending', 'compound', 'aave'].includes(t)),
  },
  {
    id: 'trade',
    icon: BarChart3,
    emoji: '📊',
    title: '交易代币',
    desc: '定投、Swap、再平衡',
    filter: (r: Recipe) => r.category === 'defi' && r.tags.some(t => ['swap', 'dca', 'trading', 'uniswap', 'investment'].includes(t)),
  },
  {
    id: 'pay',
    icon: CreditCard,
    emoji: '💸',
    title: '支付转账',
    desc: '定时付款、流式工资',
    filter: (r: Recipe) => r.category === 'payments',
  },
  {
    id: 'bridge',
    icon: Globe,
    emoji: '🌉',
    title: '跨链 & 工具',
    desc: '跨链桥、免 Gas 转账',
    filter: (r: Recipe) => r.category === 'infrastructure',
  },
];

type CreateStep = 'goals' | 'recipes' | 'prompt';

function PactOnboarding({
  pacts,
  statusConfig,
}: {
  pacts: Pact[];
  statusConfig: Record<PactStatus, { label: string; color: string; bg: string; dot: string }>;
}) {
  const navigate = useNavigate();

  // Drawer states
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  // Create flow state
  const [createStep, setCreateStep] = useState<CreateStep>('goals');
  const [selectedGoal, setSelectedGoal] = useState<typeof GOAL_CATEGORIES[number] | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  // Filtered recipes for selected goal
  const goalRecipes = useMemo(() => {
    if (!selectedGoal) return [];
    return mockRecipes.filter(selectedGoal.filter);
  }, [selectedGoal]);

  const resetCreate = () => {
    setCreateStep('goals');
    setSelectedGoal(null);
    setSelectedRecipe(null);
    setCopiedIdx(null);
  };

  const handleOpenCreate = () => {
    resetCreate();
    setCreateOpen(true);
  };

  const handleSelectGoal = (goal: typeof GOAL_CATEGORIES[number]) => {
    setSelectedGoal(goal);
    const recipes = mockRecipes.filter(goal.filter);
    if (recipes.length === 1) {
      // Only one recipe → skip selection, go straight to prompt
      setSelectedRecipe(recipes[0]);
      setCreateStep('prompt');
    } else {
      setCreateStep('recipes');
    }
  };

  const handleSelectRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setCreateStep('prompt');
  };

  const handleCopyPrompt = (prompt: string, idx: number) => {
    navigator.clipboard.writeText(prompt);
    setCopiedIdx(idx);
    toast.success('Prompt 已复制，发送给你的 Agent 即可创建 Pact');
    setTimeout(() => setCopiedIdx(c => (c === idx ? null : c)), 2500);
  };

  const handleCreateBack = () => {
    if (createStep === 'prompt' && goalRecipes.length > 1) {
      setCreateStep('recipes');
      setSelectedRecipe(null);
      setCopiedIdx(null);
    } else if (createStep === 'prompt' || createStep === 'recipes') {
      setCreateStep('goals');
      setSelectedGoal(null);
      setSelectedRecipe(null);
      setCopiedIdx(null);
    }
  };

  return (
    <div className="px-4 pb-8">
      {/* ═══ Pact Status Cards (if user has pacts) ═══ */}
      {pacts.length > 0 && (
        <div className="space-y-2 mb-4 pt-2">
          {pacts.slice(0, 2).map(pact => {
            const status = statusConfig[pact.status];
            return (
              <motion.button
                key={pact.id}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => navigate(`/pact/${pact.id}`)}
                className="w-full flex items-center gap-3 p-3 bg-card rounded-xl border border-border/60 shadow-sm active:scale-[0.98] transition-transform text-left"
              >
                <div className={cn('w-2 h-2 rounded-full shrink-0', status.dot)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn('text-[11px] font-medium', status.color)}>{status.label}</span>
                    <span className="text-[13px] font-semibold text-foreground truncate">{pact.title}</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" strokeWidth={1.5} />
              </motion.button>
            );
          })}
        </div>
      )}

      {/* ═══ Hero ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center text-center pt-16 pb-8"
      >
        {/* 3D Shield with floating animation */}
        <motion.img
          src="/shield-3d.png"
          alt=""
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
          className="h-48 w-auto object-contain mb-8 drop-shadow-[0_18px_48px_rgba(31,50,214,0.45)]"
        />

        <h2 className="text-[32px] font-bold text-foreground leading-[1.15] tracking-tight">
          Autonomy for Agents,
        </h2>
        <h2 className="text-[32px] font-bold text-foreground leading-[1.15] tracking-tight mb-4">
          Certainty for You.
        </h2>
        <p className="text-[14px] text-muted-foreground leading-relaxed max-w-[300px]">
          Pact 让你的 Agent 在你设定的规则内自主行动 — 安全、透明、可控。
        </p>
      </motion.div>

      {/* ═══ CTA ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-3 mb-6"
      >
        <Button
          size="lg"
          className="w-full h-12 text-[15px] font-semibold gradient-primary rounded-xl"
          onClick={handleOpenCreate}
        >
          {pacts.length > 0 ? '创建新的 Pact' : '创建你的第一个 Pact'}
        </Button>
        <button
          onClick={() => setHowItWorksOpen(true)}
          className="w-full text-center text-[13px] text-muted-foreground font-medium py-2"
        >
          Pact 如何运作 <ArrowRight className="inline w-3.5 h-3.5 ml-0.5" />
        </button>
      </motion.div>

      {/* ═══ How Pact Works Drawer ═══ */}
      <Drawer open={howItWorksOpen} onOpenChange={setHowItWorksOpen}>
        <DrawerContent>
          <DrawerHeader className="sr-only">
            <DrawerTitle>Pact 如何运作</DrawerTitle>
          </DrawerHeader>
          <div className="px-5 pt-2 pb-8">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-primary" strokeWidth={1.5} />
              <h3 className="text-[17px] font-bold text-foreground">Pact 如何运作</h3>
            </div>
            <p className="text-[13px] text-muted-foreground mb-5">
              Pact 不是权限授予 — 它是一份可执行的协议。四个步骤，一气呵成。
            </p>

            <div className="space-y-0">
              {[
                { num: '1', title: '你描述意图', desc: '用自然语言告诉 Agent 你想要什么。' },
                { num: '2', title: 'Agent 起草 Pact', desc: 'Agent 生成执行计划、风控规则和退出条件。' },
                { num: '3', title: '你审核并批准', desc: '看到完整方案后，确认、修改或拒绝。' },
                { num: '4', title: '在规则内执行', desc: '每笔交易都会校验 Pact 规则，到期自动结束。' },
              ].map((s, i, arr) => (
                <div key={s.num} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center shrink-0">
                      <span className="text-[12px] font-bold">{s.num}</span>
                    </div>
                    {i < arr.length - 1 && <div className="w-[2px] flex-1 bg-primary/15 my-1" />}
                  </div>
                  <div className={i < arr.length - 1 ? 'pb-4' : ''}>
                    <p className="text-[14px] font-semibold text-foreground leading-snug">{s.title}</p>
                    <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <Button
              size="lg"
              className="w-full mt-6 h-11 text-[14px] font-medium"
              onClick={() => setHowItWorksOpen(false)}
            >
              我知道了
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* ═══ Create Pact Drawer (multi-step) ═══ */}
      <Drawer
        open={createOpen}
        onOpenChange={(open) => {
          if (!open) { setCreateOpen(false); resetCreate(); }
        }}
      >
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="sr-only">
            <DrawerTitle>创建 Pact</DrawerTitle>
          </DrawerHeader>

          <div className="px-5 pt-2 pb-8 overflow-y-auto">
            {/* Header with back + close */}
            <div className="flex items-center justify-between mb-4">
              {createStep !== 'goals' ? (
                <button onClick={handleCreateBack} className="p-1 -ml-1 text-muted-foreground">
                  <ChevronLeft className="w-5 h-5" />
                </button>
              ) : (
                <div className="w-7" />
              )}
              <span className="text-[11px] font-medium text-primary uppercase tracking-wider">
                创建 Pact · 第 {createStep === 'goals' ? '1' : '2'} / 2 步
              </span>
              <button onClick={() => { setCreateOpen(false); resetCreate(); }} className="p-1 -mr-1 text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <AnimatePresence mode="wait">
              {/* ─── Step 1: Choose Goal ─── */}
              {createStep === 'goals' && (
                <motion.div key="goals" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <div className="text-center mb-5">
                    <h3 className="text-[20px] font-bold text-foreground leading-snug mb-1">
                      你想让 Agent 做什么？
                    </h3>
                    <p className="text-[13px] text-muted-foreground">
                      选择一个目标，我们会为你推荐合适的策略。
                    </p>
                  </div>

                  <div className="space-y-2">
                    {GOAL_CATEGORIES.map(goal => {
                      const Icon = goal.icon;
                      const recipeCount = mockRecipes.filter(goal.filter).length;
                      if (recipeCount === 0) return null;
                      return (
                        <button
                          key={goal.id}
                          onClick={() => handleSelectGoal(goal)}
                          className="w-full flex items-center gap-3 p-4 bg-card rounded-xl border border-border/60 active:scale-[0.98] transition-transform text-left"
                        >
                          <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
                            <Icon className="w-5 h-5 text-primary" strokeWidth={1.5} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[14px] font-semibold text-foreground">{goal.title}</p>
                            <p className="text-[12px] text-muted-foreground mt-0.5">{goal.desc}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" strokeWidth={1.5} />
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* ─── Step 2a: Choose Recipe ─── */}
              {createStep === 'recipes' && selectedGoal && (
                <motion.div key="recipes" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <div className="text-center mb-5">
                    <h3 className="text-[20px] font-bold text-foreground leading-snug mb-1">
                      选择一个 Recipe
                    </h3>
                    <p className="text-[13px] text-muted-foreground">
                      {selectedGoal.emoji} {selectedGoal.title}
                    </p>
                  </div>

                  <div className="space-y-2">
                    {goalRecipes.map(recipe => (
                      <button
                        key={recipe.id}
                        onClick={() => handleSelectRecipe(recipe)}
                        className="w-full flex items-center gap-3 p-4 bg-card rounded-xl border border-border/60 active:scale-[0.98] transition-transform text-left"
                      >
                        <RecipeIcon recipe={recipe} size="md" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-semibold text-foreground">{recipe.title}</p>
                          <p className="text-[12px] text-muted-foreground mt-0.5 line-clamp-1">{recipe.description}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" strokeWidth={1.5} />
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ─── Step 2b: Show Prompts ─── */}
              {createStep === 'prompt' && selectedRecipe && selectedGoal && (
                <motion.div key="prompt" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <div className="text-center mb-5">
                    <h3 className="text-[20px] font-bold text-foreground leading-snug mb-1">
                      挑一条 Prompt 试试
                    </h3>
                    <p className="text-[13px] text-muted-foreground">
                      复制后发给已配对的 Agent，生成的 Pact 会回到这里等你审批。
                    </p>
                  </div>

                  {/* Category + Recipe label */}
                  <div className="flex items-center gap-1.5 mb-3">
                    <span className="text-[11px] font-medium text-primary uppercase tracking-wider">
                      {selectedGoal.emoji} {selectedGoal.title}
                    </span>
                    <span className="text-[11px] text-muted-foreground">·</span>
                    <span className="text-[11px] text-muted-foreground">{selectedRecipe.title}</span>
                  </div>

                  {/* Prompt list — tap any to copy */}
                  <div className="space-y-2.5">
                    {selectedRecipe.example_prompts.map((prompt, idx) => {
                      const isCopied = copiedIdx === idx;
                      return (
                        <button
                          key={idx}
                          onClick={() => handleCopyPrompt(prompt, idx)}
                          className={cn(
                            'w-full text-left relative p-4 pr-12 rounded-xl border transition-all active:scale-[0.99]',
                            isCopied
                              ? 'bg-success/8 border-success/30'
                              : 'bg-muted/40 border-border/60 hover:border-primary/30'
                          )}
                        >
                          <div className="flex items-start gap-2">
                            <span className="text-primary/60 font-semibold text-[14px] leading-relaxed shrink-0 select-none">›</span>
                            <p className="text-[14px] text-foreground leading-relaxed font-medium flex-1">
                              {prompt}
                            </p>
                          </div>
                          <span className={cn(
                            'absolute top-3 right-3 inline-flex items-center justify-center w-7 h-7 rounded-md border transition-colors',
                            isCopied
                              ? 'bg-success/10 border-success/30 text-success'
                              : 'bg-card border-border/70 text-muted-foreground'
                          )}>
                            {isCopied
                              ? <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2.5} />
                              : <Copy className="w-3.5 h-3.5" strokeWidth={1.75} />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Step dots */}
            <div className="flex items-center justify-center gap-1.5 mt-6">
              <div className={cn('w-1.5 h-1.5 rounded-full transition-colors', createStep === 'goals' ? 'bg-primary' : 'bg-muted-foreground/20')} />
              <div className={cn('w-1.5 h-1.5 rounded-full transition-colors', createStep !== 'goals' ? 'bg-primary' : 'bg-muted-foreground/20')} />
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

// ─── Template Carousel (horizontal swipe) — normal state ──
function TemplateCarousel() {
  const navigate = useNavigate();
  const [drawerTpl, setDrawerTpl] = useState<typeof PROMPT_TEMPLATES[number] | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('已复制到剪贴板');
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <>
      <div>
        <div className="flex items-center justify-between px-4 mb-2">
          <span className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">策略模板</span>
          <button onClick={() => navigate('/recipes')} className="text-[12px] text-primary font-medium">查看更多</button>
        </div>
        <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', paddingLeft: 16, paddingRight: 16 }}>
          {PROMPT_TEMPLATES.map((tpl) => (
            <button key={tpl.id} onClick={() => setDrawerTpl(tpl)} className="snap-start shrink-0 w-full flex items-center gap-3 p-3.5 bg-card rounded-2xl border border-border/60 shadow-sm active:scale-[0.98] transition-transform text-left" style={{ minWidth: 'calc(100% - 32px)', maxWidth: 'calc(100% - 32px)' }}>
              <CryptoIcon symbol={tpl.symbol} size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-foreground leading-snug">{tpl.title}</p>
                <p className="text-[12px] text-muted-foreground mt-0.5">{tpl.desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" strokeWidth={1.5} />
            </button>
          ))}
        </div>
      </div>
      <Drawer open={!!drawerTpl} onOpenChange={(open) => { if (!open) setDrawerTpl(null); }}>
        <DrawerContent>
          {drawerTpl && (
            <div className="px-5 pt-2 pb-8">
              <div className="flex items-center gap-3 mb-5">
                <CryptoIcon symbol={drawerTpl.symbol} size="lg" />
                <div>
                  <p className="text-[17px] font-bold text-foreground">{drawerTpl.title}</p>
                  <p className="text-[13px] text-muted-foreground mt-0.5">{drawerTpl.desc}</p>
                </div>
              </div>
              <div className="flex gap-3 mb-5">
                <div className="w-[3px] rounded-full bg-primary shrink-0" />
                <p className="text-[15px] text-foreground leading-relaxed">{drawerTpl.prompt}</p>
              </div>
              <Button size="lg" className="w-full text-[14px] font-medium gradient-primary" onClick={() => handleCopy(drawerTpl.id, drawerTpl.prompt)}>
                {copiedId === drawerTpl.id ? <><CheckCircle2 className="w-4 h-4 mr-2" />已复制到剪贴板</> : <><Copy className="w-4 h-4 mr-2" />复制 Prompt</>}
              </Button>
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </>
  );
}

const PROMPT_TEMPLATES = [
  { id: 'tpl-dca', title: 'ETH 定投策略', desc: '每周自动定投 ETH，长期积累', symbol: 'ETH', prompt: '帮我设置一个ETH定投计划，每周一买入500美金的ETH，用Uniswap执行，持续3个月。' },
  { id: 'tpl-risk', title: 'Aave V3 借贷风控', desc: '监控清算风险，自动补充抵押品', symbol: 'AAVE', prompt: '监控我的Aave V3借贷仓位，如果健康因子低于1.5就自动补充ETH抵押品，保持安全。' },
  { id: 'tpl-yield', title: 'USDC 收益优化', desc: '闲置稳定币自动寻找最优收益', symbol: 'USDC', prompt: '帮我把闲置的USDC存到收益最高的协议里，每天自动复投。' },
];

// ─── Execution History Chart ───────────────────────────────
type MetricTab = 'txCount' | 'txAmount';
type TimeRange = '1d' | '7d' | '30d';
const timeRangeLabels: Record<TimeRange, string> = { '1d': '1天', '7d': '7天', '30d': '30天' };

function PactHistoryChart() {
  const [metric, setMetric] = useState<MetricTab>('txCount');
  const [range, setRange] = useState<TimeRange>('7d');
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const historyData = useMemo(() => getPactHistoryData(), []);
  const rawData = range === '1d' ? historyData.d1 : range === '7d' ? historyData.d7 : historyData.d30;
  const chartData = useMemo(() => rawData.map(d => ({ ...d, value: metric === 'txCount' ? d.totalTxCount : d.totalTxAmount })), [rawData, metric]);
  const totalValue = chartData.reduce((s, d) => s + (metric === 'txCount' ? d.totalTxCount : d.totalTxAmount), 0);
  const totalLabel = metric === 'txCount' ? `${totalValue} 笔` : `$${totalValue.toLocaleString()}`;

  const renderTooltip = useCallback(({ active, payload }: any) => {
    if (!active || !payload?.[0]) return null;
    const data = payload[0].payload as DailyPactData;
    if (data.pacts.length === 0) return null;
    return (
      <div className="bg-white rounded-xl shadow-lg border border-border/60 px-3 py-2.5 min-w-[140px]">
        <p className="text-[11px] text-muted-foreground mb-1.5">{data.date}</p>
        {data.pacts.map((p, i) => (
          <div key={i} className="flex items-center justify-between gap-4 text-[12px] leading-5">
            <span className="text-foreground truncate">{p.pactTitle}</span>
            <span className="text-foreground font-semibold tabular-nums shrink-0">
              {metric === 'txCount' ? `${p.txCount} 笔` : `$${p.txAmount.toLocaleString()}`}
            </span>
          </div>
        ))}
      </div>
    );
  }, [metric]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-start justify-between mb-1">
          <div>
            <p className="text-[24px] font-bold text-foreground leading-none">{totalLabel}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{range === '1d' ? '今日' : range === '7d' ? '近 7 天' : '近 30 天'}累计</p>
          </div>
          <div className="flex gap-1">
            {(['txCount', 'txAmount'] as MetricTab[]).map(m => (
              <button key={m} onClick={() => setMetric(m)} className={cn('px-3 py-1 rounded-full text-[12px] font-medium transition-colors', metric === m ? 'bg-foreground text-background' : 'text-muted-foreground')}>
                {m === 'txCount' ? '交易笔数' : '交易金额'}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="px-2" style={{ height: 140 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }} onMouseMove={(state: any) => { if (state?.activeTooltipIndex !== undefined) setActiveIdx(state.activeTooltipIndex); }} onMouseLeave={() => setActiveIdx(null)}>
            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} interval={range === '30d' ? 4 : range === '1d' ? 3 : 0} />
            <YAxis hide />
            <Tooltip content={renderTooltip} cursor={{ fill: 'rgba(0,0,0,0.03)', radius: 6 }} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={range === '30d' ? 8 : range === '1d' ? 6 : 24} isAnimationActive={true} animationDuration={400} animationEasing="ease-out">
              {chartData.map((_, i) => (<Cell key={i} fill={activeIdx === i ? '#1F32D6' : '#c7d2fe'} />))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-center gap-1 px-4 pt-1 pb-3">
        {(['1d', '7d', '30d'] as TimeRange[]).map(r => (
          <button key={r} onClick={() => setRange(r)} className={cn('px-4 py-1.5 rounded-full text-[11px] font-medium transition-colors', range === r ? 'bg-slate-100 text-foreground' : 'text-muted-foreground')}>
            {timeRangeLabels[r]}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
