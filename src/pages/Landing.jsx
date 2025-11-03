import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import { getDoc } from 'firebase/firestore';
import { getSettingsDocRef } from '../services/adminService';

const Feature = ({ icon, title, children }) => (
  <div className="card" style={{ padding: 16 }}>
    <div className="d-flex" style={{ alignItems: 'center', gap: 10 }}>
      <i className={`fas fa-${icon}`} style={{ fontSize: 20 }}></i>
      <h3 className="small" style={{ margin: 0 }}>{title}</h3>
    </div>
    <div className="small" style={{ marginTop: 8 }}>{children}</div>
  </div>
);

const Landing = () => {
  const { user, login } = useAuth();
  const [enableGoogle, setEnableGoogle] = React.useState(() => String(process.env.REACT_APP_ENABLE_GOOGLE_SIGNIN || 'false').toLowerCase() === 'true');

  React.useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(getSettingsDocRef('app'));
        if (snap.exists()) setEnableGoogle(!!snap.data()?.enableGoogleSignIn);
      } catch (_) { /* ignore */ }
    })();
  }, []);

  return (
    <div className="container">
      <section className="hero card" style={{ padding: 24, display:'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16 }}>
        <div>
          <h1 style={{ marginTop: 0 }}>Sunbeth COCO Issue Tracker</h1>
          <p className="lead">A modern, secure platform to report, track, and resolve COCO station issues with audit trails and powerful admin tools.</p>
          <ul className="small" style={{ lineHeight: 1.7 }}>
            <li>Fast issue reporting with photos and priority levels</li>
            <li>Role-based dashboards and admin console</li>
            <li>Audit logs, approvals, and analytics</li>
          </ul>
          {user ? (
            <Link className="btn btn-primary" to="/dashboard"><i className="fas fa-home"></i> Go to Dashboard</Link>
          ) : (
            <div className="d-flex" style={{ gap: 8, flexWrap: 'wrap' }}>
              {enableGoogle ? (
                <>
                  <button className="btn btn-primary" onClick={()=>login('google')}><i className="fab fa-google"></i> Sign in with Google</button>
                  <button className="btn btn-secondary" onClick={()=>login('msal')}><i className="fab fa-microsoft"></i> Sign in with Microsoft</button>
                </>
              ) : (
                <button className="btn btn-primary" onClick={()=>login('msal')}><i className="fas fa-sign-in-alt"></i> Sign in</button>
              )}
            </div>
          )}
        </div>
        <div className="hero-media" aria-hidden>
          <div style={{
            height: 260,
            borderRadius: 12,
            background: 'linear-gradient(135deg, rgba(0,119,182,0.15), rgba(76,175,80,0.15))',
            border: 'var(--border)',
            display: 'grid', placeItems: 'center'
          }}>
            <i className="fas fa-gas-pump" style={{ fontSize: 96, color: 'var(--accent, #0077b6)' }}></i>
          </div>
        </div>
      </section>

      <section className="card" style={{ padding: 16, marginTop: 16 }}>
        <div className="section-header"><h3 className="small">What you can do</h3></div>
        <div className="d-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))', gap: 12 }}>
          <Feature icon="plus-circle" title="Report Issues">Capture details and photos; we route and track to closure.</Feature>
          <Feature icon="tachometer-alt" title="Dashboard">KPIs, charts, and PDF/PNG exports for performance reviews.</Feature>
          <Feature icon="cog" title="Admin Console">Configure stations, issue types, and user permissions.</Feature>
          {/* <Feature icon="shield-alt" title="Enterprise Security">Firebase Auth, Firestore rules, and audit trails built-in.</Feature> */}
        </div>
      </section>
    </div>
  );
};

export default Landing;
