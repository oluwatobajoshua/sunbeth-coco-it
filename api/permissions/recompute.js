const admin = require('firebase-admin');

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
    
    if (!bearer) {
      return res.status(401).json({ error: 'Missing Authorization: Bearer <idToken>' });
    }

    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(bearer);
    } catch (e) {
      return res.status(401).json({ error: 'Invalid ID token' });
    }
    
    const actorRole = decoded.role || decoded.claims?.role || null;
    const allow = actorRole === 'Admin' || actorRole === 'Super Admin';
    
    if (!allow) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { uid = null, dryRun = false } = req.body || {};
    const db = admin.firestore();

    // Load roles catalog
    const rolesSnap = await db.collection('roles').get();
    const roles = {};
    rolesSnap.forEach(d => { 
      roles[d.id] = d.data(); 
    });

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
        Object.keys(p).forEach(k => { 
          if (p[k]) perms[k] = true; 
        });
        (r.inherits || []).forEach(visit);
      };
      (selected || []).forEach(visit);
      return perms;
    };

    const targetUsers = [];
    if (uid) {
      const ref = db.collection('users').doc(String(uid));
      const snap = await ref.get();
      if (!snap.exists) {
        return res.status(404).json({ error: 'User not found' });
      }
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
        await u.ref.set({ 
          effectivePerms: eff, 
          updatedAt: admin.firestore.FieldValue.serverTimestamp() 
        }, { merge: true });
      }
      updated += 1;
    }

    return res.status(200).json({ 
      updated, 
      dryRun: !!dryRun, 
      scoped: !!uid 
    });
  } catch (err) {
    console.error('Error in recompute permissions:', err);
    return res.status(500).json({ error: err.message || 'Failed to recompute' });
  }
};
