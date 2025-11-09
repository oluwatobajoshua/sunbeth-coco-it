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

// Utility to generate a random token and its sha256 hash
function makeToken() {
  const token = crypto.randomBytes(24).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  return { token, tokenHash };
}

function getBackendBase(req) {
  const host = req.headers.host || 'localhost:3000';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  return `${protocol}://${host}`;
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
    const { issueId, closureNote = null, closurePhotoUrl = null, requestedBy = null } = req.body || {};
    
    if (!issueId) {
      return res.status(400).json({ error: 'Missing issueId' });
    }
    
    const db = admin.firestore();
    const appSnap = await db.collection('settings').doc('app').get();
    const appCfg = appSnap.exists ? appSnap.data() : {};
    const webhook = appCfg.approvalsTeamsWebhookUrl || null;
    const approverEmails = Array.isArray(appCfg.approverEmails) ? appCfg.approverEmails : [];

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
      await db.collection('issues').doc(issueId).update({ 
        status: 'pending_approval', 
        updatedAt: admin.firestore.FieldValue.serverTimestamp() 
      });
    } catch (e) {
      console.error('Failed to mark issue pending_approval', e.message);
    }

    // Send Teams card
    if (webhook) {
      const base = getBackendBase(req);
      const approveUrl = `${base}/api/approvals/decision?id=${approvalRef.id}&decision=approve&token=${token}`;
      const rejectUrl = `${base}/api/approvals/decision?id=${approvalRef.id}&decision=reject&token=${token}`;

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
        await fetch(webhook, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify(payload) 
        });
      } catch (e) {
        console.error('Teams webhook failed', e);
      }
    }

    return res.status(200).json({ id: approvalRef.id, status: 'pending' });
  } catch (err) {
    console.error('Error in create approval:', err);
    return res.status(400).json({ error: err.message || 'Failed to create approval request' });
  }
};
