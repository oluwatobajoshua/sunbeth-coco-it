import React from 'react';
import { fetchPermissionsMatrix, hasPermission, normalizeRole } from '../../utils/permissions';
import { useAuth } from '../../hooks/useAuth';
import { saveAppSettings, getSettingsDocRef, saveEscalationSettings } from '../../services/adminService';
import { getDoc } from 'firebase/firestore';
import { isDemoEnabled, setDemoEnabled } from '../../utils/featureFlags';
import { auth } from '../../services/firebase';

const AdminSettings = () => {
  const [form, setForm] = React.useState({
    maxPhotos: 3,
    maxPhotoSize: 5 * 1024 * 1024,
    csvExport: true,
    emailNotifications: true,
    smsNotifications: false,
    teamsNotifications: false,
    requireTwoPersonApproval: false,
    approvalsTeamsWebhookUrl: '',
    approverEmails: [],
    notificationEmails: ['engineering@cocostation.com'],
    slaByPriority: { low: 72, medium: 24, high: 4 },
    enableGoogleSignIn: false,
  });
  const [escalation, setEscalation] = React.useState({
    enabled: false,
    channels: { email: true, sms: false, teams: false },
    targets: ['engineering@cocostation.com'],
    policy: { level1Minutes: 30, level2Minutes: 120 },
  });
  const [demo, setDemo] = React.useState(isDemoEnabled());
  const [saving, setSaving] = React.useState(false);
  const [savingEsc, setSavingEsc] = React.useState(false);
  const [matrix, setMatrix] = React.useState(null);
  const { user } = useAuth();
  const [firebaseReady, setFirebaseReady] = React.useState(!!auth.currentUser);

  React.useEffect(() => {
    const unsub = auth.onAuthStateChanged(() => setFirebaseReady(!!auth.currentUser));
    return () => unsub();
  }, []);

  const roleKey = normalizeRole(user?.role);
  const canManageSettings = roleKey === 'super_admin' || roleKey === 'admin' || (matrix && hasPermission(matrix, roleKey, 'manage_settings'));

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
    // Load escalation settings
    const escSnap = await getDoc(getSettingsDocRef('escalation'));
    if (escSnap.exists()) {
      const esc = escSnap.data();
      setEscalation(prev => ({ ...prev, ...esc }));
    }
  };
  React.useEffect(()=>{ if (firebaseReady) { load(); } },[firebaseReady]);
  React.useEffect(()=>{ (async () => { const m = await fetchPermissionsMatrix(); setMatrix(m); })(); },[]);

  const save = async () => {
    setSaving(true);
    try {
      await saveAppSettings(form);
    } catch (e) {
      window.alert(e?.message || 'Failed to save settings');
    } finally { setSaving(false); }
  };

  const saveEscalation = async () => {
    setSavingEsc(true);
    try {
      await saveEscalationSettings(escalation);
    } catch (e) {
      window.alert(e?.message || 'Failed to save escalation settings');
    } finally { setSavingEsc(false); }
  };

  const toggleDemo = () => {
    const next = !demo; setDemoEnabled(next); setDemo(next);
  };

  return (
    <section>
      <div className="card" style={{ padding: 12, marginBottom: 12 }}>
        <div className="section-header" style={{ justifyContent: 'space-between', display: 'flex' }}>
          <h3 className="small" style={{ marginBottom: 0 }}>Application Settings</h3>
          <button className="btn btn-success" onClick={save} disabled={saving || !canManageSettings} title={!canManageSettings ? 'You do not have permission to manage settings' : undefined}><i className="fas fa-save"></i> Save</button>
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
            <input type="checkbox" checked={!!form.emailNotifications} onChange={e=>setForm({ ...form, emailNotifications: e.target.checked })} /> Email Notifications
          </label>
          <label className="chip toggle" style={{ alignSelf: 'end' }}>
            <input type="checkbox" checked={!!form.smsNotifications} onChange={e=>setForm({ ...form, smsNotifications: e.target.checked })} /> SMS Notifications
          </label>
          <label className="chip toggle" style={{ alignSelf: 'end' }}>
            <input type="checkbox" checked={!!form.teamsNotifications} onChange={e=>setForm({ ...form, teamsNotifications: e.target.checked })} /> Teams Notifications
          </label>
          <label className="chip toggle" style={{ alignSelf: 'end' }}>
            <input type="checkbox" checked={!!form.requireTwoPersonApproval} onChange={e=>setForm({ ...form, requireTwoPersonApproval: e.target.checked })} /> Require two-person approval to close
          </label>
          <label className="chip toggle" style={{ alignSelf: 'end' }} title="Controls whether the Google sign-in option appears after users are authenticated. Pre-login pages also honor the REACT_APP_ENABLE_GOOGLE_SIGNIN env flag.">
            <input type="checkbox" checked={!!form.enableGoogleSignIn} onChange={e=>setForm({ ...form, enableGoogleSignIn: e.target.checked })} /> Enable Google Sign-in
          </label>
          <label className="small">Teams Approvals Webhook URL
            <input className="input" type="text" value={form.approvalsTeamsWebhookUrl || ''} onChange={e=>setForm({ ...form, approvalsTeamsWebhookUrl: e.target.value })} placeholder="https://outlook.office.com/webhook/..." />
          </label>
          <label className="small" style={{ gridColumn: '1 / -1' }}>Approver Emails (comma-separated)
            <input className="input" type="text" value={(form.approverEmails||[]).join(', ')}
              onChange={e=>{
                const arr = e.target.value.split(',').map(s=>s.trim()).filter(Boolean);
                setForm({ ...form, approverEmails: arr });
              }}
            />
          </label>
          <label className="small" style={{ gridColumn: '1 / -1' }}>Notification Emails (comma-separated)
            <input className="input" type="text" value={(form.notificationEmails||[]).join(', ')}
              onChange={e=>{
                const arr = e.target.value.split(',').map(s=>s.trim()).filter(Boolean);
                setForm({ ...form, notificationEmails: arr });
              }}
            />
          </label>

          <div className="card" style={{ padding: 8 }}>
            <div className="small muted" style={{ marginBottom: 6 }}>SLA by Priority (hours)</div>
            <div className="d-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 8 }}>
              <label className="small">Low
                <input className="input" type="number" value={form.slaByPriority?.low || 0}
                  onChange={e=>setForm({ ...form, slaByPriority: { ...form.slaByPriority, low: Number(e.target.value) } })}
                />
              </label>
              <label className="small">Medium
                <input className="input" type="number" value={form.slaByPriority?.medium || 0}
                  onChange={e=>setForm({ ...form, slaByPriority: { ...form.slaByPriority, medium: Number(e.target.value) } })}
                />
              </label>
              <label className="small">High
                <input className="input" type="number" value={form.slaByPriority?.high || 0}
                  onChange={e=>setForm({ ...form, slaByPriority: { ...form.slaByPriority, high: Number(e.target.value) } })}
                />
              </label>
            </div>
          </div>
          <label className="chip toggle" style={{ alignSelf: 'end' }}>
            <input type="checkbox" checked={demo} onChange={toggleDemo} /> Demo Mode
          </label>
        </div>
      </div>

      <div className="card" style={{ padding: 12, marginBottom: 12 }}>
        <div className="section-header" style={{ justifyContent: 'space-between', display: 'flex' }}>
          <h3 className="small" style={{ marginBottom: 0 }}>Escalation Settings</h3>
          <button className="btn btn-success" onClick={saveEscalation} disabled={savingEsc || !canManageSettings} title={!canManageSettings ? 'You do not have permission to manage settings' : undefined}><i className="fas fa-save"></i> Save</button>
        </div>
        <div className="d-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px,1fr))', gap: 12 }}>
          <label className="chip toggle" style={{ alignSelf: 'end' }}>
            <input type="checkbox" checked={!!escalation.enabled} onChange={e=>setEscalation({ ...escalation, enabled: e.target.checked })} /> Enable Escalation
          </label>

          <label className="chip toggle" style={{ alignSelf: 'end' }}>
            <input type="checkbox" checked={!!escalation.channels?.email} onChange={e=>setEscalation({ ...escalation, channels: { ...escalation.channels, email: e.target.checked } })} /> Email Channel
          </label>
          <label className="chip toggle" style={{ alignSelf: 'end' }}>
            <input type="checkbox" checked={!!escalation.channels?.sms} onChange={e=>setEscalation({ ...escalation, channels: { ...escalation.channels, sms: e.target.checked } })} /> SMS Channel
          </label>
          <label className="chip toggle" style={{ alignSelf: 'end' }}>
            <input type="checkbox" checked={!!escalation.channels?.teams} onChange={e=>setEscalation({ ...escalation, channels: { ...escalation.channels, teams: e.target.checked } })} /> Teams Channel
          </label>

          <label className="small" style={{ gridColumn: '1 / -1' }}>Targets (comma-separated emails)
            <input className="input" type="text" value={(escalation.targets||[]).join(', ')}
              onChange={e=>{
                const arr = e.target.value.split(',').map(s=>s.trim()).filter(Boolean);
                setEscalation({ ...escalation, targets: arr });
              }}
            />
          </label>

          <label className="small">Level 1 (minutes)
            <input className="input" type="number" value={escalation.policy?.level1Minutes || 0}
              onChange={e=>setEscalation({ ...escalation, policy: { ...escalation.policy, level1Minutes: Number(e.target.value) } })}
            />
          </label>
          <label className="small">Level 2 (minutes)
            <input className="input" type="number" value={escalation.policy?.level2Minutes || 0}
              onChange={e=>setEscalation({ ...escalation, policy: { ...escalation.policy, level2Minutes: Number(e.target.value) } })}
            />
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
