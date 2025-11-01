import React from 'react';
import { saveAppSettings, getSettingsDocRef } from '../../services/adminService';
import { getDoc } from 'firebase/firestore';
import { isDemoEnabled, setDemoEnabled } from '../../utils/featureFlags';

const AdminSettings = () => {
  const [form, setForm] = React.useState({ maxPhotos: 3, maxPhotoSize: 5*1024*1024, csvExport: true });
  const [demo, setDemo] = React.useState(isDemoEnabled());
  const [saving, setSaving] = React.useState(false);

  const env = {
    environment: process.env.REACT_APP_ENVIRONMENT,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    clientId: process.env.REACT_APP_CLIENT_ID,
    tenantId: process.env.REACT_APP_TENANT_ID,
  };

  const load = async () => {
    const snap = await getDoc(getSettingsDocRef('app'));
    const data = snap.exists() ? snap.data() : {};
    setForm(prev => ({ ...prev, ...data }));
  };
  React.useEffect(()=>{ load(); },[]);

  const save = async () => {
    setSaving(true);
    try { await saveAppSettings(form); } finally { setSaving(false); }
  };

  const toggleDemo = () => {
    const next = !demo; setDemoEnabled(next); setDemo(next);
  };

  return (
    <section>
      <div className="card" style={{ padding: 12, marginBottom: 12 }}>
        <div className="section-header" style={{ justifyContent: 'space-between', display: 'flex' }}>
          <h3 className="small" style={{ marginBottom: 0 }}>Application Settings</h3>
          <button className="btn btn-success" onClick={save} disabled={saving}><i className="fas fa-save"></i> Save</button>
        </div>
        <div className="d-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))', gap: 12 }}>
          <label className="small">Max Photos
            <input className="input" type="number" value={form.maxPhotos} onChange={e=>setForm({ ...form, maxPhotos: Number(e.target.value) })} />
          </label>
          <label className="small">Max Photo Size (bytes)
            <input className="input" type="number" value={form.maxPhotoSize} onChange={e=>setForm({ ...form, maxPhotoSize: Number(e.target.value) })} />
          </label>
          <label className="chip toggle" style={{ alignSelf: 'end' }}>
            <input type="checkbox" checked={!!form.csvExport} onChange={e=>setForm({ ...form, csvExport: e.target.checked })} /> Enable CSV Export
          </label>
          <label className="chip toggle" style={{ alignSelf: 'end' }}>
            <input type="checkbox" checked={demo} onChange={toggleDemo} /> Demo Mode
          </label>
        </div>
      </div>

      <div className="card" style={{ padding: 12 }}>
        <div className="section-header"><h3 className="small">Environment</h3></div>
        <div className="d-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          {Object.entries(env).map(([k,v]) => (
            <div className="card" style={{ padding: 12 }} key={k}>
              <div className="small muted">{k}</div>
              <div className="h3" style={{ margin: 0, wordBreak: 'break-all' }}>{v || '—'}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AdminSettings;
