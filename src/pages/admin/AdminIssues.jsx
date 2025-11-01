import React from 'react';
import { listIssuesAdmin, updateIssueStatusAdmin, listStations, listIssueTypes } from '../../services/adminService';
import { exportToCsv, getStationName } from '../../utils/helpers';
import { useAuth } from '../../hooks/useAuth';
import { fetchPermissionsMatrix, hasPermission, normalizeRole } from '../../utils/permissions';

const AdminIssues = () => {
  const { user } = useAuth();
  const roleKey = normalizeRole(user?.role);
  const [matrix, setMatrix] = React.useState(null);

  const [filters, setFilters] = React.useState({ stationId: '', issueType: '', priority: '', status: '', dateFrom: '', dateTo: '' });
  const [stations, setStations] = React.useState([]);
  const [types, setTypes] = React.useState([]);
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [cursor, setCursor] = React.useState(null);
  const [selected, setSelected] = React.useState({});

  const canManage = matrix ? hasPermission(matrix, roleKey, 'manage_issues') : false;

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      const [m, s, t] = await Promise.all([
        fetchPermissionsMatrix(),
        listStations(),
        listIssueTypes(),
      ]);
      if (!mounted) return;
      setMatrix(m); setStations(s); setTypes(t);
    })();
    return () => { mounted = false; };
  }, []);

  const toDate = (val) => (val ? new Date(val + 'T00:00:00') : undefined);

  const load = React.useCallback(async (append = false, withCursor = null) => {
    setLoading(true);
    try {
      const { items, cursor: next } = await listIssuesAdmin({
        stationId: filters.stationId || undefined,
        issueType: filters.issueType || undefined,
        priority: filters.priority || undefined,
        status: filters.status || undefined,
        dateFrom: toDate(filters.dateFrom),
        dateTo: filters.dateTo ? new Date(filters.dateTo + 'T23:59:59') : undefined,
      }, 25, withCursor);
      setRows(prev => append ? [...prev, ...items] : items);
      setCursor(next);
      if (!append) setSelected({});
    } finally { setLoading(false); }
  }, [filters.dateFrom, filters.dateTo, filters.issueType, filters.priority, filters.stationId, filters.status]);

  // initial load after permissions/station/type are ready
  React.useEffect(() => { if (matrix) { load(false, null); } }, [matrix, load]);

  const reset = () => { setFilters({ stationId:'', issueType:'', priority:'', status:'', dateFrom:'', dateTo:'' }); };

  const toggleSelect = (id) => setSelected(prev => ({ ...prev, [id]: !prev[id] }));
  const allSelected = rows.length && rows.every(r => selected[r.id]);
  const toggleAll = () => {
    if (allSelected) setSelected({}); else {
      const s = {}; rows.forEach(r => s[r.id] = true); setSelected(s);
    }
  };

  const bulkSetStatus = async (status) => {
    const ids = Object.keys(selected).filter(k => selected[k]);
    if (ids.length === 0) return;
    if (!canManage) return;
    if (!window.confirm(`Set status to '${status}' for ${ids.length} issues?`)) return;
    await Promise.all(ids.map(id => updateIssueStatusAdmin(id, status)));
    await load(false, null);
  };

  const priorityOptions = ['low','medium','high'];
  const statusOptions = ['reported','in-progress','resolved'];

  if (!matrix) return <div className="small">Loading...</div>;

  return (
    <section>
      <div className="section-header" style={{ justifyContent: 'space-between', display: 'flex' }}>
        <h3 className="small" style={{ marginBottom: 0 }}>Issues</h3>
        <div className="d-flex" style={{ gap: 8 }}>
          <button className="btn btn-outline" onClick={() => exportToCsv('issues.csv', rows)} disabled={!rows.length}><i className="fas fa-download"></i> Export CSV</button>
        </div>
      </div>

      <div className="card" style={{ padding: 12, marginBottom: 12 }}>
        <div className="d-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
          <select className="btn-outline" value={filters.stationId} onChange={e=>setFilters({ ...filters, stationId: e.target.value })}>
            <option value="">— Station —</option>
            {stations.map(s => <option key={s.id} value={s.code}>{s.name || s.code}</option>)}
          </select>
          <select className="btn-outline" value={filters.issueType} onChange={e=>setFilters({ ...filters, issueType: e.target.value })}>
            <option value="">— Issue Type —</option>
            {types.map(t => <option key={t.id} value={t.key}>{t.label || t.key}</option>)}
          </select>
          <select className="btn-outline" value={filters.priority} onChange={e=>setFilters({ ...filters, priority: e.target.value })}>
            <option value="">— Priority —</option>
            {priorityOptions.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select className="btn-outline" value={filters.status} onChange={e=>setFilters({ ...filters, status: e.target.value })}>
            <option value="">— Status —</option>
            {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <input className="input" type="date" value={filters.dateFrom} onChange={e=>setFilters({ ...filters, dateFrom: e.target.value })} />
          <input className="input" type="date" value={filters.dateTo} onChange={e=>setFilters({ ...filters, dateTo: e.target.value })} />
        </div>
        <div className="d-flex" style={{ gap: 8, marginTop: 8 }}>
          <button className="btn btn-primary" onClick={() => load(false, null)} disabled={loading}><i className="fas fa-search"></i> Search</button>
          <button className="btn btn-secondary" onClick={reset} disabled={loading}><i className="fas fa-undo"></i> Reset</button>
        </div>
      </div>

      <div className="card" style={{ padding: 12 }}>
        <div className="d-flex" style={{ gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={() => bulkSetStatus('in-progress')} disabled={!canManage}><i className="fas fa-play"></i> Mark In-Progress</button>
          <button className="btn btn-outline" onClick={() => bulkSetStatus('resolved')} disabled={!canManage}><i className="fas fa-check"></i> Mark Resolved</button>
          <button className="btn btn-outline" onClick={() => load(true, cursor)} disabled={loading || !cursor}><i className="fas fa-angle-down"></i> Load More</button>
        </div>
        <div className="table" role="table" aria-label="Issues">
          <div className="table-row header" role="row">
            <div className="cell" role="columnheader"><label className="chip"><input type="checkbox" checked={allSelected} onChange={toggleAll} /></label></div>
            <div className="cell" role="columnheader">ID</div>
            <div className="cell" role="columnheader">Station</div>
            <div className="cell" role="columnheader">Type</div>
            <div className="cell" role="columnheader">Priority</div>
            <div className="cell" role="columnheader">Status</div>
            <div className="cell" role="columnheader">Created</div>
          </div>
          {rows.map(r => (
            <div key={r.id} className="table-row" role="row">
              <div className="cell" role="cell"><label className="chip"><input type="checkbox" checked={!!selected[r.id]} onChange={() => toggleSelect(r.id)} /></label></div>
              <div className="cell" role="cell">{r.id}</div>
              <div className="cell" role="cell">{getStationName(r.stationId)}</div>
              <div className="cell" role="cell">{r.issueType}</div>
              <div className="cell" role="cell">{r.priority}</div>
              <div className="cell" role="cell">{r.status}</div>
              <div className="cell" role="cell">{r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'}</div>
            </div>
          ))}
          {!rows.length && !loading && (
            <div className="table-row" role="row"><div className="cell" role="cell">No issues found.</div></div>
          )}
        </div>
      </div>
    </section>
  );
};

export default AdminIssues;
