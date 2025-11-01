import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { isDemoEnabled, setDemoEnabled } from '../utils/featureFlags';
import toast from 'react-hot-toast';

const Header = () => {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const [demo, setDemo] = React.useState(isDemoEnabled());

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

        {user && (
          <div className="user">
            <nav className="d-none d-md-flex" aria-label="Primary">
              <Link to="/" className="btn ghost" title="Dashboard">
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
            <button className="btn ghost" onClick={logout} title="Sign out">
              <i className="fas fa-sign-out-alt"></i>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;