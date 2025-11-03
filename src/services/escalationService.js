import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

// Minimal escalation record creator
// Called on create for high-priority issues; settings are admin-managed under settings/escalation
export async function createInitialEscalation(issue) {
  try {
    // Read escalation settings (required)
    const sref = doc(db, 'settings', 'escalation');
    const snap = await getDoc(sref);
    if (!snap.exists()) {
      console.warn('Escalation settings missing; skipping escalation record');
      return null;
    }
    const settings = snap.data();
    if (!settings.enabled) {
      return null; // disabled by admin
    }

    const targets = Array.isArray(settings.targets) ? settings.targets : [];
    const policy = settings.policy || { };
    const channels = settings.channels || { email: true };
    const activeChannels = Object.entries(channels).filter(([,v])=>!!v).map(([k])=>k);
    if (targets.length === 0 || activeChannels.length === 0) {
      console.warn('Escalation targets or channels not configured; skipping');
      return null;
    }

    const rec = {
      issueId: issue.id,
      stationId: issue.stationId,
      priority: issue.priority,
      status: 'scheduled',
      level: 1,
      targets,
      channels: activeChannels,
      policy,
      createdAt: serverTimestamp(),
    };
    await addDoc(collection(db, 'escalations'), rec);
    return rec;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('Failed to create escalation record', e?.message || e);
    return null;
  }
}
