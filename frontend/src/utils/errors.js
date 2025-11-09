import { auth } from '../services/firebase';
import { getIdTokenResult } from 'firebase/auth';
import { fetchPermissionsMatrix, normalizeRole } from './permissions';

// Map simple collection paths to required permissions by operation
export const requiredPermFor = (collectionPath, operation) => {
  // normalize collection root key
  const key = String(collectionPath || '').split('/')[0];
  switch (key) {
    case 'issues':
      return operation === 'read' ? 'view_admin' : 'manage_issues';
    case 'stations':
      return operation === 'read' ? 'view_admin' : 'manage_stations';
    case 'issueTypes':
      return operation === 'read' ? 'view_admin' : 'manage_issue_types';
    case 'users':
      return operation === 'read' ? 'view_admin' : 'manage_users';
    case 'settings':
      return 'manage_settings';
    case 'approvals':
      return 'manage_issues';
    case 'auditLogs':
      return 'view_admin';
    default:
      return operation === 'read' ? 'view_admin' : 'manage_issues';
  }
};

export const listPermsForRole = (matrix, roleKey) => {
  const m = matrix?.[roleKey] || {};
  return Object.keys(m).filter((k) => !!m[k]).sort();
};

export const buildPermissionErrorMessage = async ({ operation, collection, path, originalError }) => {
  try {
    const user = auth.currentUser;
    const email = user?.email || 'unknown';
    let role = 'unknown';
    let provider = 'unknown';
    const signedIn = !!user;
    try {
      if (user) {
        const res = await getIdTokenResult(user, true);
        role = res?.claims?.role || role;
        provider = res?.claims?.provider || provider;
      }
    } catch {}
    const roleKey = normalizeRole(role);
    const matrix = await fetchPermissionsMatrix().catch(() => null);
    const perms = matrix ? listPermsForRole(matrix, roleKey) : [];
    const required = requiredPermFor(collection, operation);
    const details = [
      `Who: ${email} (role: ${roleKey})`,
      `Firebase signed in: ${signedIn ? 'yes' : 'no'} (provider: ${provider})`,
      `Operation: ${operation.toUpperCase()}`,
      `Resource: ${collection}${path ? ` (${path})` : ''}`,
      `Required permission: ${required}`,
      `Granted permissions: ${perms.length ? perms.join(', ') : 'unknown'}`,
    ].join('\n');
    return `Missing or insufficient permissions.\n\n${details}\n\nRaw error: ${originalError?.message || originalError || 'n/a'}`;
  } catch (e) {
    return `Missing or insufficient permissions (additional context unavailable). Raw error: ${originalError?.message || originalError}`;
  }
};

export const wrapPermissionDenied = async ({ fn, operation, collection, path }) => {
  try {
    return await fn();
  } catch (e) {
    // Firestore and Storage both use 'permission-denied'
    const code = e?.code || e?.error?.code || '';
    const s = String(code);
    if (s.includes('permission-denied') || s.includes('unauthorized') || s.includes('permission')) {
      const msg = await buildPermissionErrorMessage({ operation, collection, path, originalError: e });
      const err = new Error(msg);
      err.cause = e;
      err.code = 'permission-denied';
      throw err;
    }
    throw e;
  }
};
