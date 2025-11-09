import React from 'react';
import { listRoles, createRole, updateRole, deleteRole, recomputeAllUsersEffectivePerms } from '../../services/rolesService';
import { fetchPermissionsMatrix, hasPermission, normalizeRole } from '../../utils/permissions';
import { useAuth } from '../../hooks/useAuth';

const PERMS = [
  { key:'view_dashboard', label:'View Dashboard' },
  { key:'report_issue', label:'Report Issue' },
  { key:'manage_issues', label:'Manage Issues' },
  { key:'manage_settings', label:'Manage Settings' },
  { key:'manage_stations', label:'Manage Stations' },
  { key:'manage_issue_types', label:'Manage Issue Types' },
  { key:'manage_users', label:'Manage Users' },
  { key:'manage_roles', label:'Manage Roles' },
  { key:'assign_roles', label:'Assign Roles' },
  { key:'view_admin', label:'Access Admin' },
  { key:'debug_tools', label:'Debug Tools' },
];

const RoleEditor = ({ role, allRoles, onChange }) => {
  const r = role || { id:'', label:'', description:'', inherits:[], permissions:{} };
  const toggle = (k) => onChange({ ...r, permissions: { ...r.permissions, [k]: !r.permissions?.[k] } });
  const toggleInherit = (k) => {
    const set = new Set(r.inherits || []);
    if (set.has(k)) set.delete(k); else set.add(k);
    onChange({ ...r, inherits: Array.from(set) });
  };
  return (
    <div className="card" style={{ padding: 12, marginBottom: 12 }}>
      <div className="d-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
        <input className="input" placeholder="Role key (e.g., operations_lead)" value={r.id} onChange={e=>onChange({ ...r, id: e.target.value.replace(/\s+/g,'_').toLowerCase() })} />
        <input className="input" placeholder="Label" value={r.label || ''} onChange={e=>onChange({ ...r, label: e.target.value })} />
        <input className="input" placeholder="Description" value={r.description || ''} onChange={e=>onChange({ ...r, description: e.target.value })} />
      </div>
      <div className="small" style={{ marginTop: 8, marginBottom: 6 }}>Inherits</div>
      <div className="d-flex" style={{ flexWrap: 'wrap', gap: 8 }}>
        {allRoles.filter(ar => ar.id !== r.id).map(ar => (
          <label key={ar.id} className="chip toggle">
            <input type="checkbox" checked={(r.inherits||[]).includes(ar.id)} onChange={()=>toggleInherit(ar.id)} /> {ar.label || ar.id}
          </label>
        ))}
      </div>
      <div className="table" role="table" aria-label="Role permissions" style={{ '--cols': '1fr 0.2fr' }}>
        <div className="table-row header" role="row">
          <div className="cell" role="columnheader">Permission</div>
          <div className="cell" role="columnheader">Allow</div>
        </div>
        {PERMS.map(p => (
          <div key={p.key} className="table-row" role="row">
            <div className="cell" role="cell">{p.label}</div>
            <div className="cell" role="cell">
              <label className="chip toggle"><input type="checkbox" checked={!!r.permissions?.[p.key]} onChange={()=>toggle(p.key)} /></label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const AdminRoles = () => {
  const { user } = useAuth();
  const [matrix, setMatrix] = React.useState(null);
  const [roles, setRoles] = React.useState([]);
  const [editing, setEditing] = React.useState(null);
  const roleKey = normalizeRole(user?.role);

  React.useEffect(() => { (async () => { const m = await fetchPermissionsMatrix(); setMatrix(m); })(); }, []);
  const canManage = matrix ? hasPermission(matrix, roleKey, 'manage_roles') : false;

  const load = async () => { const list = await listRoles(); setRoles(list); };
  React.useEffect(()=>{ load(); },[]);

  const onCreate = async () => {
    setEditing({ id:'', label:'', description:'', inherits:[], permissions:{} });
  };
  const onSave = async () => {
    const r = editing;
    if (!r?.id) return;
    const exists = roles.some(x => x.id === r.id);
    if (exists) { await updateRole(r.id, { label: r.label || r.id, description: r.description || '', inherits: r.inherits || [], permissions: r.permissions || {} }); }
    else { await createRole(r.id, { label: r.label || r.id, description: r.description || '', inherits: r.inherits || [], permissions: r.permissions || {} }); }
    setEditing(null); await load();
  };
  const onDelete = async (id) => { if (!canManage) return; if (window.confirm('Delete role?')) { await deleteRole(id); await load(); } };
  const onRecompute = async () => {
    if (!canManage) return;
    if (!window.confirm('Recompute effective permissions for all users now?')) return;
    try {
      const res = await recomputeAllUsersEffectivePerms();
      window.alert(`Recomputed effective permissions for ${res.updated} user(s).`);
    } catch (e) {
      window.alert(`Recompute failed: ${e?.message || e}`);
    }
  };

  if (!matrix) return <div className="small">Loading...</div>;

  return (
    <section>
      <div className="section-header" style={{ display:'flex', justifyContent:'space-between' }}>
        <h3 className="small" style={{ marginBottom: 0 }}>Roles</h3>
        <div className="d-flex" style={{ gap: 8 }}>
          <button className="btn btn-accent" disabled={!canManage} onClick={onCreate}><i className="fas fa-plus"></i> New Role</button>
          <button className="btn btn-outline" disabled={!canManage} onClick={onRecompute}><i className="fas fa-sync-alt"></i> Recompute Permissions</button>
        </div>
      </div>
      {editing && canManage && (
        <RoleEditor role={editing} allRoles={roles} onChange={setEditing} />
      )}
      {editing && canManage && (
        <div className="d-flex" style={{ gap: 8, marginBottom: 12 }}>
          <button className="btn btn-success" onClick={onSave}><i className="fas fa-save"></i> Save Role</button>
          <button className="btn btn-secondary" onClick={()=>setEditing(null)}><i className="fas fa-times"></i> Cancel</button>
        </div>
      )}

      <div className="table" role="table" aria-label="Roles" style={{ '--cols': '1.2fr 2fr 0.8fr 0.6fr' }}>
        <div className="table-row header" role="row">
          <div className="cell" role="columnheader">Role</div>
          <div className="cell" role="columnheader">Description</div>
          <div className="cell" role="columnheader">Inherits</div>
          <div className="cell" role="columnheader">Actions</div>
        </div>
        {roles.map(r => (
          <div key={r.id} className="table-row" role="row">
            <div className="cell" role="cell">{r.label || r.id}</div>
            <div className="cell" role="cell">{r.description || '—'}</div>
            <div className="cell" role="cell">{(r.inherits||[]).join(', ') || '—'}</div>
            <div className="cell" role="cell">
              <div className="d-flex" style={{ gap: 6 }}>
                <button className="btn btn-outline" onClick={()=>setEditing(r)} disabled={!canManage}><i className="fas fa-edit"></i></button>
                <button className="btn btn-outline" onClick={()=>onDelete(r.id)} disabled={!canManage}><i className="fas fa-trash"></i></button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {!roles.length && (
        <div className="card" style={{ padding: 12, marginTop: 12 }}>
          <div className="small">No roles yet.</div>
          <div style={{ marginTop: 8 }}>
            <button className="btn btn-accent" onClick={onCreate} disabled={!canManage}><i className="fas fa-plus"></i> Create your first role</button>
          </div>
        </div>
      )}
    </section>
  );
};

export default AdminRoles;
