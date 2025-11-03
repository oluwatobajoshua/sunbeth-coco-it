import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  serverTimestamp 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import { uploadIssuePhoto } from './storageAdapter';
import { doc, getDoc, setDoc, addDoc } from 'firebase/firestore';
import { buildIssueReportedEmail } from '../utils/emailTemplates';
import * as graph from './graphService';

// Generate issue ID
export const generateIssueId = () => {
  const year = new Date().getFullYear();
  const randomNum = Math.floor(Math.random() * 900) + 100;
  return `COCO-${year}-${randomNum.toString().padStart(3, '0')}`;
};

// Upload photos using adapter by default; only use Firebase Storage when explicitly requested
export const uploadPhotos = async (issueId, photos) => {
  // Prefer adapter (inline/local) unless explicitly set to 'firebase'
  const mode = (process.env.REACT_APP_STORAGE_MODE || 'inline').toLowerCase();
  if (mode !== 'firebase') {
    const out = [];
    for (let i = 0; i < photos.length; i++) {
      try {
        const res = await uploadIssuePhoto(issueId, photos[i].file, i);
        if (res?.url) out.push({ url: res.url, fileName: photos[i].file.name, size: photos[i].file.size });
      } catch (e) {
        console.warn('Local/inline photo upload failed:', e?.message || e);
      }
    }
    return out;
  }

  // Default: Firebase Storage
  const photoUrls = [];
  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    const fileName = `issues/${issueId}/photo_${i + 1}_${Date.now()}.jpg`;
    const storageRef = ref(storage, fileName);
    try {
      const snapshot = await uploadBytes(storageRef, photo.file);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      photoUrls.push({ url: downloadUrl, fileName: photo.file.name, size: photo.file.size });
    } catch (error) {
      console.error('Error uploading photo:', error);
    }
  }
  return photoUrls;
};

// Create new issue
export const createIssue = async (issueData, photos = []) => {
  try {
    const issueId = generateIssueId();
    
    // Upload photos first
    let photoUrls = [];
    if (photos.length > 0) {
      photoUrls = await uploadPhotos(issueId, photos);
    }
    
    // Prepare issue document
    // SLA and escalation scaffolding (load from settings/app if present)
    let slaHours = 24;
    try {
      const settingsSnap = await getDoc(doc(db, 'settings', 'app'));
      if (settingsSnap.exists()) {
        const s = settingsSnap.data();
        const sla = s.slaByPriority || { low: 72, medium: 24, high: 4 };
        slaHours = sla[issueData.priority] || 24;
      }
    } catch (_) {
      // fallback to defaults
      const SLA_BY_PRIORITY = { low: 72, medium: 24, high: 4 };
      slaHours = SLA_BY_PRIORITY[issueData.priority] || 24;
    }
    const dueAt = new Date(Date.now() + slaHours * 3600 * 1000);

    // Helper to normalize and dedupe emails
    const norm = (arr) => Array.from(new Set((arr || []).map(e => String(e || '').trim().toLowerCase()).filter(Boolean)));
    // Resolve emails for users having any of the given roles
    const resolveRoleEmails = async (roleIds) => {
      const roles = Array.isArray(roleIds) ? roleIds.filter(Boolean) : [];
      if (!roles.length) return [];
      try {
        const uq = query(collection(db, 'users'), where('roles', 'array-contains-any', roles), limit(50));
        const snap = await getDocs(uq);
        const emails = [];
        snap.forEach(d => {
          const u = d.data();
          const em = (u.email || u.id || '').toString();
          if (em) emails.push(em);
        });
        return norm(emails);
      } catch (_) {
        return [];
      }
    };

    // Load Issue Type routing (assignees + cc by email and by role)
    let assignedTo = [];
    let cc = [];
    try {
      const col = collection(db, 'issueTypes');
      const q = query(col, where('key', '==', issueData.issueType), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const cfg = snap.docs[0].data();
        const at = Array.isArray(cfg.assignedToEmails) ? cfg.assignedToEmails : [];
        const ccE = Array.isArray(cfg.ccEmails) ? cfg.ccEmails : [];
        const atRoles = Array.isArray(cfg.assignedToRoles) ? cfg.assignedToRoles : [];
        const ccRoles = Array.isArray(cfg.ccRoles) ? cfg.ccRoles : [];
        const roleAT = await resolveRoleEmails(atRoles);
        const roleCC = await resolveRoleEmails(ccRoles);
        assignedTo = norm([...(at || []), ...roleAT]);
        cc = norm([...(ccE || []), ...roleCC]);
      }
    } catch (_) {}

    const issue = {
      id: issueId,
      ...issueData,
      photos: photoUrls,
      status: 'reported',
      assignedTo,
      cc,
      sla: { hours: slaHours, dueAt },
      escalationLevel: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
  // Save to Firestore using deterministic document ID for ERP-style traceability
  await setDoc(doc(db, 'issues', issueId), issue);
    
    return issueId;
  } catch (error) {
    console.error('Error creating issue:', error);
    throw error;
  }
};

// Get recent issues for a user
export const getRecentIssues = async (userEmail, limitCount = 5, stationId) => {
  try {
    const constraints = [
      where('reporterId', '==', userEmail),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    ];
    if (stationId) {
      constraints.unshift(where('stationId', '==', stationId));
    }
    const q = query(collection(db, 'issues'), ...constraints);
    
    const querySnapshot = await getDocs(q);
    const issues = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      issues.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate()
      });
    });
    
    return issues;
  } catch (error) {
    console.error('Error getting recent issues:', error);
    return [];
  }
};

// Send notifications (placeholder for Microsoft Graph integration)
export const sendNotifications = async (issueData) => {
  console.log('Sending notifications for issue:', issueData.id);

  // Load admin-managed notification toggles from settings/app
  let emailEnabled = true, smsEnabled = false, teamsEnabled = false;
  let notificationEmails = ['engineering@cocostation.com'];
  try {
    const settingsSnap = await getDoc(doc(db, 'settings', 'app'));
    if (settingsSnap.exists()) {
      const s = settingsSnap.data();
      emailEnabled = s.emailNotifications ?? emailEnabled;
      smsEnabled = s.smsNotifications ?? smsEnabled;
      teamsEnabled = s.teamsNotifications ?? teamsEnabled;
      notificationEmails = Array.isArray(s.notificationEmails) && s.notificationEmails.length
        ? s.notificationEmails
        : notificationEmails;
    }
  } catch (_) {
    // fallback to defaults
  }

  const { subject, html, text: summary } = buildIssueReportedEmail(issueData, {
    companyName: (process.env.REACT_APP_COMPANY_NAME || 'Sunbeth Energies'),
    brandLogoUrl: process.env.REACT_APP_BRAND_LOGO_URL || null,
    appUrl: process.env.REACT_APP_APP_URL || ''
  });

  // Helpers
  const norm = (arr) => Array.from(new Set((arr || []).map(e => String(e || '').trim().toLowerCase()).filter(Boolean)));
  const resolveRoleEmails = async (roleIds) => {
    const roles = Array.isArray(roleIds) ? roleIds.filter(Boolean) : [];
    if (!roles.length) return [];
    try {
      const uq = query(collection(db, 'users'), where('roles', 'array-contains-any', roles), limit(50));
      const snap = await getDocs(uq);
      const emails = [];
      snap.forEach(d => {
        const u = d.data();
        const em = (u.email || u.id || '').toString();
        if (em) emails.push(em);
      });
      return norm(emails);
    } catch (_) {
      return [];
    }
  };

  // Load Issue Type routing to include assignees and CC (emails + roles)
  let assignedTo = [];
  let cc = [];
  try {
    const col = collection(db, 'issueTypes');
    const q = query(col, where('key', '==', issueData.issueType), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const cfg = snap.docs[0].data();
      const roleAT = await resolveRoleEmails(cfg.assignedToRoles || []);
      const roleCC = await resolveRoleEmails(cfg.ccRoles || []);
      assignedTo = norm([...(cfg.assignedToEmails || []), ...roleAT]);
      cc = norm([...(cfg.ccEmails || []), ...roleCC]);
    }
  } catch (_) {}

  // Final recipients: settings notification emails + assignees + cc (dedup)
  const recipients = Array.from(new Set([...(notificationEmails || []), ...assignedTo, ...cc].map(e => String(e || '').trim().toLowerCase()).filter(Boolean)));

  const records = [];
  if (emailEnabled) {
    for (const to of recipients) {
      const emailData = { to, subject, text: summary, html };
      records.push({ channel: 'email', target: to, subject, payload: emailData });
    }
    // Attempt real delivery via Microsoft Graph as the signed-in user
    try {
      for (const to of recipients) {
        try { await graph.sendMail({ to, subject, html }); } catch (e) { console.warn('Graph sendMail failed for', to, e?.message || e); }
      }
    } catch (_) { /* non-fatal */ }
  }
  if (smsEnabled) {
    // Placeholder until SMS integration is wired
    const smsData = { to: 'sms:configured', body: summary };
    records.push({ channel: 'sms', target: smsData.to, subject, payload: smsData });
  }
  if (teamsEnabled) {
    // Placeholder until Teams integration is wired
    const teamsData = { webhook: 'teams:configured', text: summary };
    records.push({ channel: 'teams', target: teamsData.webhook, subject, payload: teamsData });
  }

  // Persist audit records
  for (const rec of records) {
    try {
      await addDoc(collection(db, 'notifications'), {
        createdAt: serverTimestamp(),
        channel: rec.channel,
        target: rec.target,
        subject: rec.subject,
        payload: rec.payload,
        issueId: issueData.id,
        stationId: issueData.stationId,
        priority: issueData.priority,
        assignedTo,
        cc,
      });
    } catch (e) {
      console.warn('Failed to persist notification record', rec.channel, e?.message || e);
    }
  }

  return records;
};