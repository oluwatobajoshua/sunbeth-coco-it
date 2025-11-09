const admin = require('firebase-admin');
const { createRemoteJWKSet, jwtVerify } = require('jose');

// Initialize Firebase Admin (only once)
if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const credentials = privateKey 
    ? {
        projectId: process.env.GCLOUD_PROJECT,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }
    : admin.credential.applicationDefault();

  admin.initializeApp({
    credential: admin.credential.cert(credentials),
  });
}

// Load config for MSAL validation
function getConfig() {
  const tenantId = process.env.MSAL_TENANT_ID;
  const clientId = process.env.MSAL_CLIENT_ID;
  const approleSuperAdmin = process.env.MSAL_APPROLE_SUPERADMIN;
  const approleAdmin = process.env.MSAL_APPROLE_ADMIN;
  const approleManager = process.env.MSAL_APPROLE_MANAGER;
  const bootstrapSuperEmail = process.env.BOOTSTRAP_SUPERADMIN_EMAIL;
  
  if (!tenantId || !clientId) {
    throw new Error('Missing MSAL configuration. Set MSAL_TENANT_ID and MSAL_CLIENT_ID');
  }
  
  const issuer = `https://login.microsoftonline.com/${tenantId}/v2.0`;
  const jwksUri = `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`;
  
  return { 
    tenantId, 
    clientId, 
    issuer, 
    jwksUri, 
    approleSuperAdmin, 
    approleAdmin, 
    approleManager, 
    bootstrapSuperEmail 
  };
}

async function verifyMicrosoftIdToken(idToken) {
  const { clientId, issuer, jwksUri } = getConfig();
  const JWKS = createRemoteJWKSet(new URL(jwksUri));
  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer,
    audience: clientId,
  });
  return payload;
}

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization || '';
    const bearer = authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : undefined;

    const idToken = req.body?.idToken || bearer;
    if (!idToken) {
      return res.status(400).json({ 
        error: 'Missing idToken (pass in Authorization: Bearer <idToken> or body.idToken)' 
      });
    }

    const cfg = getConfig();
    const claims = await verifyMicrosoftIdToken(idToken);
    const oid = claims.oid || claims.sub;
    const email = (claims.preferred_username || (claims.emails && claims.emails[0]) || '').toLowerCase();
    const name = claims.name || email || 'User';

    // Map Azure AD App Roles/Groups to app role
    const rolesClaim = Array.isArray(claims.roles) ? claims.roles : [];
    const groupsClaim = Array.isArray(claims.groups) ? claims.groups : [];
    const has = (arr, val) => !!val && arr.includes(val);

    let role = 'Viewer';
    if (has(rolesClaim, cfg.approleSuperAdmin) || has(groupsClaim, cfg.approleSuperAdmin)) {
      role = 'Super Admin';
    } else if (has(rolesClaim, cfg.approleAdmin) || has(groupsClaim, cfg.approleAdmin)) {
      role = 'Admin';
    } else if (has(rolesClaim, cfg.approleManager) || has(groupsClaim, cfg.approleManager)) {
      role = 'Station Manager';
    }

    // Fallback to Firestore user directory
    const db = admin.firestore();
    let stationId = null;
    if (email && role === 'Viewer') {
      const snap = await db.collection('users').where('email', '==', email).limit(1).get();
      if (!snap.empty) {
        const data = snap.docs[0].data();
        role = data.role || role;
        stationId = data.stationId || stationId;
      }
    }

    // Bootstrap override
    const normalize = (s) => String(s || '').trim().toLowerCase();
    if (cfg.bootstrapSuperEmail && normalize(cfg.bootstrapSuperEmail) === normalize(email)) {
      role = 'Super Admin';
    }

    const additionalClaims = {
      email,
      name,
      role,
      ...(stationId ? { stationId } : {}),
      provider: 'azure-ad',
    };

    // Ensure user directory record exists
    try {
      if (email) {
        const q = await db.collection('users').where('email', '==', email).limit(1).get();
        if (q.empty) {
          await db.collection('users').add({
            email,
            name,
            role,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }
    } catch (e) {
      console.warn('Failed to ensure users directory record:', e?.message || e);
    }

    const customToken = await admin.auth().createCustomToken(oid, additionalClaims);
    return res.status(200).json({ customToken });
  } catch (err) {
    console.error('Error in msal-custom-token:', err);
    return res.status(400).json({ error: err.message || 'Token verification failed' });
  }
};
