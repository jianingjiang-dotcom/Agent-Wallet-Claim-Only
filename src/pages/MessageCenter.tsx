import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Inbox, Eraser } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { SwipeBack } from '@/components/SwipeBack';
import { useWallet } from '@/contexts/WalletContext';
import { useWalletConnect } from '@/contexts/WalletConnectContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { MessageCard } from '@/components/notifications/MessageCard';
import { TodoCard } from '@/components/notifications/TodoCard';
import { EmptyState } from '@/components/EmptyState';
import { cn } from '@/lib/utils';
import { wcRequestToTodo } from '@/lib/wc-todo-bridge';

type MainTab = 'messages' | 'todos';

export default function MessageCenter() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    messages, todoItems, wallets,
    unreadMessageCount, pendingTodoCount,
    markMessageAsRead, markAllMessagesAsRead,
  } = useWallet();
  const { pendingRequests, getSessionById } = useWalletConnect();

  const stateTab = (location.state as { tab?: MainTab })?.tab;
  const savedTab = sessionStorage.getItem('mc-tab') as MainTab | null;
  const [mainTab, setMainTab] = useState<MainTab>(stateTab || savedTab || 'messages');

  // Persist tab selection
  const handleTabChange = (tab: MainTab) => {
    setMainTab(tab);
    sessionStorage.setItem('mc-tab', tab);
  };
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  // Notification preferences (local state for demo)

  // All messages sorted by time, grouped by date
  const sortedMessages = useMemo(() => {
    return [...messages].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [messages]);

  const groupedMessages = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groups: { label: string; items: typeof sortedMessages }[] = [];
    const todayItems = sortedMessages.filter(m => m.timestamp >= today);
    const yesterdayItems = sortedMessages.filter(m => m.timestamp >= yesterday && m.timestamp < today);
    const earlierItems = sortedMessages.filter(m => m.timestamp < yesterday);

    if (todayItems.length) groups.push({ label: '今天', items: todayItems });
    if (yesterdayItems.length) groups.push({ label: '昨天', items: yesterdayItems });
    if (earlierItems.length) groups.push({ label: '更早', items: earlierItems });
    return groups;
  }, [sortedMessages]);

  // WalletConnect sign requests rendered as virtual todos (no state-machine merge,
  // only display-layer aggregation).
  const wcTodos = useMemo(() => {
    return pendingRequests.map(req => {
      const session = getSessionById(req.sessionId);
      const wallet = session ? wallets.find(w => w.id === session.walletId) : undefined;
      return wcRequestToTodo(req, session, wallet);
    });
  }, [pendingRequests, getSessionById, wallets]);

  // All todos sorted by createdAt, grouped by date
  const sortedTodos = useMemo(() => {
    return [...todoItems, ...wcTodos].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [todoItems, wcTodos]);

  const groupedTodos = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groups: { label: string; items: typeof sortedTodos }[] = [];
    const todayItems = sortedTodos.filter(t => t.createdAt >= today);
    const yesterdayItems = sortedTodos.filter(t => t.createdAt >= yesterday && t.createdAt < today);
    const earlierItems = sortedTodos.filter(t => t.createdAt < yesterday);

    if (todayItems.length) groups.push({ label: '今天', items: todayItems });
    if (yesterdayItems.length) groups.push({ label: '昨天', items: yesterdayItems });
    if (earlierItems.length) groups.push({ label: '更早', items: earlierItems });
    return groups;
  }, [sortedTodos]);

  return (
    <SwipeBack>
      <AppLayout
        showNav={false}
        showBack
        onBack={() => navigate(-1)}
        title="通知中心"
        showSecurityBanner={false}
        rightAction={
          unreadMessageCount > 0 ? (
            <button
              onClick={() => setConfirmClearOpen(true)}
              className="p-1 text-muted-foreground transition-colors"
            >
              <Eraser className="w-5 h-5" strokeWidth={1.5} />
            </button>
          ) : undefined
        }
      >
        <div className="flex flex-col h-full">
          {/* Main Tabs */}
          <div className="flex border-b border-border px-4">
            <button
              onClick={() => handleTabChange('messages')}
              className={cn(
                'flex-1 py-3 text-sm font-medium text-center relative transition-colors',
                mainTab === 'messages' ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              消息
              {unreadMessageCount > 0 && (
                <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-primary text-primary-foreground">
                  {unreadMessageCount}
                </span>
              )}
              {mainTab === 'messages' && (
                <motion.div
                  layoutId="main-tab-indicator"
                  className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-primary rounded-full"
                />
              )}
            </button>
            <button
              onClick={() => handleTabChange('todos')}
              className={cn(
                'flex-1 py-3 text-sm font-medium text-center relative transition-colors',
                mainTab === 'todos' ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              待办
              {pendingTodoCount > 0 && (
                <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-destructive text-destructive-foreground">
                  {pendingTodoCount}
                </span>
              )}
              {mainTab === 'todos' && (
                <motion.div
                  layoutId="main-tab-indicator"
                  className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-primary rounded-full"
                />
              )}
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              {mainTab === 'messages' ? (
                <motion.div
                  key="messages"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {groupedMessages.length === 0 ? (
                    <div className="pt-20">
                      <EmptyState
                        icon={<Inbox className="w-10 h-10 text-muted-foreground/40" />}
                        title="暂无消息"
                        description="新的消息将在这里显示"
                      />
                    </div>
                  ) : (
                    <div className="px-4">
                      {groupedMessages.map(group => (
                        <div key={group.label}>
                          <p className="px-1 pt-3 pb-2 text-xs font-medium text-muted-foreground">
                            {group.label}
                          </p>
                          <div className="space-y-2.5">
                            {group.items.map(msg => (
                              <MessageCard
                                key={msg.id}
                                message={msg}
                                onRead={markMessageAsRead}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="todos"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {groupedTodos.length === 0 ? (
                    <div className="pt-20">
                      <EmptyState
                        icon={<Inbox className="w-10 h-10 text-muted-foreground/40" />}
                        title="暂无待办事项"
                        description="新的审批和签名请求将在这里显示"
                      />
                    </div>
                  ) : (
                    <div className="px-4">
                      {groupedTodos.map(group => (
                        <div key={group.label}>
                          <p className="px-1 pt-3 pb-2 text-xs font-medium text-muted-foreground">
                            {group.label}
                          </p>
                          <div className="space-y-3">
                            {group.items.map(item => (
                              <TodoCard
                                key={item.id}
                                item={item}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </AppLayout>

      {/* Confirm clear unread dialog */}
      {confirmClearOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={() => setConfirmClearOpen(false)}>
          <div
            className="bg-white rounded-[16px] w-[270px] overflow-hidden"
            style={{ boxShadow: '0px 6px 24px rgba(0, 0, 0, 0.12)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-5 pb-4 text-center">
              <p className="text-[16px] leading-[22px] font-semibold text-[#1c1c1c]">清除未读</p>
              <p className="text-[14px] leading-[20px] text-[#8E8E93] mt-2">确定要将所有 {unreadMessageCount} 条消息标记为已读吗？</p>
            </div>
            <div className="flex border-t border-[#EDEEF3]">
              <button
                className="flex-1 py-3 text-[16px] leading-[22px] font-medium text-[#1c1c1c] border-r border-[#EDEEF3] active:bg-muted/50 transition-colors"
                onClick={() => setConfirmClearOpen(false)}
              >
                取消
              </button>
              <button
                className="flex-1 py-3 text-[16px] leading-[22px] font-medium text-[#1F32D6] active:bg-muted/50 transition-colors"
                onClick={() => { markAllMessagesAsRead(); setConfirmClearOpen(false); }}
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </SwipeBack>
  );
}
