const admin = require('firebase-admin');
const crypto = require('crypto');

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).send('Method not allowed');
  }

  try {
    const { id, decision, token } = req.query || {};
    
    if (!id || !decision || !token) {
      return res.status(400).send('Missing parameters');
    }
    
    const db = admin.firestore();
    const ref = db.collection('approvals').doc(String(id));
    const snap = await ref.get();
    
    if (!snap.exists) {
      return res.status(404).send('Approval not found');
    }
    
    const data = snap.data();
    if (data.status !== 'pending') {
      return res.status(200).send('This approval is already completed.');
    }
    
    const tokenHash = crypto.createHash('sha256').update(String(token)).digest('hex');
    if (tokenHash !== data.tokenHash) {
      return res.status(403).send('Invalid token');
    }

    const approved = String(decision).toLowerCase() === 'approve';

    // Update approval and issue
    await ref.update({ 
      status: approved ? 'approved' : 'rejected', 
      decidedAt: admin.firestore.FieldValue.serverTimestamp(), 
      decidedBy: 'teams-link' 
    });

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

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Approval ${approved ? 'Approved' : 'Rejected'}</title></head><body style="font-family:Segoe UI,Arial,sans-serif;padding:24px"><h2>Approval ${approved ? 'Approved' : 'Rejected'}</h2><p>Issue ${data.issueId} has been ${approved ? 'approved for closure' : 'rejected'}.</p></body></html>`;
    
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(html);
  } catch (err) {
    console.error('Error in approval decision:', err);
    return res.status(500).send('An error occurred.');
  }
};
