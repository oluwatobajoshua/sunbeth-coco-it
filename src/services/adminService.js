import { db } from './firebase';
import {
  collection, getDocs, addDoc, setDoc, doc, updateDoc, deleteDoc,
  serverTimestamp, query, orderBy
} from 'firebase/firestore';
import { getDocs as getDocsCompat, startAfter, where, limit as qLimit } from 'firebase/firestore';

// Generic helpers
const listCollection = async (path, orderByField) => {
  const col = collection(db, path);
  const q = orderByField ? query(col, orderBy(orderByField, 'asc')) : col;
  const snap = await getDocs(q);
  const items = [];
  snap.forEach(d => items.push({ id: d.id, ...d.data() }));
  return items;
};

const createInCollection = async (path, data) => {
  const col = collection(db, path);
  const enriched = { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
  const ref = await addDoc(col, enriched);
  return ref.id;
};

const updateInCollection = async (path, id, data) => {
  const ref = doc(db, path, id);
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
};

const deleteInCollection = async (path, id) => {
  const ref = doc(db, path, id);
  await deleteDoc(ref);
};

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
  await setDoc(ref, { matrix, updatedAt: serverTimestamp() }, { merge: true });
};

export const saveAppSettings = async (settings) => {
  const ref = getSettingsDocRef('app');
  await setDoc(ref, { ...settings, updatedAt: serverTimestamp() }, { merge: true });
};

// Issues (admin)
export const listIssuesAdmin = async (filters = {}, pageSize = 25, cursor) => {
  const col = collection(db, 'issues');
  const constraints = [];
  // Equality filters
  if (filters.stationId) constraints.push(where('stationId', '==', filters.stationId));
  if (filters.issueType) constraints.push(where('issueType', '==', filters.issueType));
  if (filters.priority) constraints.push(where('priority', '==', filters.priority));
  if (filters.status) constraints.push(where('status', '==', filters.status));
  // Date range on createdAt
  if (filters.dateFrom) constraints.push(where('createdAt', '>=', filters.dateFrom));
  if (filters.dateTo) constraints.push(where('createdAt', '<=', filters.dateTo));
  // Order by createdAt desc for browsing
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
};

export const updateIssueStatusAdmin = async (id, status) => {
  const ref = doc(db, 'issues', id);
  await updateDoc(ref, { status, updatedAt: serverTimestamp() });
};
