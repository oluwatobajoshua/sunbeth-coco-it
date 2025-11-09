/* Express API that uses MSAL (AAD) tokens for auth and Firebase Admin SDK for data. */
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { jwtVerify, createRemoteJWKSet } = require('jose');
const admin = require('firebase-admin');

// Load env
const PORT = process.env.API_PORT || 5055;
const TENANT_ID = process.env.REACT_APP_TENANT_ID || process.env.REACT_APP_MSAL_TENANT_ID;
const CLIENT_ID = process.env.REACT_APP_CLIENT_ID || process.env.REACT_APP_MSAL_CLIENT_ID;

if (!TENANT_ID || !CLIENT_ID) {
  // eslint-disable-next-line no-console
  console.warn('[API] Missing tenant/client env; set REACT_APP_TENANT_ID and REACT_APP_CLIENT_ID');
}

function initAdmin() {
  if (admin.apps.length) return;
  // Service account can be provided via GOOGLE_APPLICATION_CREDENTIALS (path) or *_B64
  const b64 = process.env.GOOGLE_APPLICATION_CREDENTIALS_B64;
  if (b64) {
    const creds = JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'));
    admin.initializeApp({ credential: admin.credential.cert(creds) });
  } else {
    admin.initializeApp();
  }
}
initAdmin();

const db = admin.firestore();

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Local uploads (when Firebase Storage isn't available)
const UPLOAD_DIR = path.join(__dirname, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const storageLocal = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
      const issueId = req.params.issueId || 'misc';
      const ts = Date.now();
      const safe = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_');
      cb(null, `${issueId}_${ts}_${safe}`);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    if ((file.mimetype || '').startsWith('image/')) return cb(null, true);
    cb(new Error('Only image uploads are allowed'));
  }
});
// Serve uploaded files
app.use('/uploads', express.static(UPLOAD_DIR));

// MSAL token verification
const jwks = TENANT_ID ? createRemoteJWKSet(new URL(`https://login.microsoftonline.com/${TENANT_ID}/discovery/v2.0/keys`)) : null;
async function verifyToken(authHeader) {
  if (!authHeader) throw new Error('Missing Authorization');
  const [type, token] = authHeader.split(' ');
  if (type !== 'Bearer' || !token) throw new Error('Invalid Authorization');
  if (!jwks) throw new Error('Missing JWKS');
  const { payload } = await jwtVerify(token, jwks, {
    issuer: `https://login.microsoftonline.com/${TENANT_ID}/v2.0`,
    audience: CLIENT_ID,
  });
  return payload;
}

function getEmailFromPayload(p) {
  return (p.email || p.preferred_username || p.upn || '').toLowerCase();
}

// Helpers
function generateIssueId() {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 900) + 100;
  return `COCO-${year}-${String(rand).padStart(3, '0')}`;
}

async function createInitialEscalation(issue) {
  try {
    const sref = db.collection('settings').doc('escalation');
    const snap = await sref.get();
    if (!snap.exists) return null;
    const settings = snap.data();
    if (!settings.enabled) return null;
    const targets = Array.isArray(settings.targets) ? settings.targets : [];
    const channels = settings.channels || { email: true };
    const activeChannels = Object.entries(channels).filter(([, v]) => !!v).map(([k]) => k);
    if (!targets.length || !activeChannels.length) return null;
    const rec = {
      issueId: issue.id,
      stationId: issue.stationId,
      priority: issue.priority,
      status: 'scheduled',
      level: 1,
      targets,
      channels: activeChannels,
      policy: settings.policy || {},
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await db.collection('escalations').add(rec);
    return rec;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[API] Escalation create failed', e.message || e);
    return null;
  }
}

// Routes
app.get('/api/health', async (req, res) => {
  try {
    const payload = await verifyToken(req.headers.authorization || '');
    const email = getEmailFromPayload(payload);
    res.json({ ok: true, email });
  } catch (e) {
    res.status(401).json({ ok: false, error: e.message || e });
  }
});

// Lightweight local image upload (no MSAL required for local dev)
// POST /upload/issue/:issueId  form-data field: file
app.post('/upload/issue/:issueId', storageLocal.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file received' });
    const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.json({ url, fileName: req.file.originalname, size: req.file.size });
  } catch (e) {
    res.status(500).json({ error: e.message || e });
  }
});

app.get('/api/stations', async (req, res) => {
  try {
    await verifyToken(req.headers.authorization || '');
    const snap = await db.collection('stations').orderBy('name').get();
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ items: list });
  } catch (e) {
    res.status(401).json({ error: e.message || e });
  }
});

app.get('/api/issueTypes', async (req, res) => {
  try {
    await verifyToken(req.headers.authorization || '');
    const snap = await db.collection('issueTypes').orderBy('label').get();
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ items: list });
  } catch (e) {
    res.status(401).json({ error: e.message || e });
  }
});

app.post('/api/issues', async (req, res) => {
  try {
    const payload = await verifyToken(req.headers.authorization || '');
    const email = getEmailFromPayload(payload);
    const name = payload.name || payload.given_name || email;
    const data = req.body || {};
    const issueId = generateIssueId();

    const SLA_BY_PRIORITY = { low: 72, medium: 24, high: 4 };
    const slaHours = SLA_BY_PRIORITY[data.priority] || 24;
    const dueAt = new Date(Date.now() + slaHours * 3600 * 1000);

    const issue = {
      id: issueId,
      stationId: data.stationId,
      issueType: data.issueType,
      description: data.description,
      priority: data.priority,
      reporterId: email,
      reporterName: name,
      photos: [],
      status: 'reported',
      sla: { hours: slaHours, dueAt },
      escalationLevel: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection('issues').add(issue);

    // Optional: notification record
    try {
      await db.collection('notifications').add({
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        channel: 'email',
        target: 'engineering@cocostation.com',
        subject: `New Issue Reported: ${issue.issueType} at ${issue.stationId}`,
        payload: {
          id: issue.id,
          station: issue.stationId,
          type: issue.issueType,
          priority: issue.priority,
          description: issue.description,
          reporter: issue.reporterName,
        },
        issueId: issue.id,
        stationId: issue.stationId,
        priority: issue.priority,
      });
    } catch (_) {}

    if (issue.priority === 'high') {
      createInitialEscalation(issue).catch(()=>{});
    }

    res.json({ id: issueId });
  } catch (e) {
    res.status(401).json({ error: e.message || e });
  }
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[API] MSAL-only API listening on http://localhost:${PORT}`);
});
