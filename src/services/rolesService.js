import { db } from './firebase';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { wrapPermissionDenied } from '../utils/errors';

const ROLES_COL = 'roles';

export const listRoles = async () => wrapPermissionDenied({
  operation: 'read',
  collection: ROLES_COL,
  path: ROLES_COL,
  fn: async () => {
    const snap = await getDocs(collection(db, ROLES_COL));
    const items = [];
    snap.forEach(d => items.push({ id: d.id, ...d.data() }));
    return items;
  }
});

export const createRole = async (id, data) => wrapPermissionDenied({
  operation: 'create',
  collection: ROLES_COL,
  path: `${ROLES_COL}/${id}`,
  fn: async () => {
    const payload = { label: id, description: '', inherits: [], permissions: {}, ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
    await setDoc(doc(db, ROLES_COL, id), payload, { merge: true });
  }
});

export const updateRole = async (id, data) => wrapPermissionDenied({
  operation: 'update',
  collection: ROLES_COL,
  path: `${ROLES_COL}/${id}`,
  fn: async () => {
    await updateDoc(doc(db, ROLES_COL, id), { ...data, updatedAt: serverTimestamp() });
  }
});

export const deleteRole = async (id) => wrapPermissionDenied({
  operation: 'delete',
  collection: ROLES_COL,
  path: `${ROLES_COL}/${id}`,
  fn: async () => deleteDoc(doc(db, ROLES_COL, id))
});

export const computeEffectivePerms = (roles, selectedKeys) => {
  const byId = Object.fromEntries(roles.map(r => [r.id, r]));
  const seen = new Set();
  const perms = {};
  const visit = (key) => {
    if (!key || seen.has(key)) return;
    seen.add(key);
    const r = byId[key];
    if (!r) return;
    const p = r.permissions || {};
    Object.keys(p || {}).forEach(k => { if (p[k]) perms[k] = true; });
    (r.inherits || []).forEach(visit);
  };
  (selectedKeys || []).forEach(visit);
  return perms;
};

// Recompute effective permissions for all users based on their assigned roles.
// Requires manage_users permission by Firestore rules.
export const recomputeAllUsersEffectivePerms = async () => wrapPermissionDenied({
  operation: 'update',
  collection: 'users',
  path: 'users/*',
  fn: async () => {
    // Load all roles
    const rolesSnap = await getDocs(collection(db, ROLES_COL));
    const roles = [];
    rolesSnap.forEach(d => roles.push({ id: d.id, ...d.data() }));

    // Load all users
    const usersSnap = await getDocs(collection(db, 'users'));
    let updated = 0;
    for (const uDoc of usersSnap.docs) {
      const u = { id: uDoc.id, ...uDoc.data() };
      const effectivePerms = computeEffectivePerms(roles, u.roles || []);
      try {
        await updateDoc(doc(db, 'users', uDoc.id), { effectivePerms, updatedAt: serverTimestamp() });
        updated += 1;
      } catch (_) {
        // swallow and continue to next user
      }
    }
    return { updated };
  }
});

// Cloud Function variant removed; using client-side recomputation guarded by rules
