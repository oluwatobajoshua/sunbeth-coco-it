const express = require('express');
const admin = require('firebase-admin');
const crypto = require('crypto');

const router = express.Router();

// Use global fetch in Node 18+; fall back to dynamic import for older versions
const fetchSafe = global.fetch ? global.fetch.bind(global) : (...args) => import('node-fetch').then(({ default: f }) => f(...args));

// Utility to generate a random token and its sha256 hash
function makeToken() {
  const token = crypto.randomBytes(24).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  return { token, tokenHash };
}

function getBackendBase() {
  const port = process.env.PORT || 3001;
  const host = process.env.BACKEND_HOST || 'localhost';
  return `http://${host}:${port}`;
}

/**
 * POST /api/approvals/create
 * Create approval request doc and send a Teams card with Approve/Reject links
 */
router.post('/create', async (req, res) => {
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

    // Optionally send Teams card
    if (webhook) {
      const base = getBackendBase();
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
        await fetchSafe(webhook, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify(payload) 
        });
      } catch (e) {
        console.error('Teams webhook failed', e);
      }
    }

    res.status(200).json({ id: approvalRef.id, status: 'pending' });
  } catch (err) {
    console.error('Error in create approval:', err);
    res.status(400).json({ error: err.message || 'Failed to create approval request' });
  }
});

/**
 * GET /api/approvals/decision
 * Handle Approve/Reject from Teams link. Responds with a minimal HTML page.
 */
router.get('/decision', async (req, res) => {
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

    res.status(200).send(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Approval ${approved ? 'Approved' : 'Rejected'}</title></head><body style="font-family:Segoe UI,Arial,sans-serif;padding:24px"><h2>Approval ${approved ? 'Approved' : 'Rejected'}</h2><p>Issue ${data.issueId} has been ${approved ? 'approved for closure' : 'rejected'}.</p></body></html>`);
  } catch (err) {
    console.error('Error in approval decision:', err);
    res.status(500).send('An error occurred.');
  }
});

module.exports = router;
