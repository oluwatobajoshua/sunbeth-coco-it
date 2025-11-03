import { db, storage } from './firebase';
import { wrapPermissionDenied } from '../utils/errors';
import {
  collection, getDocs, addDoc, setDoc, doc, updateDoc, deleteDoc,
  serverTimestamp, query, orderBy, getDoc
} from 'firebase/firestore';
import { getDocs as getDocsCompat, startAfter, where, limit as qLimit } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auditSettingsChange, auditIssueStatusChange, auditIssueClosed, auditApprovalRequested } from './auditService';

// Generic helpers
const listCollection = async (path, orderByField) => wrapPermissionDenied({
  operation: 'read',
  collection: path,
  path,
  fn: async () => {
    const col = collection(db, path);
    const q = orderByField ? query(col, orderBy(orderByField, 'asc')) : col;
    const snap = await getDocs(q);
    const items = [];
    snap.forEach(d => items.push({ id: d.id, ...d.data() }));
    return items;
  }
});

const createInCollection = async (path, data) => wrapPermissionDenied({
  operation: 'create',
  collection: path,
  path,
  fn: async () => {
    const col = collection(db, path);
    const enriched = { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
    const ref = await addDoc(col, enriched);
    return ref.id;
  }
});

const updateInCollection = async (path, id, data) => wrapPermissionDenied({
  operation: 'update',
  collection: path,
  path: `${path}/${id}`,
  fn: async () => {
    const ref = doc(db, path, id);
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
  }
});

const deleteInCollection = async (path, id) => wrapPermissionDenied({
  operation: 'delete',
  collection: path,
  path: `${path}/${id}`,
  fn: async () => {
    const ref = doc(db, path, id);
    await deleteDoc(ref);
  }
});

// Stations
export const listStations = () => listCollection('stations', 'name');
export const createStation = (data) => createInCollection('stations', data);
export const updateStation = (id, data) => updateInCollection('stations', id, data);
export const deleteStation = (id) => deleteInCollection('stations', id);

// Issue Types
export const listIssueTypes = () => listCollection('issueTypes', 'label');
export const createIssueType = (data) => createInCollection('issueTypes', data);
export const updateIssueType = (id, data) => updateInCollection('issueTypes', id, data);
export const deleteIssueType = (id) => deleteInCollection('issueTypes', id);

// Users (admin-managed directory; separate from Auth provider)
export const listUsersAdmin = () => listCollection('users', 'name');
export const createUserAdmin = (data) => createInCollection('users', data);
export const updateUserAdmin = (id, data) => updateInCollection('users', id, data);
export const deleteUserAdmin = (id) => deleteInCollection('users', id);

export const getUserByEmail = async (email) => {
  const col = collection(db, 'users');
  const q = query(col, where('email', '==', email), qLimit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const docSnap = snap.docs[0];
  return { id: docSnap.id, ...docSnap.data() };
};

// Settings docs
export const getSettingsDocRef = (key) => doc(db, 'settings', key);
export const savePermissions = async (matrix) => {
  const ref = getSettingsDocRef('permissions');
  await wrapPermissionDenied({
    operation: 'update',
    collection: 'settings',
    path: 'settings/permissions',
    fn: async () => setDoc(ref, { matrix, updatedAt: serverTimestamp() }, { merge: true })
  });
};

export const saveAppSettings = async (settings) => {
  const ref = getSettingsDocRef('app');
  const beforeSnap = await getDoc(ref);
  const before = beforeSnap.exists() ? beforeSnap.data() : null;
  await wrapPermissionDenied({
    operation: 'update',
    collection: 'settings',
    path: 'settings/app',
    fn: async () => setDoc(ref, { ...settings, updatedAt: serverTimestamp() }, { merge: true })
  });
  try { await auditSettingsChange('app', before, settings); } catch (_) {}
};

export const saveEscalationSettings = async (settings) => {
  const ref = getSettingsDocRef('escalation');
  const beforeSnap = await getDoc(ref);
  const before = beforeSnap.exists() ? beforeSnap.data() : null;
  await wrapPermissionDenied({
    operation: 'update',
    collection: 'settings',
    path: 'settings/escalation',
    fn: async () => setDoc(ref, { ...settings, updatedAt: serverTimestamp() }, { merge: true })
  });
  try { await auditSettingsChange('escalation', before, settings); } catch (_) {}
};

// Issues (admin)
export const listIssuesAdmin = async (filters = {}, pageSize = 25, cursor) => wrapPermissionDenied({
  operation: 'read',
  collection: 'issues',
  path: 'issues',
  fn: async () => {
    const col = collection(db, 'issues');
    const constraints = [];
    if (filters.stationId) constraints.push(where('stationId', '==', filters.stationId));
    if (filters.issueType) constraints.push(where('issueType', '==', filters.issueType));
    if (filters.priority) constraints.push(where('priority', '==', filters.priority));
    if (filters.status) constraints.push(where('status', '==', filters.status));
    if (filters.dateFrom) constraints.push(where('createdAt', '>=', filters.dateFrom));
    if (filters.dateTo) constraints.push(where('createdAt', '<=', filters.dateTo));
    constraints.push(orderBy('createdAt', 'desc'));
    constraints.push(qLimit(pageSize));
    if (cursor) constraints.push(startAfter(cursor));

    const q = query(col, ...constraints);
    const snap = await getDocsCompat(q);
    const items = [];
    snap.forEach(d => {
      const data = d.data();
      items.push({ id: d.id, ...data, createdAt: data.createdAt?.toDate?.() || data.createdAt });
    });
    const last = snap.docs[snap.docs.length - 1];
    return { items, cursor: last || null };
  }
});

export const updateIssueStatusAdmin = async (id, status) => wrapPermissionDenied({
  operation: 'update',
  collection: 'issues',
  path: `issues/${id}`,
  fn: async () => {
    const ref = doc(db, 'issues', id);
    const beforeSnap = await getDoc(ref);
    const from = beforeSnap.exists() ? beforeSnap.data()?.status : undefined;
    await updateDoc(ref, { status, updatedAt: serverTimestamp() });
    try { await auditIssueStatusChange(id, from, status); } catch (_) {}
  }
});

export const closeIssueAdmin = async (id, { note, file }, actorEmail) => wrapPermissionDenied({
  operation: 'update',
  collection: 'issues',
  path: `issues/${id}`,
  fn: async () => {
  const ref = doc(db, 'issues', id);
  let photoUrl = null;
  if (file instanceof Blob) {
    const key = `issues/${id}/closure_${Date.now()}.jpg`;
    const sRef = storageRef(storage, key);
    const snap = await uploadBytes(sRef, file, { contentType: file.type || 'image/jpeg' });
    photoUrl = await getDownloadURL(snap.ref);
  }
  await updateDoc(ref, {
    status: 'closed',
    closedAt: serverTimestamp(),
    closedBy: actorEmail || null,
    closureNote: note || null,
    closurePhotoUrl: photoUrl || null,
    updatedAt: serverTimestamp(),
  });
  try { await auditIssueClosed(id, note || null, photoUrl || null); } catch (_) {}
  }
});

const getFunctionsBase = () => {
  const region = process.env.REACT_APP_FUNCTIONS_REGION || 'us-central1';
  const project = process.env.REACT_APP_FIREBASE_PROJECT_ID;
  if (!project) return null;
  return `https://${region}-${project}.cloudfunctions.net`;
};

export const requestCloseApproval = async (id, { note, file }, actorEmail) => wrapPermissionDenied({
  operation: 'update',
  collection: 'issues',
  path: `issues/${id}`,
  fn: async () => {
  let photoUrl = null;
  if (file instanceof Blob) {
    const key = `issues/${id}/closure_req_${Date.now()}.jpg`;
    const sRef = storageRef(storage, key);
    const snap = await uploadBytes(sRef, file, { contentType: file.type || 'image/jpeg' });
    photoUrl = await getDownloadURL(snap.ref);
  }
  const base = getFunctionsBase();
  if (!base) throw new Error('Missing REACT_APP_FIREBASE_PROJECT_ID for Functions');
  const res = await fetch(`${base}/createApprovalRequest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ issueId: id, closureNote: note || null, closurePhotoUrl: photoUrl || null, requestedBy: actorEmail || null }),
  });
  if (!res.ok) throw new Error('Failed to create approval request');
  const data = await res.json();
  try { await auditApprovalRequested(id, note || null, photoUrl || null); } catch (_) {}
  return data;
  }
});
