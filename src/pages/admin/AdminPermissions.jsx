import React from 'react';
import { savePermissions, getSettingsDocRef } from '../../services/adminService';
import { getDoc } from 'firebase/firestore';

const roles = ['station_manager','engineer','admin','super_admin'];
const permissions = [
  { key:'view_dashboard', label:'View Dashboard' },
  { key:'report_issue', label:'Report Issue' },
  { key:'manage_issues', label:'Manage Issues' },
  { key:'manage_stations', label:'Manage Stations' },
  { key:'manage_issue_types', label:'Manage Issue Types' },
  { key:'manage_users', label:'Manage Users' },
  { key:'view_admin', label:'Access Admin' },
  { key:'debug_tools', label:'Debug Tools' },
];

const AdminPermissions = () => {
  const [matrix, setMatrix] = React.useState({});
  const [saving, setSaving] = React.useState(false);

  const load = async () => {
    const snap = await getDoc(getSettingsDocRef('permissions'));
    const data = snap.exists() ? snap.data()?.matrix : {};
    const m = { ...data };
    roles.forEach(r => { if (!m[r]) m[r] = {}; permissions.forEach(p => { if (m[r][p.key] == null) m[r][p.key] = r==='super_admin'; }); });
    setMatrix(m);
  };
  React.useEffect(()=>{ load(); },[]);

  const toggle = (role, perm) => {
    setMatrix(prev => ({ ...prev, [role]: { ...prev[role], [perm]: !prev[role]?.[perm] } }));
  };

  const save = async () => {
    setSaving(true);
    try { await savePermissions(matrix); } finally { setSaving(false); }
  };

  return (
    <section className="card" style={{ padding: 12 }}>
      <div className="section-header" style={{ justifyContent: 'space-between', display: 'flex' }}>
        <h3 className="small" style={{ marginBottom: 0 }}>Permissions</h3>
        <button className="btn btn-success" onClick={save} disabled={saving}><i className="fas fa-save"></i> Save</button>
      </div>
      <div className="table" role="table" aria-label="Permissions matrix">
        <div className="table-row header" role="row">
          <div className="cell" role="columnheader">Permission</div>
          {roles.map(r => <div key={r} className="cell" role="columnheader" style={{ textTransform: 'capitalize' }}>{r.replace('_',' ')}</div>)}
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
