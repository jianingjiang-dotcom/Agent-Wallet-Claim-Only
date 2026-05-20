import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigationType } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { WalletProvider, useWallet } from "@/contexts/WalletContext";
import { WalletConnectProvider } from "@/contexts/WalletConnectContext";
import { WalletConnectGlobal } from "@/components/WalletConnectGlobal";
import { AppLockProvider } from "@/contexts/AppLockContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { PhoneFrame } from "@/components/layout/PhoneFrame";
import { AppLockScreen } from "@/components/AppLockScreen";
import Splash from "./pages/Splash";
import Welcome from "./pages/Welcome";
import WelcomeBack from "./pages/WelcomeBack";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import CreateWallet from "./pages/CreateWallet";
import Home from "./pages/Home";
import HomeNoRecovery from "./pages/HomeNoRecovery";
import Send from "./pages/Send";
import Receive from "./pages/Receive";
import History from "./pages/History";
import Profile from "./pages/Profile";
import WalletManagement from "./pages/WalletManagement";
import Security from "./pages/Security";
import DeviceManagement from "./pages/DeviceManagement";
import Notifications from "./pages/Notifications";
import Help from "./pages/Help";
import PersonalInfo from "./pages/PersonalInfo";
import EditProfile from "./pages/EditProfile";
import EditNickname from "./pages/EditNickname";
import Contacts from "./pages/Contacts";
import ConnectedDapps from "./pages/ConnectedDapps";
import SessionDetail from "./pages/SessionDetail";
import WcSignRequest from "./pages/WcSignRequest";
import ContactForm from "./pages/ContactForm";
import ContactDetail from "./pages/ContactDetail";
import AssetDetail from "./pages/AssetDetail";
import MessageCenter from "./pages/MessageCenter";
import MessageCategoryPage from "./pages/MessageCategoryPage";
import ExcessApproval from "./pages/ExcessApproval";
import PactApprovalDetail from "./pages/PactApprovalDetail";
import TssSigningDetail from "./pages/TssSigningDetail";
import WalletRecovery from "./pages/WalletRecovery";
import ExportPrivateKey from "./pages/ExportPrivateKey";
import AuthorizeDevice from "./pages/AuthorizeDevice";
import TssKeyRecovery from "./pages/TssKeyRecovery";
import TSSBackupManagement from "./pages/TSSBackupManagement";
import CloudRecoveryUnavailable from "./pages/CloudRecoveryUnavailable";
import DeviceKicked from "./pages/DeviceKicked";
import SecurityRequired from "./pages/SecurityRequired";
import SetPassword from "./pages/SetPassword";
import BindEmailDemo from "./pages/BindEmailDemo";
import LockScreenDemo from "./pages/LockScreenDemo";
import NotFound from "./pages/NotFound";
import TransactionDetail from "./pages/TransactionDetail";
import AIAssistant from "./pages/AIAssistant";
import AgentDetail from "./pages/AgentDetail";
import DelegateAgent from "./pages/DelegateAgent";
import AgentReview from "./pages/AgentReview";
import AgentReviewDetail from "./pages/AgentReviewDetail";
import AgentSettings from "./pages/AgentSettings";
import AgentReshare from "./pages/AgentReshare";
import SettlementDashboard from "./pages/SettlementDashboard";
import AuditLog from "./pages/AuditLog";
import ModeSelection from "./pages/ModeSelection";
import LinkAgentWallet from "./pages/LinkAgentWallet";
import RequestAgent from "./pages/RequestAgent";
import WalletBackup from "./pages/WalletBackup";
import AddressManagement from "./pages/AddressManagement";
import GeneralSettings from "./pages/GeneralSettings";
import AccountSecurity from "./pages/AccountSecurity";
import ComponentDemo from "./pages/ComponentDemo";
import Mine from "./pages/Mine";
import TransactionHashDetail from "./pages/TransactionHashDetail";
import TssSigning from "./pages/TssSigning";
import ClaimIntro from "./pages/ClaimIntro";
import ClaimWallet from "./pages/ClaimWallet";
import PactHub from "./pages/PactHub";
import PactApproval from "./pages/PactApproval";
import PactDetail from "./pages/PactDetail";
import DefaultPactManagement from "./pages/DefaultPactManagement";
import StrategyMarketplace from "./pages/StrategyMarketplace";
import StrategyDetail from "./pages/StrategyDetail";
import SystemAnnouncement from "./pages/SystemAnnouncement";
import RecipeMarketplace from "./pages/RecipeMarketplace";
import RecipeDetail from "./pages/RecipeDetail";
import { InAppNotification as InAppNotificationOverlay } from "./components/InAppNotification";

const queryClient = new QueryClient();

function ProtectedRoute({ children, bypassAuth = false }: { children: React.ReactNode; bypassAuth?: boolean }) {
  const { isAuthenticated, devModeLogin } = useWallet();

  // If bypassAuth is true, auto-login and render children
  if (bypassAuth && !isAuthenticated) {
    devModeLogin();
    return null; // Will re-render after login
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

const TAB_PATHS = ['/home', '/assistant', '/pact', '/mine', '/profile'];
type NavMode = 'tab' | 'push' | 'pop';

const enterTransition = { type: 'tween', duration: 0.2, ease: [0.32, 0.72, 0, 1] };
const exitTransition = { type: 'tween', duration: 0.12, ease: 'easeIn' };
const instant = { duration: 0 };

const pageVariants = {
  initial: (mode: NavMode) => ({
    x: mode === 'push' ? '25%' : 0,
    opacity: mode === 'push' ? 0 : 1,
  }),
  animate: () => ({
    x: 0,
    opacity: 1,
    transition: enterTransition,
  }),
  exit: (mode: NavMode) => ({
    opacity: 0,
    transition: mode === 'tab' ? instant : exitTransition,
  }),
};

function AppRoutes() {
  const location = useLocation();
  const navType = useNavigationType();

  const isPop = navType === 'POP';
  const isTab = TAB_PATHS.includes(location.pathname);
  const mode: NavMode = isPop ? 'pop' : isTab ? 'tab' : 'push';

  return (
    <div className="relative h-full overflow-hidden">
      <AnimatePresence custom={mode} mode="wait" initial={false}>
        <motion.div
          key={location.key}
          custom={mode}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          style={{ willChange: 'transform, opacity' }}
          className="absolute inset-0 overflow-y-auto overflow-x-hidden"
        >
          <Routes location={location}>
      <Route path="/" element={<Splash />} />
      <Route path="/welcome" element={<Welcome />} />
      <Route path="/welcome-back" element={<ProtectedRoute bypassAuth><WelcomeBack /></ProtectedRoute>} />
      <Route path="/login" element={<Login />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/create-wallet" element={<ProtectedRoute><CreateWallet /></ProtectedRoute>} />
      <Route path="/home" element={<ProtectedRoute bypassAuth><Home /></ProtectedRoute>} />
      <Route path="/home/norecovery" element={<ProtectedRoute bypassAuth><HomeNoRecovery /></ProtectedRoute>} />
      <Route path="/send" element={<ProtectedRoute><Send /></ProtectedRoute>} />
      <Route path="/receive" element={<ProtectedRoute><Receive /></ProtectedRoute>} />
      <Route path="/asset/:symbol" element={<ProtectedRoute><AssetDetail /></ProtectedRoute>} />
      <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
      <Route path="/pact" element={<ProtectedRoute bypassAuth><PactHub /></ProtectedRoute>} />
      <Route path="/mine" element={<ProtectedRoute><Mine /></ProtectedRoute>} />
      <Route path="/transaction/:id" element={<ProtectedRoute><TransactionDetail /></ProtectedRoute>} />
      <Route path="/tx-hash/:hash" element={<ProtectedRoute bypassAuth><TransactionHashDetail /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/assistant" element={<ProtectedRoute bypassAuth><AIAssistant /></ProtectedRoute>} />
      <Route path="/profile/info" element={<ProtectedRoute><PersonalInfo /></ProtectedRoute>} />
      <Route path="/profile/info/edit" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
      <Route path="/profile/info/edit/nickname" element={<ProtectedRoute><EditNickname /></ProtectedRoute>} />
      <Route path="/profile/wallets" element={<ProtectedRoute><WalletManagement /></ProtectedRoute>} />
      <Route path="/profile/security" element={<ProtectedRoute><Security /></ProtectedRoute>} />
      <Route path="/profile/security/tss-backup" element={<ProtectedRoute><TSSBackupManagement /></ProtectedRoute>} />
      <Route path="/profile/devices" element={<ProtectedRoute><DeviceManagement /></ProtectedRoute>} />
      <Route path="/profile/general" element={<ProtectedRoute><GeneralSettings /></ProtectedRoute>} />
      <Route path="/profile/account-security" element={<ProtectedRoute><AccountSecurity /></ProtectedRoute>} />
      <Route path="/component-demo" element={<ProtectedRoute><ComponentDemo /></ProtectedRoute>} />
      <Route path="/profile/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
      <Route path="/profile/help" element={<ProtectedRoute><Help /></ProtectedRoute>} />
      <Route path="/profile/tss-signing" element={<ProtectedRoute><TssSigning /></ProtectedRoute>} />
      <Route path="/profile/contacts" element={<ProtectedRoute><Contacts /></ProtectedRoute>} />
      <Route path="/profile/contacts/add" element={<ProtectedRoute><ContactForm /></ProtectedRoute>} />
      <Route path="/profile/contacts/edit/:id" element={<ProtectedRoute><ContactForm /></ProtectedRoute>} />
      <Route path="/profile/contacts/:id" element={<ProtectedRoute><ContactDetail /></ProtectedRoute>} />
      <Route path="/connected-dapps" element={<ProtectedRoute bypassAuth><ConnectedDapps /></ProtectedRoute>} />
      <Route path="/connected-dapps/:id" element={<ProtectedRoute bypassAuth><SessionDetail /></ProtectedRoute>} />
      <Route path="/wc-sign/:id" element={<ProtectedRoute bypassAuth><WcSignRequest /></ProtectedRoute>} />
      <Route path="/profile/*" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/agent-management" element={<ProtectedRoute bypassAuth><DelegateAgent /></ProtectedRoute>} />
      <Route path="/agent-management/:id" element={<ProtectedRoute><AgentDetail /></ProtectedRoute>} />
      <Route path="/delegate-agent" element={<Navigate to="/agent-management" replace />} />
      <Route path="/agent-review" element={<ProtectedRoute bypassAuth><AgentReview /></ProtectedRoute>} />
      <Route path="/agent-review/:id" element={<ProtectedRoute><AgentReviewDetail /></ProtectedRoute>} />
      <Route path="/agent-settings" element={<ProtectedRoute><AgentSettings /></ProtectedRoute>} />
      <Route path="/agent-reshare/:walletId" element={<ProtectedRoute><AgentReshare /></ProtectedRoute>} />
      <Route path="/settlement-dashboard" element={<ProtectedRoute bypassAuth><SettlementDashboard /></ProtectedRoute>} />
      <Route path="/audit-log" element={<ProtectedRoute><AuditLog /></ProtectedRoute>} />
      <Route path="/pact-approval" element={<ProtectedRoute bypassAuth><PactApproval /></ProtectedRoute>} />
      <Route path="/pact/:id" element={<ProtectedRoute bypassAuth><PactDetail /></ProtectedRoute>} />
      <Route path="/default-pact" element={<ProtectedRoute bypassAuth><DefaultPactManagement /></ProtectedRoute>} />
      <Route path="/pact-marketplace" element={<ProtectedRoute bypassAuth><StrategyMarketplace /></ProtectedRoute>} />
      <Route path="/pact-marketplace/:id" element={<ProtectedRoute bypassAuth><StrategyDetail /></ProtectedRoute>} />
      <Route path="/system-announcement/:id" element={<ProtectedRoute bypassAuth><SystemAnnouncement /></ProtectedRoute>} />
      <Route path="/recipes" element={<RecipeMarketplace />} />
      <Route path="/recipes/:slug" element={<RecipeDetail />} />
      <Route path="/messages" element={<ProtectedRoute bypassAuth><MessageCenter /></ProtectedRoute>} />
      <Route path="/messages/:type" element={<ProtectedRoute bypassAuth><MessageCategoryPage /></ProtectedRoute>} />
      <Route path="/excess-approval/:todoId" element={<ProtectedRoute bypassAuth><ExcessApproval /></ProtectedRoute>} />
      <Route path="/pact-approval-detail/:todoId" element={<ProtectedRoute bypassAuth><PactApprovalDetail /></ProtectedRoute>} />
      <Route path="/tss-signing/:todoId" element={<ProtectedRoute bypassAuth><TssSigningDetail /></ProtectedRoute>} />
      <Route path="/wallet/recovery" element={<WalletRecovery />} />
      <Route path="/wallet-backup/:id" element={<ProtectedRoute><WalletBackup /></ProtectedRoute>} />
      <Route path="/wallet/export-key/:id" element={<ProtectedRoute><ExportPrivateKey /></ProtectedRoute>} />
      <Route path="/wallet/addresses/:walletId" element={<ProtectedRoute><AddressManagement /></ProtectedRoute>} />
      <Route path="/profile/devices/authorize" element={<ProtectedRoute><AuthorizeDevice /></ProtectedRoute>} />
      <Route path="/tss-recovery" element={<TssKeyRecovery />} />
      <Route path="/cloud-recovery-unavailable" element={<CloudRecoveryUnavailable />} />
      <Route path="/device-kicked" element={<DeviceKicked />} />
      <Route path="/security-required" element={<SecurityRequired />} />
      <Route path="/set-password" element={<ProtectedRoute><SetPassword /></ProtectedRoute>} />
      <Route path="/claim-intro" element={<ProtectedRoute><ClaimIntro /></ProtectedRoute>} />
      <Route path="/claim-wallet" element={<ProtectedRoute bypassAuth><ClaimWallet /></ProtectedRoute>} />
      <Route path="/mode-selection" element={<Navigate to="/claim-intro" replace />} />
      <Route path="/link-agent-wallet" element={<ProtectedRoute><LinkAgentWallet /></ProtectedRoute>} />
      <Route path="/request-agent" element={<ProtectedRoute><RequestAgent /></ProtectedRoute>} />
      <Route path="/bind-email-demo" element={<BindEmailDemo />} />
      <Route path="/lock-screen-demo" element={<LockScreenDemo />} />
      <Route path="*" element={<NotFound />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <LanguageProvider>
        <WalletProvider>
          <WalletConnectProvider>
            <AppLockProvider>
              <TooltipProvider>
                <BrowserRouter>
                  <PhoneFrame>
                    <InAppNotificationOverlay />
                    <Toaster />
                    <AppLockScreen />
                    <AppRoutes />
                    <WalletConnectGlobal />
                  </PhoneFrame>
                </BrowserRouter>
              </TooltipProvider>
            </AppLockProvider>
          </WalletConnectProvider>
        </WalletProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
