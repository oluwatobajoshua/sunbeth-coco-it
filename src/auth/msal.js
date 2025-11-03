import { LogLevel, PublicClientApplication } from '@azure/msal-browser';

const clientId = process.env.REACT_APP_MSAL_CLIENT_ID || process.env.REACT_APP_CLIENT_ID;
const tenantId = process.env.REACT_APP_MSAL_TENANT_ID || process.env.REACT_APP_TENANT_ID;

const debugAuth = String(process.env.REACT_APP_DEBUG_AUTH || 'false').toLowerCase() === 'true';

export const msalConfig = {
  auth: {
    clientId: clientId || 'YOUR_CLIENT_ID',
    authority: tenantId ? `https://login.microsoftonline.com/${tenantId}` : 'https://login.microsoftonline.com/common',
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  },
  system: debugAuth ? {
    loggerOptions: {
      logLevel: LogLevel.Verbose,
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        // eslint-disable-next-line no-console
        console.debug(`[MSAL] ${message}`);
      }
    }
  } : undefined
};

function canUseBrowserCrypto() {
  try {
    return typeof window !== 'undefined' && (window.crypto?.subtle || window.msCrypto);
  } catch (_) { return false; }
}

let msalInstance;
if (process.env.NODE_ENV === 'test' || !canUseBrowserCrypto()) {
  // Lightweight stub for Jest/SSR environments without WebCrypto.
  msalInstance = {
    acquireTokenSilent: async () => { throw new Error('MSAL disabled in test/SSR environment'); },
    loginPopup: async () => { throw new Error('MSAL disabled in test/SSR environment'); },
    loginRedirect: async () => { throw new Error('MSAL disabled in test/SSR environment'); },
    getActiveAccount: () => null,
    setActiveAccount: () => {},
  };
} else {
  msalInstance = new PublicClientApplication(msalConfig);
}

export { msalInstance };
