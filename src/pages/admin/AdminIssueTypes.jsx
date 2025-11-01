import React from 'react';
import { listIssueTypes, createIssueType, updateIssueType, deleteIssueType } from '../../services/adminService';
import { useAuth } from '../../hooks/useAuth';
import { fetchPermissionsMatrix, hasPermission, normalizeRole } from '../../utils/permissions';

const TypeForm = ({ initial, onSave, onCancel }) => {
  const [form, setForm] = React.useState(initial || { key: '', label: '', icon: 'wrench', active: true });
  return (
    <div className="card" style={{ padding: 12 }}>
      <div className="d-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
        <input className="input" placeholder="Key (e.g., electrical)" value={form.key} onChange={e=>setForm({ ...form, key: e.target.value })} />
        <input className="input" placeholder="Label" value={form.label} onChange={e=>setForm({ ...form, label: e.target.value })} />
        <input className="input" placeholder="Icon (font-awesome)" value={form.icon} onChange={e=>setForm({ ...form, icon: e.target.value })} />
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

const AdminIssueTypes = () => {
  const { user } = useAuth();
  const roleKey = normalizeRole(user?.role);
  const [matrix, setMatrix] = React.useState(null);
  const [list, setList] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [creating, setCreating] = React.useState(false);
  const [editing, setEditing] = React.useState(null);

  React.useEffect(() => { (async () => { const m = await fetchPermissionsMatrix(); setMatrix(m); })(); }, []);
  const canManage = matrix ? hasPermission(matrix, roleKey, 'manage_issue_types') : false;

  const load = async () => {
    setLoading(true);
    try { setList(await listIssueTypes()); } finally { setLoading(false); }
  };
  React.useEffect(()=>{ load(); },[]);

  const onCreate = async (data) => { await createIssueType(data); setCreating(false); load(); };
  const onUpdate = async (id, data) => { await updateIssueType(id, data); setEditing(null); load(); };
  const onDelete = async (id) => { if (window.confirm('Delete issue type?')) { await deleteIssueType(id); load(); } };

  if (!matrix) return <div className="small">Loading...</div>;

  return (
    <section>
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h3 className="small" style={{ marginBottom: 0 }}>Issue Types</h3>
        <button className="btn btn-accent" onClick={()=>setCreating(true)} disabled={!canManage}><i className="fas fa-plus"></i> New Type</button>
      </div>
      {creating && canManage && <TypeForm onSave={onCreate} onCancel={()=>setCreating(false)} />}
      {loading ? (
        <div className="small">Loading...</div>
      ) : (
        <div className="table" role="table" aria-label="Issue Types">
          <div className="table-row header" role="row">
            <div className="cell" role="columnheader">Key</div>
            <div className="cell" role="columnheader">Label</div>
            <div className="cell" role="columnheader">Icon</div>
            <div className="cell" role="columnheader">Active</div>
            <div className="cell" role="columnheader">Actions</div>
          </div>
          {list.map(item => (
            <div key={item.id} className="table-row" role="row">
              <div className="cell" role="cell">{item.key}</div>
              <div className="cell" role="cell">{item.label}</div>
              <div className="cell" role="cell"><i className={`fas fa-${item.icon || 'wrench'}`}></i> {item.icon}</div>
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
      )}
      {editing && canManage && <TypeForm initial={editing} onSave={(data)=>onUpdate(editing.id, data)} onCancel={()=>setEditing(null)} />}
    </section>
  );
};

export default AdminIssueTypes;
