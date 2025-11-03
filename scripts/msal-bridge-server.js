#!/usr/bin/env node
/*
  Local MSAL→Firebase Auth bridge server (DEV/DEMO)
  - Verifies a Microsoft ID token and mints a Firebase custom token
  - Requires a Firebase service account (GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_JSON/_BASE64)
  - Reads MSAL tenant/client from env: REACT_APP_MSAL_TENANT_ID and REACT_APP_MSAL_CLIENT_ID
  - Start: npm run bridge:start
  - Endpoint: POST http://localhost:5050/msalCustomToken  { idToken }
*/

const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const { createRemoteJWKSet, jwtVerify } = require('jose');

function initAdmin() {
  if (admin.apps.length) return;
  // Try GOOGLE_APPLICATION_CREDENTIALS or env JSON
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const keyObj = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    admin.initializeApp({ credential: admin.credential.cert(keyObj) });
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
    const keyObj = JSON.parse(decoded);
    admin.initializeApp({ credential: admin.credential.cert(keyObj) });
  } else {
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
  }
}

function getConfig() {
  const tenantId = process.env.REACT_APP_MSAL_TENANT_ID;
  const clientId = process.env.REACT_APP_MSAL_CLIENT_ID;
  if (!tenantId || !clientId) {
    throw new Error('Missing REACT_APP_MSAL_TENANT_ID or REACT_APP_MSAL_CLIENT_ID');
  }
  const issuer = `https://login.microsoftonline.com/${tenantId}/v2.0`;
  const jwksUri = `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`;
  return { tenantId, clientId, issuer, jwksUri };
}

async function verifyMicrosoftIdToken(idToken) {
  const { clientId, issuer, jwksUri } = getConfig();
  const JWKS = createRemoteJWKSet(new URL(jwksUri));
  const { payload } = await jwtVerify(idToken, JWKS, { issuer, audience: clientId });
  return payload;
}

async function main() {
  initAdmin();
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => res.status(200).send('ok'));

  app.post('/msalCustomToken', async (req, res) => {
    try {
      const authHeader = req.headers.authorization || '';
      const bearer = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
      const idToken = req.body?.idToken || bearer;
      if (!idToken) return res.status(400).json({ error: 'Missing idToken' });

      const claims = await verifyMicrosoftIdToken(idToken);
      const oid = claims.oid || claims.sub;
      const email = (claims.preferred_username || (claims.emails && claims.emails[0]) || '').toLowerCase();
      const name = claims.name || email || 'User';

      const db = admin.firestore();
      let role = 'Viewer';
      let stationId = null;
      if (email) {
        const snap = await db.collection('users').where('email', '==', email).limit(1).get();
        if (!snap.empty) {
          const data = snap.docs[0].data();
          role = data.role || role;
          stationId = data.stationId || stationId;
        }
      }

      const additionalClaims = {
        email,
        name,
        role,
        ...(stationId ? { stationId } : {}),
        provider: 'azure-ad',
      };

      const customToken = await admin.auth().createCustomToken(oid, additionalClaims);
      res.status(200).json({ customToken });
    } catch (e) {
      console.error(e);
      res.status(400).json({ error: e.message || 'Verification failed' });
    }
  });

  const port = process.env.PORT || 5050;
  app.listen(port, () => console.log(`MSAL bridge listening on http://localhost:${port}`));
}

main().catch(err => { console.error(err); process.exit(1); });
