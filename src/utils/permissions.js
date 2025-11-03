import { getDoc } from 'firebase/firestore';
import { getSettingsDocRef } from '../services/adminService';

// Normalize role labels from auth into matrix keys
export const normalizeRole = (role) => {
  if (!role) return 'station_manager';
  const key = String(role).toLowerCase().replaceAll(' ', '_');
  // map common variants
  if (key === 'station manager') return 'station_manager';
  return key;
};

export const defaultMatrix = {
  station_manager: {
    view_dashboard: true,
    report_issue: true,
    manage_issues: true,
    manage_settings: false,
    view_admin: false,
    manage_stations: false,
    manage_issue_types: false,
    manage_users: false,
    debug_tools: false,
  },
  engineer: {
    view_dashboard: true,
    report_issue: true,
    manage_issues: true,
    manage_settings: false,
    view_admin: false,
    manage_stations: false,
    manage_issue_types: false,
    manage_users: false,
    debug_tools: false,
  },
  admin: {
    view_dashboard: true,
    report_issue: true,
    manage_issues: true,
    manage_settings: true,
    view_admin: true,
    manage_stations: true,
    manage_issue_types: true,
    manage_users: true,
    debug_tools: false,
  },
  super_admin: {
    view_dashboard: true,
    report_issue: true,
    manage_issues: true,
    manage_settings: true,
    view_admin: true,
    manage_stations: true,
    manage_issue_types: true,
    manage_users: true,
    debug_tools: false,
  }
};

export const fetchPermissionsMatrix = async () => {
  try {
    const snap = await getDoc(getSettingsDocRef('permissions'));
    const m = snap.exists() ? snap.data()?.matrix : null;
    if (m && typeof m === 'object') return m;
  } catch {}
  return defaultMatrix;
};

export const hasPermission = (matrix, roleKey, perm) => {
  const m = matrix?.[roleKey] || defaultMatrix[roleKey] || {};
  // super_admin fallback: everything true
  if (roleKey === 'super_admin') return true;
  return !!m[perm];
};
