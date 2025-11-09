import React from 'react';
import { listIssuesAdmin, updateIssueStatusAdmin, listStations, listIssueTypes, closeIssueAdmin, requestCloseApproval } from '../../services/adminService';
import { exportToCsv, getStationName } from '../../utils/helpers';
import { useAuth } from '../../hooks/useAuth';
import { auth } from '../../services/firebase';
import { fetchPermissionsMatrix, hasPermission, normalizeRole } from '../../utils/permissions';
import { getOptions } from '../../services/optionsService';

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
  const [closing, setClosing] = React.useState(false);
  const [closeModal, setCloseModal] = React.useState(false);
  const [closeNote, setCloseNote] = React.useState('');
  const [closeFile, setCloseFile] = React.useState(null);
  const [appSettings, setAppSettings] = React.useState({ requireTwoPersonApproval: false });
  const [firebaseReady, setFirebaseReady] = React.useState(!!auth.currentUser);

  React.useEffect(() => {
    const unsub = auth.onAuthStateChanged(() => setFirebaseReady(!!auth.currentUser));
    return () => unsub();
  }, []);
  const [viewModal, setViewModal] = React.useState(false);
  const [viewIssue, setViewIssue] = React.useState(null);

  const canManage = matrix ? hasPermission(matrix, roleKey, 'manage_issues') : false;

  React.useEffect(() => {
    let mounted = true;
    if (!firebaseReady) return; // wait for Firebase Auth session
    (async () => {
      try {
        const [m, s, t] = await Promise.all([
          fetchPermissionsMatrix(),
          listStations(),
          listIssueTypes(),
        ]);
        if (!mounted) return;
        setMatrix(m); setStations(s); setTypes(t);
      } catch (e) {
        window.alert(e?.message || 'Failed to load admin data');
      }
      // Load app settings for approval flag
      try {
        const { getSettingsDocRef } = await import('../../services/adminService');
        const { getDoc } = await import('firebase/firestore');
        const snap = await getDoc(getSettingsDocRef('app'));
        if (snap.exists()) setAppSettings(prev => ({ ...prev, ...snap.data() }));
      } catch (_) {}
    })();
    return () => { mounted = false; };
  }, [firebaseReady]);

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
    } catch (e) {
      const msg = e?.message || 'Failed to load issues';
      window.alert(msg);
    } finally { setLoading(false); }
  }, [filters.dateFrom, filters.dateTo, filters.issueType, filters.priority, filters.stationId, filters.status]);

  // initial load after permissions/station/type are ready
  React.useEffect(() => { if (matrix && firebaseReady) { load(false, null); } }, [matrix, firebaseReady, load]);

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
    if (status === 'closed') {
      setCloseModal(true);
      return;
    }
    if (!window.confirm(`Set status to '${status}' for ${ids.length} issues?`)) return;
    try {
      await Promise.all(ids.map(id => updateIssueStatusAdmin(id, status)));
      await load(false, null);
    } catch (e) {
      window.alert(e?.message || 'Failed to update status');
    }
  };

  const [priorityOptions, setPriorityOptions] = React.useState(['low','medium','high']);
  const [statusOptions, setStatusOptions] = React.useState(['reported','in-progress','resolved','pending_approval','closed']);

  // Load dropdown options (priorities/statuses) from Firestore settings
  React.useEffect(() => {
    (async () => {
      try {
        const opts = await getOptions();
        const pr = Array.isArray(opts?.priorities)
          ? opts.priorities.map(p => (typeof p === 'string' ? p : p?.value)).filter(Boolean)
          : ['low','medium','high'];
        const st = Array.isArray(opts?.statuses) && opts.statuses.length
          ? opts.statuses
          : ['reported','in-progress','resolved','pending_approval','closed'];
        setPriorityOptions(pr);
        setStatusOptions(st);
      } catch (_) { /* ignore */ }
    })();
  }, []);

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
        <div className="filters">
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
          <button className="btn btn-primary" onClick={() => load(false, null)} disabled={loading}><i className="fas fa-search"></i> Search</button>
          <button className="btn btn-secondary" onClick={reset} disabled={loading}><i className="fas fa-undo"></i> Reset</button>
        </div>
      </div>

      <div className="card" style={{ padding: 12 }}>
        <div className="d-flex" style={{ gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={() => bulkSetStatus('in-progress')} disabled={!canManage}><i className="fas fa-play"></i> Mark In-Progress</button>
          <button className="btn btn-outline" onClick={() => bulkSetStatus('resolved')} disabled={!canManage}><i className="fas fa-check"></i> Mark Resolved</button>
          <button className="btn btn-outline" onClick={() => bulkSetStatus('closed')} disabled={!canManage}><i className="fas fa-lock"></i> Mark Closed</button>
          <button className="btn btn-outline" onClick={() => load(true, cursor)} disabled={loading || !cursor}><i className="fas fa-angle-down"></i> Load More</button>
        </div>
        <div className="table" role="table" aria-label="Issues" style={{ '--cols': '0.6fr 1.2fr 1.2fr 1fr 0.8fr 1fr 1.2fr' }}>
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
              <div className="cell" role="cell"><button className="btn ghost sm" onClick={() => { setViewIssue(r); setViewModal(true); }}>{r.id}</button></div>
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
      {closeModal && (
        <div className="modal active" role="dialog" aria-modal="true">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Close Selected Issues</h2>
            </div>
            <div className="modal-body">
              <p className="small" style={{ marginBottom: 8 }}>Provide a short closure note and an optional photo as evidence. This will be applied to all selected issues.</p>
              <label className="small" style={{ display: 'block', marginBottom: 8 }}>Closure Note (required)
                <textarea className="input" rows={3} value={closeNote} onChange={e=>setCloseNote(e.target.value)} placeholder="What was done to close these issues?" />
              </label>
              <label className="small" style={{ display: 'block', marginBottom: 8 }}>Evidence Photo (optional)
                <input className="input" type="file" accept="image/*" onChange={e=>setCloseFile(e.target.files?.[0] || null)} />
              </label>
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={()=>{ if(!closing){ setCloseModal(false); setCloseNote(''); setCloseFile(null);} }}>Cancel</button>
              <button className="btn btn-primary" disabled={!closeNote || closing} onClick={async ()=>{
                const ids = Object.keys(selected).filter(k => selected[k]);
                if (!ids.length) { setCloseModal(false); return; }
                setClosing(true);
                try {
                  // Two-person approval path
                  if (appSettings.requireTwoPersonApproval) {
                    await Promise.all(ids.map(id => requestCloseApproval(id, { note: closeNote, file: closeFile }, user?.email)));
                  } else {
                    // Direct close path
                    await Promise.all(ids.map(id => closeIssueAdmin(id, { note: closeNote, file: closeFile }, user?.email)));
                  }
                  setCloseModal(false); setCloseNote(''); setCloseFile(null);
                  await load(false, null);
                } catch (e) {
                  window.alert(e?.message || 'Failed to submit closure');
                } finally { setClosing(false); }
              }}>{closing ? 'Closing…' : 'Confirm Close'}</button>
            </div>
          </div>
        </div>
      )}
      {viewModal && viewIssue && (
        <div className="modal active" role="dialog" aria-modal="true">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Issue {viewIssue.id}</h2>
            </div>
            <div className="modal-body" style={{ textAlign:'left' }}>
              <div className="small" style={{marginBottom:8}}><strong>Station:</strong> {getStationName(viewIssue.stationId)}</div>
              <div className="small" style={{marginBottom:8}}><strong>Type:</strong> {viewIssue.issueType || '—'}</div>
              <div className="small" style={{marginBottom:8}}><strong>Priority:</strong> {viewIssue.priority || '—'}</div>
              <div className="small" style={{marginBottom:8}}><strong>Status:</strong> {viewIssue.status || '—'}</div>
              <div className="small" style={{marginBottom:8}}><strong>Created:</strong> {viewIssue.createdAt ? new Date(viewIssue.createdAt).toLocaleString() : '—'}</div>
              {viewIssue.closureNote && (
                <div className="small" style={{marginTop:12}}>
                  <strong>Closure Note:</strong>
                  <div style={{whiteSpace:'pre-wrap'}}>{viewIssue.closureNote}</div>
                </div>
              )}
              {viewIssue.closurePhotoUrl && (
                <div className="small" style={{marginTop:12}}>
                  <strong>Closure Photo:</strong>
                  <div style={{marginTop:8}}>
                    <a href={viewIssue.closurePhotoUrl} target="_blank" rel="noreferrer">
                      <img src={viewIssue.closurePhotoUrl} alt="Closure" style={{maxWidth:'100%', borderRadius:8, border:'1px solid #eee'}} />
                    </a>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={()=>{ setViewModal(false); setViewIssue(null); }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default AdminIssues;
