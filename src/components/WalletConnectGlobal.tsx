// WalletConnectGlobal — top-level glue:
//   • When a new dApp sign request lands, navigate to /wc-sign/:id (fullscreen page).
//   • Always render SessionApprovalDrawer so connection requests can be approved from any page.
//
// Sign-request UI is the fullscreen WcSignRequest page (see src/pages/WcSignRequest.tsx),
// not a half-screen drawer.

import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useWalletConnect } from '@/contexts/WalletConnectContext';
import { SessionApprovalDrawer } from './SessionApprovalDrawer';

export function WalletConnectGlobal() {
  const { pendingRequests, pendingConnection } = useWalletConnect();
  const navigate = useNavigate();
  const location = useLocation();

  // Track which request IDs we've already routed to, so re-renders don't bounce the user.
  const handledIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const firstPending = pendingRequests.find(r => r.status === 'pending');
    if (!firstPending) return;
    if (handledIds.current.has(firstPending.id)) return;

    // Don't redirect if we're already on a wc-sign route (user is mid-flow)
    if (location.pathname.startsWith('/wc-sign/')) {
      handledIds.current.add(firstPending.id);
      return;
    }

    handledIds.current.add(firstPending.id);
    navigate(`/wc-sign/${firstPending.id}`, { state: { returnTo: location.pathname } });
  }, [pendingRequests, navigate, location.pathname]);

  return (
    <>
      {/* Connection approval lives globally so dApp pairing can happen from any page */}
      <SessionApprovalDrawer
        open={!!pendingConnection}
        onOpenChange={() => { /* controlled by context (approve / reject) */ }}
      />
    </>
  );
}
