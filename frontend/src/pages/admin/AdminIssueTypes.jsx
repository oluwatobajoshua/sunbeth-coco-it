import React from 'react';
import { listIssueTypes, createIssueType, updateIssueType, deleteIssueType } from '../../services/adminService';
import { listRoles } from '../../services/rolesService';
import { sendNotifications } from '../../services/issueService';
import { useAuth } from '../../hooks/useAuth';
import { fetchPermissionsMatrix, hasPermission, normalizeRole } from '../../utils/permissions';

const toCsv = (arr) => Array.isArray(arr) && arr.length ? arr.join(', ') : '';
const parseEmails = (text) =>
  (text || '')
    .split(/[\n,;\s]+/)
    .map(e => e.trim().toLowerCase())
    .filter(e => !!e && /.+@.+\..+/.test(e));

const TypeForm = ({ initial, roles, canDebug, onSave, onCancel }) => {
  const [form, setForm] = React.useState(() => {
    const base = initial || { key: '', label: '', icon: 'wrench', active: true, assignedToEmails: [], ccEmails: [], assignedToRoles: [], ccRoles: [] };
    return {
      ...base,
      _assignedCsv: toCsv(base.assignedToEmails || []),
      _ccCsv: toCsv(base.ccEmails || []),
    };
  });
  const handleSave = () => {
    const assignedToEmails = parseEmails(form._assignedCsv);
    const ccEmails = parseEmails(form._ccCsv);
    onSave({ key: form.key, label: form.label, icon: form.icon, active: !!form.active, assignedToEmails, ccEmails, assignedToRoles: form.assignedToRoles || [], ccRoles: form.ccRoles || [] });
  };
  const toggleRole = (field, roleId) => {
    const set = new Set(form[field] || []);
    if (set.has(roleId)) set.delete(roleId); else set.add(roleId);
    setForm({ ...form, [field]: Array.from(set) });
  };
  const onTestNotify = async () => {
    if (!canDebug) return;
    const fakeIssue = {
      id: 'TEST-NOTIFY',
      stationId: 'TEST-STATION',
      issueType: form.key || 'test_type',
      priority: 'medium',
      description: `Test notification for issue type ${form.label || form.key}`,
      reporterName: 'Test User',
      reporterId: 'test.user@sunbeth.net'
    };
    await sendNotifications(fakeIssue);
    alert('Test notification record created. Check the notifications collection or your email sender if wired.');
  };
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
      <div className="d-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 8, marginTop: 8 }}>
        <div>
          <label className="small">Assign to (emails, comma or newline separated)</label>
          <textarea className="input" rows="2" placeholder="user1@company.com, user2@company.com" value={form._assignedCsv} onChange={e=>setForm({ ...form, _assignedCsv: e.target.value })} />
        </div>
        <div>
          <label className="small">Copy (CC) (emails, comma or newline separated)</label>
          <textarea className="input" rows="2" placeholder="manager@company.com" value={form._ccCsv} onChange={e=>setForm({ ...form, _ccCsv: e.target.value })} />
        </div>
      </div>
      <div className="d-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 8, marginTop: 8 }}>
        <div>
          <label className="small">Assign roles</label>
          <div className="d-flex" style={{ flexWrap:'wrap', gap: 8 }}>
            {(roles || []).map(r => (
              <label key={r.id} className="chip toggle">
                <input type="checkbox" checked={(form.assignedToRoles||[]).includes(r.id)} onChange={()=>toggleRole('assignedToRoles', r.id)} /> {r.label || r.id}
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="small">CC roles</label>
          <div className="d-flex" style={{ flexWrap:'wrap', gap: 8 }}>
            {(roles || []).map(r => (
              <label key={r.id} className="chip toggle">
                <input type="checkbox" checked={(form.ccRoles||[]).includes(r.id)} onChange={()=>toggleRole('ccRoles', r.id)} /> {r.label || r.id}
              </label>
            ))}
          </div>
        </div>
      </div>
      <div className="d-flex" style={{ gap: 8, marginTop: 8 }}>
        <button className="btn btn-success" onClick={handleSave}><i className="fas fa-save"></i> Save</button>
        <button className="btn btn-secondary" onClick={onCancel}><i className="fas fa-times"></i> Cancel</button>
        {canDebug && <button className="btn btn-outline" onClick={onTestNotify}><i className="fas fa-paper-plane"></i> Test Notify</button>}
      </div>
    </div>
  );
};

const AdminIssueTypes = () => {
  const { user } = useAuth();
  const roleKey = normalizeRole(user?.role);
  const [matrix, setMatrix] = React.useState(null);
  const [list, setList] = React.useState([]);
  const [roles, setRoles] = React.useState([]);
  const [filters, setFilters] = React.useState({ q: '', active: '' });
  const [loading, setLoading] = React.useState(true);
  const [creating, setCreating] = React.useState(false);
  const [editing, setEditing] = React.useState(null);

  React.useEffect(() => { (async () => { const m = await fetchPermissionsMatrix(); setMatrix(m); })(); }, []);
  const canManage = matrix ? hasPermission(matrix, roleKey, 'manage_issue_types') : false;
  const canDebug = matrix ? hasPermission(matrix, roleKey, 'debug_tools') : false;

  const load = async () => {
    setLoading(true);
    try {
      const [typesList, rolesList] = await Promise.all([listIssueTypes(), listRoles()]);
      setList(typesList);
      setRoles(rolesList);
    } finally { setLoading(false); }
  };
  React.useEffect(()=>{ load(); },[]);

  const onCreate = async (data) => { await createIssueType(data); setCreating(false); load(); };
  const onUpdate = async (id, data) => { await updateIssueType(id, data); setEditing(null); load(); };
  const onDelete = async (id) => { if (window.confirm('Delete issue type?')) { await deleteIssueType(id); load(); } };

  const filtered = React.useMemo(() => {
    return list.filter(item => {
      const q = filters.q.toLowerCase().trim();
      const matchesQ = !q || (item.key?.toLowerCase().includes(q) || item.label?.toLowerCase().includes(q));
      const matchesActive = filters.active === '' || (!!item.active === (filters.active === 'true'));
      return matchesQ && matchesActive;
    });
  }, [list, filters]);

  return (
    <section>
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h3 className="small" style={{ marginBottom: 0 }}>Issue Types</h3>
        <button className="btn btn-accent" onClick={()=>setCreating(true)} disabled={!canManage}><i className="fas fa-plus"></i> New Type</button>
      </div>
      <div className="card" style={{ padding: 12, marginBottom: 12 }}>
        <div className="filters">
          <input className="input" placeholder="Search key or label" value={filters.q} onChange={e=>setFilters({ ...filters, q: e.target.value })} />
          <select className="btn-outline" value={filters.active} onChange={e=>setFilters({ ...filters, active: e.target.value })}>
            <option value="">Active (all)</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
          <button className="btn btn-secondary" onClick={()=>setFilters({ q:'', active:'' })}><i className="fas fa-undo"></i> Reset</button>
        </div>
      </div>
  {creating && canManage && <TypeForm roles={roles} canDebug={canDebug} onSave={onCreate} onCancel={()=>setCreating(false)} />}
      {loading ? (
        <div className="small">Loading...</div>
      ) : (
        <div className="table" role="table" aria-label="Issue Types" style={{ '--cols': '1fr 1.2fr 0.8fr 0.6fr 0.8fr' }}>
          <div className="table-row header" role="row">
            <div className="cell" role="columnheader">Key</div>
            <div className="cell" role="columnheader">Label</div>
            <div className="cell" role="columnheader">Icon</div>
            <div className="cell" role="columnheader">Active</div>
            <div className="cell" role="columnheader">Actions</div>
          </div>
          {filtered.map(item => (
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
          {!filtered.length && (
            <div className="table-row" role="row"><div className="cell" role="cell">No issue types found. {canManage && (<button className="btn btn-link" onClick={()=>setCreating(true)}>Create one</button>)}</div></div>
          )}
        </div>
      )}
  {editing && canManage && <TypeForm roles={roles} canDebug={canDebug} initial={editing} onSave={(data)=>onUpdate(editing.id, data)} onCancel={()=>setEditing(null)} />}
    </section>
  );
};

export default AdminIssueTypes;
