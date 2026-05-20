import { useNavigate } from 'react-router-dom';
import {
  Settings, Bot, Settings2, FileText,
  Wallet, BookUser, Shield, ClipboardCheck, ChevronRight, KeyRound,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { AppLayout } from '@/components/layout/AppLayout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ListItem } from '@/components/ui/list-item';
import { SectionHeader } from '@/components/ui/section-header';
import { useWallet } from '@/contexts/WalletContext';

export default function Mine() {
  const navigate = useNavigate();
  const { userInfo, markAllUnrecovered } = useWallet();
  const displayName = userInfo?.nickname || userInfo?.email?.split('@')[0] || '用户';

  // TODO: 临时测试入口，上线前删除
  const handleSimulateNewDevice = () => {
    markAllUnrecovered();
    // Reload to trigger Splash → Welcome back flow
    setTimeout(() => {
      window.location.href = '/';
    }, 100);
  };

  return (
    <AppLayout
      showNav
      pageBg="bg-page"
      title="我的"
      rightAction={
        <div className="flex items-center gap-2">
          {/* TODO: 临时测试按钮，上线前删除 */}
          <button
            onClick={handleSimulateNewDevice}
            className="px-1.5 py-0.5 rounded text-[9px] font-medium border bg-muted/50 text-muted-foreground border-border/60"
          >
            新设备
          </button>
          <motion.button
            onClick={() => navigate('/profile/general')}
            whileTap={{ scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <Settings className="w-6 h-6" strokeWidth={1.5} style={{ color: '#000000' }} />
          </motion.button>
        </div>
      }
    >
      <div className="px-4 pt-2 no-card-shadow">

        {/* Profile Header */}
        <motion.div
          className="bg-muted rounded-xl flex items-center gap-3 px-4 py-3 mb-4 cursor-pointer"
          onClick={() => navigate('/profile/info/edit')}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          <Avatar className="relative w-14 h-14 shrink-0">
            <AvatarImage src={userInfo?.avatar} alt="User avatar" />
            <AvatarFallback className="bg-muted text-foreground text-xl font-semibold">
              {displayName[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h2 className="text-[18px] leading-7 font-bold text-foreground">{displayName}</h2>
            <p className="text-xs text-muted-foreground">编辑个人信息</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" strokeWidth={1.5} />
        </motion.div>

        {/* Agent 管理 */}
        <div className="mb-4">
          <SectionHeader title="Agent 管理" />
          <div className="bg-muted rounded-xl overflow-hidden">
            {[
              { icon: Bot, label: 'Agent 授权管理', path: '/agent-management' },
              { icon: Settings2, label: 'Agent 风控管理', path: '/agent-settings' },
              { icon: ClipboardCheck, label: 'Agent 审核管理', path: '/agent-review' },
              { icon: FileText, label: '审计日志', path: '/audit-log' },
            ].map((item, index, arr) => (
              <ListItem
                key={item.label}
                icon={<item.icon className="w-5 h-5" strokeWidth={1.5} style={{ color: '#000000' }} />}
                title={item.label}
                showChevron
                showDivider={false}
                onClick={() => navigate(item.path)}
                className="py-4 px-4"
              />
            ))}
          </div>
        </div>

        {/* 钱包管理 */}
        <div className="mb-4">
          <SectionHeader title="钱包管理" />
          <div className="bg-muted rounded-xl overflow-hidden">
            {[
              { icon: Wallet, label: '钱包管理', path: '/profile/wallets' },
              { icon: BookUser, label: '地址簿', path: '/profile/contacts' },
              { icon: KeyRound, label: 'TSS 签名', path: '/profile/tss-signing' },
            ].map((item, index, arr) => (
              <ListItem
                key={item.label}
                icon={<item.icon className="w-5 h-5" strokeWidth={1.5} style={{ color: '#000000' }} />}
                title={item.label}
                showChevron
                showDivider={false}
                onClick={() => navigate(item.path)}
                className="py-4 px-4"
              />
            ))}
          </div>
        </div>

        <div className="h-6 shrink-0" />
      </div>
    </AppLayout>
  );
}
