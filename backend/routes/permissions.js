const express = require('express');
const admin = require('firebase-admin');

const router = express.Router();

/**
 * POST /api/permissions/recompute
 * Recompute users/{uid}.effectivePerms based on roles collection and each user's roles[]
 * Guard: requires a valid Firebase ID token with role Admin or Super Admin
 */
router.post('/recompute', async (req, res) => {
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

    res.status(200).json({ 
      updated, 
      dryRun: !!dryRun, 
      scoped: !!uid 
    });
  } catch (err) {
    console.error('Error in recompute permissions:', err);
    res.status(500).json({ error: err.message || 'Failed to recompute' });
  }
});

module.exports = router;
