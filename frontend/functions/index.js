const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });
const { createRemoteJWKSet, jwtVerify } = require('jose');
const crypto = require('crypto');
// Use global fetch in Node 18+; fall back to node-fetch when not available
const fetchSafe = global.fetch ? global.fetch.bind(global) : (...args) => import('node-fetch').then(({ default: f }) => f(...args));

admin.initializeApp();

// Load config for MSAL validation
function getConfig() {
  // Prefer Functions Config; fallback to env vars
  const cfg = functions.config && functions.config();
  const tenantId = (cfg?.msal && cfg.msal.tenant_id) || process.env.MSAL_TENANT_ID;
  const clientId = (cfg?.msal && cfg.msal.client_id) || process.env.MSAL_CLIENT_ID;
  const approleSuperAdmin = (cfg?.msal && cfg.msal.approle_superadmin) || process.env.MSAL_APPROLE_SUPERADMIN;
  const approleAdmin = (cfg?.msal && cfg.msal.approle_admin) || process.env.MSAL_APPROLE_ADMIN;
  const approleManager = (cfg?.msal && cfg.msal.approle_manager) || process.env.MSAL_APPROLE_MANAGER;
  const bootstrapSuperEmail = (cfg?.bootstrap && cfg.bootstrap.superadmin_email) || process.env.BOOTSTRAP_SUPERADMIN_EMAIL || process.env.REACT_APP_BOOTSTRAP_SUPERADMIN_EMAIL;
  if (!tenantId || !clientId) {
    throw new Error('Missing MSAL configuration. Set functions config: msal.tenant_id and msal.client_id');
  }
  const issuer = `https://login.microsoftonline.com/${tenantId}/v2.0`;
  const jwksUri = `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`;
  return { tenantId, clientId, issuer, jwksUri, approleSuperAdmin, approleAdmin, approleManager, bootstrapSuperEmail };
}

async function verifyMicrosoftIdToken(idToken) {
  const { clientId, issuer, jwksUri } = getConfig();
  const JWKS = createRemoteJWKSet(new URL(jwksUri));
  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer,
    audience: clientId,
  });
  // payload contains oid, tid, preferred_username or emails, name
  return payload;
}

exports.msalCustomToken = functions.region('us-central1').https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
      }

      const authHeader = req.headers.authorization || '';
      const bearer = authHeader.startsWith('Bearer ')
        ? authHeader.substring(7)
        : undefined;

      const idToken = req.body?.idToken || bearer;
      if (!idToken) {
        res.status(400).json({ error: 'Missing idToken (pass in Authorization: Bearer <idToken> or body.idToken)' });
        return;
      }

  const cfg = getConfig();
      const claims = await verifyMicrosoftIdToken(idToken);
      const oid = claims.oid || claims.sub; // stable per app
      const email = (claims.preferred_username || (claims.emails && claims.emails[0]) || '').toLowerCase();
      const name = claims.name || email || 'User';

      // Map Azure AD App Roles/Groups to app role
      const rolesClaim = Array.isArray(claims.roles) ? claims.roles : [];
      const groupsClaim = Array.isArray(claims.groups) ? claims.groups : [];
      const has = (arr, val) => !!val && arr.includes(val);

      let role = 'Viewer';
      if (has(rolesClaim, cfg.approle_superadmin) || has(groupsClaim, cfg.approle_superadmin)) {
        role = 'Super Admin';
      } else if (has(rolesClaim, cfg.approle_admin) || has(groupsClaim, cfg.approle_admin)) {
        role = 'Admin';
      } else if (has(rolesClaim, cfg.approle_manager) || has(groupsClaim, cfg.approle_manager)) {
        role = 'Station Manager';
      }

      // Fallback to Firestore user directory if no app role was resolved
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

      // Bootstrap override: allow configured email to be Super Admin during initial setup
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

      // Ensure a directory record exists for bootstrap accounts (optional convenience)
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
      res.status(200).json({ customToken });
    } catch (err) {
      console.error(err);
      res.status(400).json({ error: err.message || 'Token verification failed' });
    }
  });
});

// Utility to generate a random token and its sha256 hash
function makeToken() {
  const token = crypto.randomBytes(24).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  return { token, tokenHash };
}

function getFunctionsBase(projectId) {
  const region = 'us-central1';
  return `https://${region}-${projectId}.cloudfunctions.net`;
}

// Create approval request doc and send a Teams card with Approve/Reject links
exports.createApprovalRequest = functions.region('us-central1').https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
      }
      const { issueId, closureNote = null, closurePhotoUrl = null, requestedBy = null } = req.body || {};
      if (!issueId) {
        res.status(400).json({ error: 'Missing issueId' });
        return;
      }
      const db = admin.firestore();
      const appSnap = await db.collection('settings').doc('app').get();
      const appCfg = appSnap.exists ? appSnap.data() : {};
      const webhook = appCfg.approvalsTeamsWebhookUrl || null;
      const approverEmails = Array.isArray(appCfg.approverEmails) ? appCfg.approverEmails : [];
  // requireTwoPersonApproval flag is consumed by the frontend; server proceeds to create request regardless when invoked.

      // Create approval doc
      const { token, tokenHash } = makeToken();
      const approvalRef = await db.collection('approvals').add({
        issueId,
        action: 'close',
        status: 'pending',
        requestedBy,
        requestedAt: admin.firestore.FieldValue.serverTimestamp(),
        closureNote,
        closurePhotoUrl,
        approverEmails,
        tokenHash,
      });

      // Mark issue as pending_approval
      try {
        await db.collection('issues').doc(issueId).update({ status: 'pending_approval', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      } catch (e) {
        console.error('Failed to mark issue pending_approval', e.message);
      }

      // Optionally send Teams card
      if (webhook) {
        const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || admin.app().options.projectId;
        const base = getFunctionsBase(projectId);
        const approveUrl = `${base}/handleApprovalDecision?id=${approvalRef.id}&decision=approve&token=${token}`;
        const rejectUrl = `${base}/handleApprovalDecision?id=${approvalRef.id}&decision=reject&token=${token}`;

        const text = `Approval requested to CLOSE Issue ${issueId}${closureNote ? `\n\nNote: ${closureNote}` : ''}`;
        const payload = {
          type: 'message',
          attachments: [
            {
              contentType: 'application/vnd.microsoft.card.adaptive',
              contentUrl: null,
              content: {
                type: 'AdaptiveCard',
                version: '1.4',
                body: [
                  { type: 'TextBlock', text, wrap: true, weight: 'Bolder', size: 'Medium' },
                  ...(closurePhotoUrl ? [{ type: 'Image', url: closurePhotoUrl, size: 'Medium' }] : []),
                ],
                actions: [
                  { type: 'Action.OpenUrl', title: 'Approve', url: approveUrl },
                  { type: 'Action.OpenUrl', title: 'Reject', url: rejectUrl },
                ],
              },
            },
          ],
        };
        try {
          await fetchSafe(webhook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        } catch (e) {
          console.error('Teams webhook failed', e);
        }
      }

      res.status(200).json({ id: approvalRef.id, status: 'pending' });
    } catch (err) {
      console.error(err);
      res.status(400).json({ error: err.message || 'Failed to create approval request' });
    }
  });
});

// Handle Approve/Reject from Teams link. Responds with a minimal HTML page.
exports.handleApprovalDecision = functions.region('us-central1').https.onRequest(async (req, res) => {
  try {
    const { id, decision, token } = req.query || {};
    if (!id || !decision || !token) {
      res.status(400).send('Missing parameters');
      return;
    }
    const db = admin.firestore();
    const ref = db.collection('approvals').doc(String(id));
    const snap = await ref.get();
    if (!snap.exists) { res.status(404).send('Approval not found'); return; }
    const data = snap.data();
    if (data.status !== 'pending') { res.status(200).send('This approval is already completed.'); return; }
    const tokenHash = crypto.createHash('sha256').update(String(token)).digest('hex');
    if (tokenHash !== data.tokenHash) { res.status(403).send('Invalid token'); return; }

    const approved = String(decision).toLowerCase() === 'approve';

    // Update approval and issue
    await ref.update({ status: approved ? 'approved' : 'rejected', decidedAt: admin.firestore.FieldValue.serverTimestamp(), decidedBy: 'teams-link' });

    if (approved) {
      const issueRef = db.collection('issues').doc(data.issueId);
      await issueRef.update({
        status: 'closed',
        closedAt: admin.firestore.FieldValue.serverTimestamp(),
        closedBy: 'teams-approval',
        closureNote: data.closureNote || null,
        closurePhotoUrl: data.closurePhotoUrl || null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      // Fire audit log
      await db.collection('auditLogs').add({
        action: 'approval_decision',
        entityType: 'issue',
        entityId: data.issueId,
        before: { status: 'pending_approval' },
        after: { decision: 'approved', decidedBy: 'teams-link' },
        actorEmail: null,
        actorUid: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      await db.collection('auditLogs').add({
        action: 'approval_decision',
        entityType: 'issue',
        entityId: data.issueId,
        before: { status: 'pending_approval' },
        after: { decision: 'rejected', decidedBy: 'teams-link' },
        actorEmail: null,
        actorUid: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    res.status(200).send(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Approval ${approved ? 'Approved' : 'Rejected'}</title></head><body style="font-family:Segoe UI,Arial,sans-serif;padding:24px"><h2>Approval ${approved ? 'Approved' : 'Rejected'}</h2><p>Issue ${data.issueId} has been ${approved ? 'approved for closure' : 'rejected'}.</p></body></html>`);
  } catch (err) {
    console.error(err);
    res.status(500).send('An error occurred.');
  }
});

// Recompute users/{uid}.effectivePerms based on roles collection and each user's roles[]
// Guard: requires a valid Firebase ID token with role Admin or Super Admin
exports.recomputeEffectivePerms = functions.region('us-central1').https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

      const authHeader = req.headers.authorization || '';
      const bearer = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
      if (!bearer) { res.status(401).json({ error: 'Missing Authorization: Bearer <idToken>' }); return; }

      let decoded;
      try { decoded = await admin.auth().verifyIdToken(bearer); } catch (e) { res.status(401).json({ error: 'Invalid ID token' }); return; }
      const actorRole = decoded.role || decoded.claims?.role || null;
      const allow = actorRole === 'Admin' || actorRole === 'Super Admin';
      if (!allow) { res.status(403).json({ error: 'Forbidden' }); return; }

      const { uid = null, dryRun = false } = req.body || {};
      const db = admin.firestore();

      // Load roles catalog
      const rolesSnap = await db.collection('roles').get();
      const roles = {};
      rolesSnap.forEach(d => { roles[d.id] = d.data(); });

      // Helper to compute permissions with inheritance
      const compute = (selected) => {
        const seen = new Set();
        const perms = {};
        const visit = (key) => {
          if (!key || seen.has(key)) return;
          seen.add(key);
          const r = roles[key];
          if (!r) return;
          const p = r.permissions || {};
          Object.keys(p).forEach(k => { if (p[k]) perms[k] = true; });
          (r.inherits || []).forEach(visit);
        };
        (selected || []).forEach(visit);
        return perms;
      };

      const targetUsers = [];
      if (uid) {
        const ref = db.collection('users').doc(String(uid));
        const snap = await ref.get();
        if (!snap.exists) { res.status(404).json({ error: 'User not found' }); return; }
        targetUsers.push({ ref, data: snap.data() });
      } else {
        const snap = await db.collection('users').get();
        snap.forEach(d => targetUsers.push({ ref: d.ref, data: d.data() }));
      }

      let updated = 0;
      for (const u of targetUsers) {
        const rolesArr = Array.isArray(u.data.roles) ? u.data.roles : [];
        const eff = compute(rolesArr);
        if (!dryRun) {
          await u.ref.set({ effectivePerms: eff, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        }
        updated += 1;
      }

      res.status(200).json({ updated, dryRun: !!dryRun, scoped: !!uid });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message || 'Failed to recompute' });
    }
  });
});
