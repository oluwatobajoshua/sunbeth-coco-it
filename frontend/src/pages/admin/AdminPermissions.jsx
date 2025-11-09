import React from 'react';
import { savePermissions, getSettingsDocRef } from '../../services/adminService';
import { getDoc } from 'firebase/firestore';

const permissions = [
  { key:'view_dashboard', label:'View Dashboard' },
  { key:'report_issue', label:'Report Issue' },
  { key:'manage_issues', label:'Manage Issues' },
  { key:'manage_settings', label:'Manage Settings' },
  { key:'manage_stations', label:'Manage Stations' },
  { key:'manage_issue_types', label:'Manage Issue Types' },
  { key:'manage_users', label:'Manage Users' },
  { key:'view_admin', label:'Access Admin' },
  { key:'debug_tools', label:'Debug Tools' },
];

const AdminPermissions = () => {
  const [matrix, setMatrix] = React.useState({});
  const [saving, setSaving] = React.useState(false);
  const [newRole, setNewRole] = React.useState('');

  const load = async () => {
    const snap = await getDoc(getSettingsDocRef('permissions'));
    const data = snap.exists() ? snap.data()?.matrix : {};
    const roles = Object.keys(data || {});
    const hasSuper = roles.includes('super_admin');
    const ensure = { ...data };
    const seedRoles = roles.length ? roles : ['station_manager','engineer','admin','super_admin'];
    seedRoles.forEach(r => { if (!ensure[r]) ensure[r] = {}; permissions.forEach(p => { if (ensure[r][p.key] == null) ensure[r][p.key] = (r==='super_admin'); }); });
    if (!hasSuper && !roles.length) {
      // default setup on first run
      ensure['super_admin'] = {}; permissions.forEach(p => { ensure['super_admin'][p.key] = true; });
    }
    setMatrix(ensure);
  };
  React.useEffect(()=>{ load(); },[]);

  const toggle = (role, perm) => {
    setMatrix(prev => ({ ...prev, [role]: { ...prev[role], [perm]: !prev[role]?.[perm] } }));
  };

  const addRole = () => {
    const key = (newRole || '').trim().toLowerCase().replace(/\s+/g, '_');
    if (!key) return;
    if (matrix[key]) { setNewRole(''); return; }
    const perms = {};
    permissions.forEach(p => { perms[p.key] = false; });
    setMatrix(prev => ({ ...prev, [key]: perms }));
    setNewRole('');
  };

  const removeRole = (role) => {
    if (['super_admin','admin','engineer','station_manager'].includes(role)) return; // protect built-ins
    const copy = { ...matrix };
    delete copy[role];
    setMatrix(copy);
  };

  const save = async () => {
    setSaving(true);
    try { await savePermissions(matrix); } finally { setSaving(false); }
  };

  const roles = Object.keys(matrix || {});

  return (
    <section className="card" style={{ padding: 12 }}>
      <div className="section-header" style={{ justifyContent: 'space-between', display: 'flex' }}>
        <h3 className="small" style={{ marginBottom: 0 }}>Permissions</h3>
        <button className="btn btn-success" onClick={save} disabled={saving}><i className="fas fa-save"></i> Save</button>
      </div>
      <div className="d-flex" style={{ gap: 8, marginBottom: 8 }}>
        <input className="input" placeholder="New role key (e.g., operations_lead)" value={newRole} onChange={e=>setNewRole(e.target.value)} style={{ maxWidth: 320 }} />
        <button className="btn btn-accent" onClick={addRole}><i className="fas fa-plus"></i> Add Role</button>
      </div>
      <div className="table" role="table" aria-label="Permissions matrix" style={{ '--cols': '1.4fr repeat(4, 0.8fr)' }}>
        <div className="table-row header" role="row">
          <div className="cell" role="columnheader">Permission</div>
          {roles.map(r => <div key={r} className="cell" role="columnheader" style={{ textTransform: 'capitalize', position:'relative' }}>
            {r.replace('_',' ')}
            {!['super_admin','admin','engineer','station_manager'].includes(r) && (
              <button className="btn btn-outline" title="Remove role" style={{ position:'absolute', right: 4, top: 4, padding: '2px 6px' }} onClick={()=>removeRole(r)}>
                <i className="fas fa-times"></i>
              </button>
            )}
          </div>)}
        </div>
        {permissions.map(p => (
          <div key={p.key} className="table-row" role="row">
            <div className="cell" role="cell">{p.label}</div>
            {roles.map(r => (
              <div key={r} className="cell" role="cell">
                <label className="chip toggle">
                  <input type="checkbox" checked={!!matrix[r]?.[p.key]} onChange={()=>toggle(r,p.key)} />
                </label>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="small muted" style={{ marginTop: 8 }}>Note: Enforce this matrix in route guards and UI controls based on the authenticated user's role.</div>
    </section>
  );
};

export default AdminPermissions;
