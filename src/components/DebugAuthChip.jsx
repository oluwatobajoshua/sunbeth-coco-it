import React, { useEffect, useMemo, useState } from 'react';
import { auth, db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';

function roleKey(role) {
  const r = String(role || '').toLowerCase();
  if (r === 'super admin' || r === 'super_admin') return 'super_admin';
  if (r === 'admin') return 'admin';
  if (r === 'station manager' || r === 'station_manager') return 'station_manager';
  if (r === 'engineer') return 'engineer';
  return 'viewer';
}

export default function DebugAuthChip() {
  const [claimsRole, setClaimsRole] = useState(null);
  const [dirRoleUid, setDirRoleUid] = useState(null);
  const [dirRoleEmail, setDirRoleEmail] = useState(null);
  const [finalPerms, setFinalPerms] = useState(null);
  const [matrix, setMatrix] = useState(null);

  const u = auth.currentUser;
  const email = u?.email || null;
  const provider = (u?.providerData?.[0]?.providerId) || (u?.isAnonymous ? 'anonymous' : 'unknown');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await u?.getIdTokenResult(true);
        if (!mounted) return;
        setClaimsRole(res?.claims?.role || null);
      } catch (_) { /* ignore */ }
      try {
        if (u?.uid) {
          const snap = await getDoc(doc(db, 'users', u.uid));
          if (!mounted) return;
          setDirRoleUid(snap.exists() ? (snap.data()?.role || null) : null);
        }
      } catch (_) {}
      try {
        if (email) {
          const snap = await getDoc(doc(db, 'users', email.toLowerCase()));
          if (!mounted) return;
          setDirRoleEmail(snap.exists() ? (snap.data()?.role || null) : null);
        }
      } catch (_) {}
      try {
        const perm = await getDoc(doc(db, 'settings', 'permissions'));
        if (!mounted) return;
        const m = perm.exists() ? perm.data()?.matrix || null : null;
        setMatrix(m);
      } catch (_) {}
    })();
    return () => { mounted = false; };
  }, [u, email]);

  const resolvedRole = useMemo(() => {
    return claimsRole || dirRoleUid || dirRoleEmail || 'Viewer';
  }, [claimsRole, dirRoleUid, dirRoleEmail]);

  useEffect(() => {
    if (!matrix) return;
    const rk = roleKey(resolvedRole);
    setFinalPerms(matrix?.[rk] || null);
  }, [matrix, resolvedRole]);

  if (String(process.env.REACT_APP_DEBUG_AUTH || '').toLowerCase() !== 'true') return null;

  return (
    <div className="chip" title="Auth debug">
      <i className="fas fa-user-shield" aria-hidden></i>
      <span style={{ marginLeft: 6 }}>
        {email || 'no-email'} · {provider} · role: {resolvedRole || 'unknown'}
      </span>
      {finalPerms ? (
        <span className="badge" style={{ marginLeft: 8 }}>
          manage_stations: {finalPerms.manage_stations ? 'yes' : 'no'}
        </span>
      ) : null}
    </div>
  );
}
