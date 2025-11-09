import { useEffect, useState, useCallback } from 'react';
import { useMsal } from '@azure/msal-react';
import { getUserByEmail } from '../services/adminService';
import { auth } from '../services/firebase';
import { signInWithCustomToken, signOut, signInAnonymously, onAuthStateChanged, GoogleAuthProvider, OAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
/* eslint-disable no-unused-vars */
import { msalConfig } from '../config';
import { toast } from 'react-hot-toast';
import { apiClient } from '../config/apiClient';

// Real auth hook using MSAL and Firestore-backed user directory
export const useAuth = () => {
  const isDebug = String(process.env.REACT_APP_DEBUG_AUTH || 'false').toLowerCase() === 'true';
  const debug = useCallback((...args) => { if (isDebug) { try { console.debug('[Auth]', ...args); } catch (_) {} } }, [isDebug]);
  const { instance, accounts } = useMsal();
  const account = accounts[0];
  const [profile, setProfile] = useState(null);
  const [fbUser, setFbUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const mockTest = (
    process.env.REACT_APP_TEST_AUTH === 'mock' ||
    (typeof window !== 'undefined' && (new URLSearchParams(window.location.search)).get('test') === 'mock') ||
    (typeof window !== 'undefined' && window.localStorage && localStorage.getItem('sunbeth-test-auth') === 'mock')
  );

  // Firebase auth state is the source of truth for authenticated UI
  useEffect(() => {
    let initialized = false;
    const unsub = onAuthStateChanged(auth, (u) => {
      debug('onAuthStateChanged:', { uid: u?.uid || null, email: u?.email || null, provider: u?.providerData?.[0]?.providerId });
      setFbUser(u);
      // mark ready on first resolution of Firebase auth state
      if (!initialized) {
        initialized = true;
        setAuthReady(true);
      }
    });
    return () => unsub();
  }, [debug]);

  // Complete redirect flow (Google or Microsoft) if a previous redirect was started
  useEffect(() => {
    // In Jest/Node or non-browser environments, skip redirect handling to avoid noisy warnings
    const isTestEnv = String(process.env.NODE_ENV).toLowerCase() === 'test';
    const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';
    if (isTestEnv || !isBrowser) return;

    (async () => {
      try {
        if (!auth.currentUser) {
          const res = await getRedirectResult(auth); // no-op if no pending redirect
          if (res) debug('getRedirectResult resolved:', { providerId: res?.providerId, user: res?.user?.email });
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('Redirect result error:', e?.message || e);
      }
    })();
    // Only on first mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Bridge MSAL -> Firebase (optional). Disabled by default on free tier projects without Cloud Functions.
  useEffect(() => {
    (async () => {
      try {
        const prefer = (process.env.REACT_APP_AUTH_PROVIDER || 'google').toLowerCase();
        const bridgeEnabled = String(process.env.REACT_APP_USE_MSAL_BRIDGE || 'false').toLowerCase() === 'true';
        // Only attempt bridge when explicitly enabled AND provider preference is msal.
        if (bridgeEnabled && prefer === 'msal' && account && !auth.currentUser) {
          debug('MSAL->Firebase bridge start');
          const response = await instance.acquireTokenSilent({
            account,
            scopes: ['openid', 'profile', 'email'],
            authority: msalConfig?.auth?.authority,
          });
          const idToken = response.idToken;
          if (idToken) {
            try {
              debug('Calling token bridge via API client');
              const { customToken } = await apiClient.getMsalCustomToken(idToken);
              if (customToken) {
                await signInWithCustomToken(auth, customToken);
              }
            } catch (err) {
              // eslint-disable-next-line no-console
              console.warn('Token bridge error:', err?.message || err);
            }
          }
          debug('MSAL->Firebase bridge end');
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('MSAL->Firebase bridge error:', e?.message || e);
      }
    })();
  }, [account, instance, debug]);

  // Build profile based on Firebase user state (works for Google, MSAL-bridged, or anon in dev)
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!authReady) return;

      // Optional anonymous fallback (opt-in). To avoid permission confusion,
      // this is disabled by default. Enable only by setting REACT_APP_ALLOW_ANON=true.
      try {
        const allowAnon = String(process.env.REACT_APP_ALLOW_ANON || 'false').toLowerCase() === 'true';
        if (!auth.currentUser && allowAnon) {
          await signInAnonymously(auth);
          // eslint-disable-next-line no-console
          console.log('[Auth] Anonymous fallback sign-in (dev)');
        }
      } catch (_) {}

  const fb = auth.currentUser;
  debug('Profile hydration start; fb user present?', !!fb);
      if (!fb) { if (mounted) setProfile(null); return; }

      // Claims
      let roleFromClaims = undefined;
      let stationFromClaims = undefined;
      let emailFromClaims = undefined;
      try {
        const tokenRes = await fb.getIdTokenResult(true);
        const claims = tokenRes?.claims || {};
        roleFromClaims = claims.role;
        stationFromClaims = claims.stationId;
        emailFromClaims = claims.email;
      } catch (_) {}

      const email = emailFromClaims || fb.email || 'unknown@local';
      const name = fb.displayName || email;

      // Directory hydration
      let dir = null;
      try {
        if (!mockTest) {
          const uid = fb.uid;
          if (uid) {
            const uref = doc(db, 'users', uid);
            const usnap = await getDoc(uref);
            if (usnap.exists()) {
              dir = usnap.data();
            } else {
              const payload = { email, name, role: 'Viewer', stationId: null, createdAt: new Date(), updatedAt: new Date() };
              await setDoc(uref, payload, { merge: true });
              dir = payload;
            }
            // If bootstrap super admin applies, persist it for convenience
            const bootstrapList = String(process.env.REACT_APP_BOOTSTRAP_SUPERADMIN_EMAIL || '')
              .split(/[;,]/)
              .map((s) => (s || '').trim().toLowerCase())
              .filter(Boolean);
            if (bootstrapList.includes((email || '').toLowerCase()) && (dir?.role !== 'Super Admin')) {
              try { await setDoc(uref, { role: 'Super Admin', updatedAt: new Date() }, { merge: true }); } catch (_) {}
              dir = { ...dir, role: 'Super Admin' };
            }
          } else {
            dir = await getUserByEmail(email);
          }
        }
      } catch (_) {}

      const normalizeEmail = (s) => (s || '')
        .trim()
        .replace(/^\s*["']?\s*(.*?)\s*["']?\s*;?\s*$/, '$1')
        .toLowerCase();
      // Support one or many bootstrap super admin emails (comma/semicolon separated)
      const bootstrapList = String(process.env.REACT_APP_BOOTSTRAP_SUPERADMIN_EMAIL || '')
        .split(/[;,]/)
        .map(normalizeEmail)
        .filter(Boolean);
      const isBootstrapSuper = bootstrapList.includes(normalizeEmail(email));
      const bootstrapRole = isBootstrapSuper ? 'Super Admin' : undefined;

      const user = {
        name,
        email,
        // Prefer claims, then bootstrap override, then directory role
        role: mockTest ? 'Super Admin' : (roleFromClaims || bootstrapRole || dir?.role || 'Viewer'),
        stationId: stationFromClaims || dir?.stationId || null,
      };
      debug('Resolved profile:', user);
      if (mounted) setProfile(user);
    })();
    return () => { mounted = false; };
  }, [authReady, fbUser, mockTest, debug]);

  const login = async (provider) => {
    try {
      const preferEnv = (process.env.REACT_APP_AUTH_PROVIDER || 'google').toLowerCase();
      const prefer = (provider || preferEnv || 'google').toLowerCase();
      if (prefer === 'google') {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        try {
          debug('Google login via popup');
          await signInWithPopup(auth, provider);
        } catch (err) {
          const code = err?.code || '';
          const recoverable = [
            'auth/popup-blocked',
            'auth/cancelled-popup-request',
            'auth/popup-closed-by-user',
            'auth/internal-error',
          ];
          if (code === 'auth/operation-not-allowed') {
            toast.error('Google sign-in is disabled for this Firebase project. Enable it in Firebase Console → Authentication → Sign-in method → Google.');
          }
          if (recoverable.some(c => code.includes(c.split('/')[1]))) {
            // Fallback to redirect flow for stricter browsers/environments
            debug('Google login fallback to redirect');
            await signInWithRedirect(auth, provider);
            return;
          }
          // Surface a friendly error for common configuration problems
          if (!code) {
            toast.error('Login failed. Check your browser popup settings or try again.');
          }
          throw err;
        }
      } else if (prefer === 'msal' || prefer === 'microsoft') {
        // Sign in with Firebase Microsoft provider (works with Firebase auth) and request Graph scopes.
        // Using Firebase's built-in "microsoft.com" OAuth provider avoids needing a custom token bridge.
        // Be sure to enable Microsoft provider in Firebase Console → Authentication → Sign-in method.
        const provider = new OAuthProvider('microsoft.com');
        const tenantId = process.env.REACT_APP_MSAL_TENANT_ID || process.env.REACT_APP_TENANT_ID;
        // Route to tenant-specific endpoint to avoid AADSTS50194 when the app is single-tenant
        if (tenantId) provider.setCustomParameters({ tenant: tenantId, prompt: 'select_account' });
        provider.addScope('openid');
        provider.addScope('profile');
        provider.addScope('email');
        provider.addScope('User.Read');
        provider.addScope('Mail.Send');
        try {
          const method = (typeof window !== 'undefined' && window.localStorage && localStorage.getItem('sunbeth:interactiveMode'))
            ? String(localStorage.getItem('sunbeth:interactiveMode')).toLowerCase()
            : (process.env.REACT_APP_MS_LOGIN_METHOD || 'popup').toLowerCase();
          if (method === 'redirect') {
            // preflight: verify sessionStorage works; if not, fall back to popup immediately
            let sessionOk = true;
            try { sessionStorage.setItem('fb_redirect_check', '1'); sessionStorage.removeItem('fb_redirect_check'); }
            catch (_) { sessionOk = false; }
            if (!sessionOk) {
              debug('Redirect preflight failed (sessionStorage). Falling back to popup.');
            } else {
              debug('Microsoft login via redirect', { tenantId });
              await signInWithRedirect(auth, provider);
              return; // flow will resume in getRedirectResult
            }
          }
          debug('Microsoft login via popup', { tenantId });
          const result = await signInWithPopup(auth, provider);
          // Persist access token for Graph fallback when MSAL account is not present
          const cred = OAuthProvider.credentialFromResult(result);
          const accessToken = cred?.accessToken;
          if (accessToken) {
            try { localStorage.setItem('ms_graph_access_token', accessToken); } catch (_) {}
          }
        } catch (err) {
          const code = err?.code || '';
          const recoverable = [
            'auth/popup-blocked',
            'auth/cancelled-popup-request',
          ];
          // Allow user-cancel silently
          if (code === 'auth/popup-closed-by-user') return;
          if (code === 'auth/operation-not-allowed') {
            toast.error('Microsoft sign-in is disabled for this Firebase project. Enable it in Firebase Console → Authentication → Sign-in method → Microsoft.');
            return;
          }
          if (recoverable.some(c => code.includes(c.split('/')[1]))) {
            debug('Microsoft login fallback to redirect', { tenantId });
            await signInWithRedirect(auth, provider);
            return;
          }
          // Other errors
          // eslint-disable-next-line no-console
          console.warn('Microsoft login failed:', err);
          throw err;
        }
      } else {
        // default to Google if unknown
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        await signInWithPopup(auth, provider);
      }
    } catch (e) {
      // MSAL throws a BrowserAuthError when the user cancels the login UI.
      // Silently handle user-cancelled flows by returning to the landing page
      // instead of letting an uncaught runtime error bubble up.
      const code = e?.errorCode || e?.name || '';
      const msg = String(e?.message || '').toLowerCase();
      if (code === 'user_cancelled' || msg.includes('user cancelled') || msg.includes('user cancel')) {
        // Silently stay on the landing page (unauthenticated view)
        return;
      }
      if ((e?.code || '').includes('auth/operation-not-allowed')) {
        toast.error('Google sign-in is disabled for this Firebase project. Enable it in Firebase Console → Authentication → Sign-in method → Google.');
        return;
      }
      // For other errors, surface minimally to console and rethrow so callers can handle if needed
      // (avoid unhandled promise rejection by rethrowing here only if desired)
      // eslint-disable-next-line no-console
      console.warn('Login failed:', e);
      throw e;
    }
  };

  const logout = async () => {
    try { await signOut(auth); } catch (_) {}
    try { await instance.logoutPopup(); } catch (e) {
      // ignore user-cancelled or popup failures on logout
      // eslint-disable-next-line no-console
      console.warn('Logout popup failed (ignored):', e?.message || e);
    }
    try { localStorage.removeItem('ms_graph_access_token'); } catch (_) {}
    try { localStorage.setItem('sunbeth:suppressAutoLogin', '1'); } catch (_) {}
  };

  return {
    user: profile,
    login,
    logout,
    isAuthenticated: mockTest || !!fbUser,
    isReady: authReady,
  };
};