import React from 'react';
import { listUsersAdmin, createUserAdmin, updateUserAdmin, deleteUserAdmin, listStations } from '../../services/adminService';
import { listRoles, computeEffectivePerms } from '../../services/rolesService';
import { useAuth } from '../../hooks/useAuth';
import { fetchPermissionsMatrix, hasPermission, normalizeRole } from '../../utils/permissions';

const UserForm = ({ initial, stations, roles, onSave, onCancel }) => {
  const defaultRoles = initial?.roles || [];
  const [form, setForm] = React.useState(initial || { name:'', email:'', roles: defaultRoles, stationId:'', active:true });
  const toggleRole = (key) => {
    const set = new Set(form.roles || []);
    if (set.has(key)) set.delete(key); else set.add(key);
    setForm({ ...form, roles: Array.from(set) });
  };
  return (
    <div className="card" style={{ padding: 12 }}>
      <div className="d-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
        <input className="input" placeholder="Name" value={form.name} onChange={e=>setForm({ ...form, name: e.target.value })} />
        <input className="input" placeholder="Email" value={form.email} onChange={e=>setForm({ ...form, email: e.target.value })} />
        <div className="d-flex" style={{ flexWrap:'wrap', gap: 8 }}>
          {roles.map(r => (
            <label key={r.id} className="chip toggle">
              <input type="checkbox" checked={(form.roles||[]).includes(r.id)} onChange={()=>toggleRole(r.id)} /> {r.label || r.id}
            </label>
          ))}
        </div>
        <select className="btn-outline" value={form.stationId} onChange={e=>setForm({ ...form, stationId: e.target.value })}>
          <option value="">— Station (optional) —</option>
          {stations.map(s => <option key={s.id} value={s.code}>{s.name}</option>)}
        </select>
        <label className="chip toggle" style={{ alignSelf: 'center' }}>
          <input type="checkbox" checked={!!form.active} onChange={e=>setForm({ ...form, active: e.target.checked })} /> Active
        </label>
      </div>
      <div className="d-flex" style={{ gap: 8, marginTop: 8 }}>
        <button className="btn btn-success" onClick={()=>onSave(form)}><i className="fas fa-save"></i> Save</button>
        <button className="btn btn-secondary" onClick={onCancel}><i className="fas fa-times"></i> Cancel</button>
      </div>
    </div>
  );
};

const AdminUsers = () => {
  const { user } = useAuth();
  const roleKey = normalizeRole(user?.role);
  const [matrix, setMatrix] = React.useState(null);
  const [list, setList] = React.useState([]);
  const [stations, setStations] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [roles, setRoles] = React.useState([]);
  const [creating, setCreating] = React.useState(false);
  const [editing, setEditing] = React.useState(null);

  React.useEffect(() => { (async () => { const m = await fetchPermissionsMatrix(); setMatrix(m); })(); }, []);
  const canManage = matrix ? hasPermission(matrix, roleKey, 'manage_users') : false;

  const load = async () => {
    setLoading(true);
    try {
      const [u, s, r] = await Promise.all([listUsersAdmin(), listStations(), listRoles()]);
      setList(u); setStations(s); setRoles(r);
    } finally { setLoading(false); }
  };
  React.useEffect(()=>{ load(); },[]);

  const onCreate = async (data) => {
    const effectivePerms = computeEffectivePerms(roles, data.roles || []);
    await createUserAdmin({ ...data, effectivePerms }); setCreating(false); load();
  };
  const onUpdate = async (id, data) => {
    const effectivePerms = computeEffectivePerms(roles, data.roles || []);
    await updateUserAdmin(id, { ...data, effectivePerms }); setEditing(null); load();
  };
  const onDelete = async (id) => { if (window.confirm('Delete user?')) { await deleteUserAdmin(id); load(); } };

  if (!matrix) return <div className="small">Loading...</div>;

  return (
    <section>
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h3 className="small" style={{ marginBottom: 0 }}>Users</h3>
        <button className="btn btn-accent" onClick={()=>setCreating(true)} disabled={!canManage}><i className="fas fa-plus"></i> New User</button>
      </div>
  {creating && canManage && <UserForm stations={stations} roles={roles} onSave={onCreate} onCancel={()=>setCreating(false)} />}
      {loading ? (
        <div className="small">Loading...</div>
      ) : (
        <>
          <div className="table" role="table" aria-label="Users" style={{ '--cols': '1.2fr 1.6fr 1.2fr 1fr 0.6fr 0.8fr' }}>
            <div className="table-row header" role="row">
              <div className="cell" role="columnheader">Name</div>
              <div className="cell" role="columnheader">Email</div>
              <div className="cell" role="columnheader">Roles</div>
              <div className="cell" role="columnheader">Station</div>
              <div className="cell" role="columnheader">Active</div>
              <div className="cell" role="columnheader">Actions</div>
            </div>
            {list.map(item => (
              <div key={item.id} className="table-row" role="row">
                <div className="cell" role="cell">{item.name}</div>
                <div className="cell" role="cell">{item.email}</div>
                <div className="cell" role="cell">{Array.isArray(item.roles) && item.roles.length ? item.roles.join(', ') : (item.role || '—')}</div>
                <div className="cell" role="cell">{item.stationId || '—'}</div>
                <div className="cell" role="cell">{item.active ? 'Yes' : 'No'}</div>
                <div className="cell" role="cell">
                  <div className="d-flex" style={{ gap: 6 }}>
                    <button className="btn btn-outline" onClick={()=>setEditing(item)} disabled={!canManage}><i className="fas fa-edit"></i></button>
                    <button className="btn btn-outline" onClick={()=>onDelete(item.id)} disabled={!canManage}><i className="fas fa-trash"></i></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {!list.length && (
            <div className="card" style={{ padding: 16, marginTop: 12 }}>
              <div className="small">No users yet.</div>
              {canManage && (
                <div style={{ marginTop: 8 }}>
                  <button className="btn btn-accent" onClick={()=>setCreating(true)}><i className="fas fa-plus"></i> Create your first user</button>
                </div>
              )}
            </div>
          )}
        </>
      )}
  {editing && canManage && <UserForm stations={stations} roles={roles} initial={editing} onSave={(data)=>onUpdate(editing.id, data)} onCancel={()=>setEditing(null)} />}
    </section>
  );
};

export default AdminUsers;
