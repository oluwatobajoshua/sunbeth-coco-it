import React from 'react';
import { useMsal } from '@azure/msal-react';
import { demoIssues } from '../../demo/data';
import { collection, addDoc, deleteDoc, getDocs, query, where, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db, storage, auth } from '../../services/firebase';
import firebaseConfig, { msalConfig } from '../../config';
import { signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { uploadIssuePhoto } from '../../services/storageAdapter';
import { toast } from 'react-hot-toast';
import * as graph from '../../services/graphService';
import { isDemoEnabled, setDemoEnabled } from '../../utils/featureFlags';

const AdminDebug = () => {
  const [busy, setBusy] = React.useState(false);
  const [health, setHealth] = React.useState(null);
  const [graphState, setGraphState] = React.useState({ me: null, lastError: null, mode: (typeof window!== 'undefined' && window.localStorage && localStorage.getItem('sunbeth:interactiveMode')) || (process.env.REACT_APP_MS_LOGIN_METHOD || 'popup') });
  const { instance, accounts } = useMsal();
  const account = accounts[0];

  const ensureFirebaseAuth = async () => {
    if (auth.currentUser) return true;
    // Try bridge: exchange MSAL id token for Firebase custom token
    try {
      if (account) {
        const response = await instance.acquireTokenSilent({
          account,
          scopes: ['openid','profile','email'],
          authority: msalConfig?.auth?.authority,
        });
        const endpoint = (process.env.REACT_APP_MSAL_FIREBASE_BRIDGE_URL || `https://us-central1-${firebaseConfig.projectId}.cloudfunctions.net/msalCustomToken`);
        const res = await fetch(endpoint, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ idToken: response.idToken }) });
        if (res.ok) {
          const { customToken } = await res.json();
          if (customToken) { await signInWithCustomToken(auth, customToken); return true; }
        }
      }
    } catch (_) {}
    // Emulator dev fallback
    try {
      const useEmu = process.env.REACT_APP_USE_EMULATORS === 'true';
      if (useEmu) { await signInAnonymously(auth); return true; }
    } catch (_) {}
    return false;
  };

  const seedDemo = async () => {
    setBusy(true);
    try {
      const col = collection(db, 'issues');
      for (const it of demoIssues.slice(0, 30)) {
        const payload = { ...it };
        // Convert Date to Timestamp-like ISO strings; serverTimestamp would be ideal
        payload.createdAt = it.createdAt; // Firestore SDK can accept Date
        if (it.resolvedAt) payload.resolvedAt = it.resolvedAt;
        // Skip if an issue with same id already exists
        const existsQ = query(col, where('id', '==', payload.id));
        const existsSnap = await getDocs(existsQ);
        if (existsSnap.empty) {
          await addDoc(col, payload);
        }
      }
      toast.success('Seeded demo issues');
    } catch (e) {
      console.error(e); toast.error('Seeding failed');
    } finally { setBusy(false); }
  };

  const clearIssues = async () => {
    if (!window.confirm('Delete ALL issues documents?')) return;
    setBusy(true);
    try {
      const snap = await getDocs(collection(db, 'issues'));
      const deletions = [];
      snap.forEach(d => deletions.push(deleteDoc(d.ref)));
      await Promise.all(deletions);
      toast.success('Cleared all issues');
    } catch (e) {
      console.error(e); toast.error('Clear failed');
    } finally { setBusy(false); }
  };

  const toggleDemo = () => {
    const next = !isDemoEnabled(); setDemoEnabled(next); toast.success(`Demo ${next?'enabled':'disabled'}`);
  };

  const clearLocal = () => {
    localStorage.clear(); sessionStorage.clear(); toast.success('Local storage cleared');
  };

  const setInteractiveMode = (mode) => {
    try { localStorage.setItem('sunbeth:interactiveMode', mode); toast.success(`Interactive mode set to ${mode}. Reloading…`); setTimeout(()=>window.location.reload(), 400); } catch (_) {}
  };

  const fetchGraphMe = async () => {
    setBusy(true);
    try {
      const me = await graph.getMe();
      setGraphState(s => ({ ...s, me, lastError: null }));
      toast.success('Fetched Graph /me');
    } catch (e) {
      setGraphState(s => ({ ...s, lastError: e?.message || String(e) }));
      toast.error('Graph /me failed');
    } finally { setBusy(false); }
  };

  const sendTestMail = async () => {
    const to = auth.currentUser?.email || account?.username;
    if (!to) { toast.error('No recipient email available from current session'); return; }
    setBusy(true);
    try {
      const html = `<div style="font-family:Segoe UI,Arial,sans-serif">Hello ${to},<br/>This is a test message from Sunbeth COCO Admin Debug.<br/><br/>Time: ${new Date().toLocaleString()}<br/>If you received this, Graph Mail.Send works.</div>`;
      await graph.sendMail({ to, subject: 'Sunbeth COCO: Graph test email', html });
      toast.success('Sent test email via Graph');
    } catch (e) {
      setGraphState(s => ({ ...s, lastError: e?.message || String(e) }));
      toast.error('Graph sendMail failed');
    } finally { setBusy(false); }
  };

  const runHealthCheck = async () => {
    setBusy(true);
    const result = { auth: false, firestoreWriteRead: false, storageUpload: false, details: {} };
    try {
      await ensureFirebaseAuth();
      // Auth check
      result.auth = !!auth.currentUser;
      result.details.user = auth.currentUser ? { uid: auth.currentUser.uid, email: auth.currentUser.email } : null;

  // Firestore write/read under health/probe (auth-only per rules)
  const healthDoc = doc(db, 'health', 'probe');
      const payload = { checkedAt: serverTimestamp(), clientTime: new Date().toISOString(), by: auth.currentUser?.email || null };
      await setDoc(healthDoc, payload, { merge: true });
      const readBack = await getDoc(healthDoc);
      result.firestoreWriteRead = readBack.exists();

      // Storage upload check
      const prefer = (process.env.REACT_APP_STORAGE_MODE || '').toLowerCase();
      if (prefer === 'local' || prefer === 'inline') {
        // Try adapter path with a tiny blob file
        const blob = new Blob([new Uint8Array([137,80,78,71])], { type: 'image/png' });
        const file = new File([blob], 'ping.png', { type: 'image/png' });
        const resp = await uploadIssuePhoto('healthcheck', file, 0);
        result.storageUpload = !!resp?.url;
        result.details.storageUrl = resp?.url;
      } else {
        const canvas = document.createElement('canvas');
        canvas.width = 1; canvas.height = 1;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#00FF00';
        ctx.fillRect(0, 0, 1, 1);
        const blob = await new Promise(res=>canvas.toBlob(res, 'image/png'));
        const key = `issues/healthcheck/ping_${Date.now()}.png`;
        const ref = storageRef(storage, key);
        const snap = await uploadBytes(ref, blob, { contentType: 'image/png' });
        const url = await getDownloadURL(snap.ref);
        result.storageUpload = !!url;
        result.details.storageUrl = url;
      }

      toast.success('Firebase health check passed');
    } catch (e) {
      console.error(e);
      toast.error('Firebase health check failed');
    } finally {
      setHealth(result);
      setBusy(false);
    }
  };

  return (
    <section className="card" style={{ padding: 12 }}>
      <div className="section-header"><h3 className="small">Debug Tools</h3></div>
      <div className="d-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px,1fr))', gap: 12 }}>
        <button className="btn btn-outline" onClick={seedDemo} disabled={busy}><i className="fas fa-database"></i> Seed Demo Issues</button>
        <button className="btn btn-outline" onClick={clearIssues} disabled={busy}><i className="fas fa-trash"></i> Clear All Issues</button>
        <button className="btn btn-outline" onClick={toggleDemo}><i className="fas fa-magic"></i> Toggle Demo Mode</button>
        <button className="btn btn-outline" onClick={clearLocal}><i className="fas fa-broom"></i> Clear Local Storage</button>
        <button className="btn btn-primary" onClick={runHealthCheck} disabled={busy}><i className="fas fa-heartbeat"></i> Firebase Health Check</button>
      </div>
      <div className="card" style={{ padding: 12, marginTop: 12 }}>
        <div className="section-header"><h3 className="small">Microsoft Auth & Graph</h3></div>
        <div className="d-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px,1fr))', gap: 12 }}>
          <div className="small">Interactive mode: <strong>{(graphState.mode||'popup')}</strong></div>
          <div className="d-flex" style={{ gap: 8 }}>
            <button className="btn btn-outline" onClick={()=>setInteractiveMode('popup')}><i className="fas fa-window-restore"></i> Use Popup</button>
            <button className="btn btn-outline" onClick={()=>setInteractiveMode('redirect')}><i className="fas fa-external-link-alt"></i> Use Redirect</button>
          </div>
          <div className="d-flex" style={{ gap: 8 }}>
            <button className="btn" onClick={fetchGraphMe} disabled={busy}><i className="fas fa-user-circle"></i> Graph: /me</button>
            <button className="btn" onClick={sendTestMail} disabled={busy}><i className="fas fa-paper-plane"></i> Send Test Email</button>
          </div>
        </div>
        {graphState.me && (
          <div className="card" style={{ marginTop: 8, padding: 8 }}>
            <div className="small"><strong>/me</strong> response:</div>
            <pre className="small" style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(graphState.me, null, 2)}</pre>
          </div>
        )}
        {graphState.lastError && (
          <div className="small" style={{ color: 'var(--danger-color)', marginTop: 8 }}>Error: {graphState.lastError}</div>
        )}
      </div>
      {health && (
        <div className="card" style={{ padding: 12, marginTop: 12 }}>
          <div className="section-header"><h3 className="small">Health Check Results</h3></div>
          <ul className="small">
            <li>Auth: <strong style={{ color: health.auth ? 'var(--success-color)' : 'var(--danger-color)' }}>{String(health.auth)}</strong></li>
            <li>Firestore Write/Read: <strong style={{ color: health.firestoreWriteRead ? 'var(--success-color)' : 'var(--danger-color)' }}>{String(health.firestoreWriteRead)}</strong></li>
            <li>Storage Upload: <strong style={{ color: health.storageUpload ? 'var(--success-color)' : 'var(--danger-color)' }}>{String(health.storageUpload)}</strong></li>
            {health.details?.storageUrl && (
              <li>Storage URL: <a href={health.details.storageUrl} target="_blank" rel="noreferrer">open</a></li>
            )}
          </ul>
        </div>
      )}
      <div className="small muted" style={{ marginTop: 8 }}>
        Use with care. Consider role-restricting these to Super Admin.
        <br />
        Storage mode: <strong>{(process.env.REACT_APP_STORAGE_MODE || 'inline').toLowerCase()}</strong>
      </div>
    </section>
  );
};

export default AdminDebug;
