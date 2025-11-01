import { PublicClientApplication } from '@azure/msal-browser';

const clientId = process.env.REACT_APP_MSAL_CLIENT_ID || process.env.REACT_APP_CLIENT_ID;
const tenantId = process.env.REACT_APP_MSAL_TENANT_ID || process.env.REACT_APP_TENANT_ID;

export const msalConfig = {
  auth: {
    clientId: clientId || 'YOUR_CLIENT_ID',
    authority: tenantId ? `https://login.microsoftonline.com/${tenantId}` : 'https://login.microsoftonline.com/common',
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  }
};

export const msalInstance = new PublicClientApplication(msalConfig);
