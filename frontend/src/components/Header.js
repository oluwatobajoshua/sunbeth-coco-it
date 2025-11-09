import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import DebugAuthChip from './DebugAuthChip';
import { getDoc } from 'firebase/firestore';
import { getSettingsDocRef } from '../services/adminService';
import { isDemoEnabled, setDemoEnabled } from '../utils/featureFlags';
import toast from 'react-hot-toast';

const Header = () => {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const [demo, setDemo] = React.useState(isDemoEnabled());
  const [enableGoogle, setEnableGoogle] = React.useState(() => String(process.env.REACT_APP_ENABLE_GOOGLE_SIGNIN || 'false').toLowerCase() === 'true');

  // Load toggle from DB settings so Admin panel controls pre-login buttons
  React.useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(getSettingsDocRef('app'));
        if (snap.exists()) {
          const val = !!snap.data()?.enableGoogleSignIn;
          setEnableGoogle(val);
        }
      } catch (_) { /* ignore */ }
    })();
  }, []);

  const toggleDemo = React.useCallback(() => {
    const next = !demo;
    setDemoEnabled(next);
    setDemo(next);
    toast.success(`Demo data ${next ? 'enabled' : 'disabled'}. Reloading...`);
    setTimeout(() => window.location.reload(), 600);
  }, [demo]);

  return (
    <header className="sticky">
      <div className="header-inner">
        <div className="brand">
          <div className="brand-icon">
            <i className="fas fa-gas-pump"></i>
          </div>
          <div className="brand-text">
            <div className="h1">COCO Issue Tracker</div>
            <div className="brand-subtitle">by Sunbeth Energies</div>
          </div>
        </div>

        {user ? (
          <div className="user">
            <DebugAuthChip />
            <nav className="d-none d-md-flex" aria-label="Primary">
              <Link to="/dashboard" className="btn ghost" title="Dashboard">
                <i className="fas fa-home"></i>
              </Link>
              <Link to="/report" className="btn ghost" title="New Issue">
                <i className="fas fa-plus"></i>
              </Link>
              <Link to="/issues" className="btn ghost" title="All Issues">
                <i className="fas fa-table"></i>
              </Link>
              <Link to="/admin" className="btn ghost" title="Admin">
                <i className="fas fa-cog"></i>
              </Link>
            </nav>
            <div className="user-info">
              <div className="user-avatar">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="user-name">{user.name}</span>
            </div>
            <button className="btn ghost" onClick={toggle} title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
              <i className={`fas fa-${theme === 'dark' ? 'sun' : 'moon'}`}></i>
            </button>
            <button className={`btn ghost ${demo ? 'active' : ''}`} onClick={toggleDemo} title="Toggle demo data">
              <i className="fas fa-magic"></i>
              <span className="d-none d-md-inline" style={{ marginLeft: 6 }}>{demo ? 'Demo: On' : 'Demo: Off'}</span>
            </button>
            <button className="btn ghost" onClick={async ()=>{ await logout(); navigate('/'); }} title="Sign out">
              <i className="fas fa-sign-out-alt"></i>
            </button>
          </div>
        ) : (
          <div className="user d-flex" style={{ gap: 8 }}>
            {enableGoogle ? (
              <>
                <button className="btn btn-primary" onClick={()=>login('google')} title="Sign in with Google">
                  <i className="fab fa-google" style={{ marginRight: 6 }}></i>
                  Google
                </button>
                <button className="btn btn-secondary" onClick={()=>login('msal')} title="Sign in with Microsoft">
                  <i className="fab fa-microsoft" style={{ marginRight: 6 }}></i>
                  Microsoft
                </button>
              </>
            ) : (
              <button className="btn btn-primary" onClick={()=>login('msal')} title="Sign in">
                <i className="fas fa-sign-in-alt" style={{ marginRight: 6 }}></i>
                Sign in
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;