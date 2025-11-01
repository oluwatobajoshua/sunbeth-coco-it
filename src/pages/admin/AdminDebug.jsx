import React from 'react';
import { demoIssues } from '../../demo/data';
import { collection, addDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { toast } from 'react-hot-toast';
import { isDemoEnabled, setDemoEnabled } from '../../utils/featureFlags';

const AdminDebug = () => {
  const [busy, setBusy] = React.useState(false);

  const seedDemo = async () => {
    setBusy(true);
    try {
      const col = collection(db, 'issues');
      for (const it of demoIssues.slice(0, 30)) {
        const payload = { ...it };
        // Convert Date to Timestamp-like ISO strings; serverTimestamp would be ideal
        payload.createdAt = it.createdAt; // Firestore SDK can accept Date
        if (it.resolvedAt) payload.resolvedAt = it.resolvedAt;
        await addDoc(col, payload);
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

  return (
    <section className="card" style={{ padding: 12 }}>
      <div className="section-header"><h3 className="small">Debug Tools</h3></div>
      <div className="d-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px,1fr))', gap: 12 }}>
        <button className="btn btn-outline" onClick={seedDemo} disabled={busy}><i className="fas fa-database"></i> Seed Demo Issues</button>
        <button className="btn btn-outline" onClick={clearIssues} disabled={busy}><i className="fas fa-trash"></i> Clear All Issues</button>
        <button className="btn btn-outline" onClick={toggleDemo}><i className="fas fa-magic"></i> Toggle Demo Mode</button>
        <button className="btn btn-outline" onClick={clearLocal}><i className="fas fa-broom"></i> Clear Local Storage</button>
      </div>
      <div className="small muted" style={{ marginTop: 8 }}>Use with care. Consider role-restricting these to Super Admin.</div>
    </section>
  );
};

export default AdminDebug;
