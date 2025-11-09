import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth } from './firebase';
import { db } from './firebase';

// Minimal audit logging utility following ERP-style change tracking principles.
// Each log captures actor, action, entity, before/after snapshot and timestamp.
export const recordAudit = async ({ action, entityType, entityId, before = null, after = null, meta = {} }) => {
  try {
    const actor = auth.currentUser;
    const actorEmail = actor?.email || null;
    const actorUid = actor?.uid || null;
    await addDoc(collection(db, 'auditLogs'), {
      action,
      entityType,
      entityId,
      before,
      after,
      meta,
      actorEmail,
      actorUid,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[audit] failed to persist audit log:', e?.message || e);
  }
};

export const auditSettingsChange = async (key, before, after) => {
  return recordAudit({ action: 'update', entityType: 'settings', entityId: key, before, after });
};

export const auditIssueStatusChange = async (issueId, from, to) => {
  return recordAudit({ action: 'status_change', entityType: 'issue', entityId: issueId, before: { status: from }, after: { status: to } });
};

export const auditIssueClosed = async (issueId, note, photoUrl) => {
  return recordAudit({
    action: 'close',
    entityType: 'issue',
    entityId: issueId,
    before: null,
    after: { status: 'closed', note, photoUrl },
  });
};

export const auditApprovalRequested = async (issueId, note, photoUrl) => {
  return recordAudit({
    action: 'approval_requested',
    entityType: 'issue',
    entityId: issueId,
    before: null,
    after: { action: 'close', note, photoUrl },
  });
};

export const auditApprovalDecision = async (issueId, decision, decidedBy) => {
  return recordAudit({
    action: 'approval_decision',
    entityType: 'issue',
    entityId: issueId,
    before: { status: 'pending_approval' },
    after: { decision, decidedBy },
  });
};
