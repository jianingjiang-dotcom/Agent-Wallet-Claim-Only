// wc-storage — local storage helpers for WalletConnect UX state
// Currently only tracks onboarding completion.

const KEY_ONBOARDING_DONE = 'wc:onboarding-done';

export function isOnboardingDone(): boolean {
  try {
    return localStorage.getItem(KEY_ONBOARDING_DONE) === 'true';
  } catch {
    return false;
  }
}

export function markOnboardingDone() {
  try {
    localStorage.setItem(KEY_ONBOARDING_DONE, 'true');
  } catch { /* ignore */ }
}

export function resetOnboardingForDemo() {
  try {
    localStorage.removeItem(KEY_ONBOARDING_DONE);
  } catch { /* ignore */ }
}
