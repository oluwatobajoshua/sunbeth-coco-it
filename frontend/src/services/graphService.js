import { msalInstance } from '../auth/msal';

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';
const DEFAULT_SCOPES = ['User.Read', 'Mail.Send', 'offline_access', 'openid', 'profile', 'email'];

const toArray = (x) => Array.isArray(x) ? x : (x ? [x] : []);

const debug = String(process.env.REACT_APP_DEBUG_AUTH || 'false').toLowerCase() === 'true';

export const acquireGraphToken = async (scopes = DEFAULT_SCOPES) => {
  const allAccounts = msalInstance.getAllAccounts();
  const account = allAccounts[0];
  if (account) {
    const request = { account, scopes: scopes.length ? scopes : DEFAULT_SCOPES };
    try {
      const res = await msalInstance.acquireTokenSilent(request);
      if (debug) console.debug('[Graph] token via MSAL silent');
      return res.accessToken;
    } catch (silentErr) {
      // Fallback to interactive if silent fails (consent/expired)
      const res = await msalInstance.acquireTokenPopup(request);
      if (debug) console.debug('[Graph] token via MSAL popup');
      return res.accessToken;
    }
  }
  // Fallback: use Firebase Microsoft OAuth access token persisted on login
  try {
    const fallback = localStorage.getItem('ms_graph_access_token');
    if (fallback) { if (debug) console.debug('[Graph] token via Firebase OAuth fallback'); return fallback; }
  } catch (_) {}
  throw new Error('No Microsoft session available for Graph. Sign in with Microsoft.');
};

export const graphFetch = async (path, options = {}, scopes = DEFAULT_SCOPES) => {
  const token = await acquireGraphToken(scopes);
  const res = await fetch(`${GRAPH_BASE}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Graph API error ${res.status}: ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
};

export const getMe = async () => graphFetch('/me', { method: 'GET' }, DEFAULT_SCOPES);

export const sendMail = async ({ to, subject, html, saveToSentItems = true }) => {
  const recipients = toArray(to)
    .map(a => String(a || '').trim())
    .filter(Boolean)
    .map(address => ({ emailAddress: { address } }));
  if (!recipients.length) throw new Error('Missing recipient email(s)');
  const body = {
    message: {
      subject: subject || '(no subject)',
      body: { contentType: 'HTML', content: html || '' },
      toRecipients: recipients,
    },
    saveToSentItems: !!saveToSentItems,
  };
  await graphFetch('/me/sendMail', { method: 'POST', body: JSON.stringify(body) }, ['Mail.Send', 'offline_access']);
  return { sent: recipients.length };
};
