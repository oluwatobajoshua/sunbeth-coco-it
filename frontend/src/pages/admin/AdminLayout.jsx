import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Link } from 'react-router-dom';
import DebugAuthChip from '../../components/DebugAuthChip';

const NavItem = ({ active, onClick, icon, label, badge }) => (
  <button
    className={`admin-nav-item ${active ? 'active' : ''}`}
    onClick={onClick}
  >
    <i className={`fas fa-${icon}`} aria-hidden style={{ width: 18, textAlign: 'center' }}></i>
    <span className="label">{label}</span>
    {badge ? <span className="badge chip">{badge}</span> : null}
  </button>
);

const AdminLayout = ({ section, setSection, children, visibleKeys }) => {
  const { user } = useAuth();
  const items = [
    { key: 'overview', label: 'Overview', icon: 'tachometer-alt' },
    { key: 'issues', label: 'Issues', icon: 'clipboard-list' },
    { key: 'stations', label: 'Stations', icon: 'gas-pump' },
    { key: 'types', label: 'Issue Types', icon: 'tags' },
    { key: 'users', label: 'Users', icon: 'users' },
    { key: 'roles', label: 'Roles', icon: 'user-tag' },
    { key: 'permissions', label: 'Permissions', icon: 'user-shield' },
    { key: 'settings', label: 'Settings', icon: 'cogs' },
    { key: 'debug', label: 'Debug', icon: 'tools' },
  ];
  const filtered = Array.isArray(visibleKeys) && visibleKeys.length
    ? items.filter(it => visibleKeys.includes(it.key))
    : items;

  return (
    <div className="admin-shell">
      <div className="admin-sidebar card">
        <div className="admin-brand">
          <div className="logo"><i className="fas fa-cog"></i></div>
          <div className="meta">
            <div className="title">Admin Console</div>
            <div className="subtitle">Sunbeth COCO</div>
          </div>
        </div>

        <nav className="admin-nav" aria-label="Admin Navigation">
          {filtered.map(it => (
            <NavItem
              key={it.key}
              active={section === it.key}
              onClick={() => setSection(it.key)}
              icon={it.icon}
              label={it.label}
            />
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="user-tile">
            <div className="avatar" aria-hidden>{(user?.name || 'U').charAt(0).toUpperCase()}</div>
            <div className="info">
              <div className="name">{user?.name || '—'}</div>
              <div className="role badge sunbeth-primary">{user?.role || 'Viewer'}</div>
            </div>
          </div>
          <Link to="/dashboard" className="btn full">Back to Dashboard</Link>
        </div>
      </div>

      <div className="admin-main">
        <div className="admin-header card">
          <div className="breadcrumbs">
            <span className="crumb"><i className="fas fa-home" aria-hidden></i> Admin</span>
            <span className="sep">/</span>
            <span className="crumb active">{(filtered.find(f => f.key === section)?.label) || 'Overview'}</span>
          </div>
          <div className="actions">
            <DebugAuthChip />
            <Link to="/report" className="btn"><i className="fas fa-plus"></i> New Issue</Link>
            <button className="btn ghost" onClick={() => window.print()}><i className="fas fa-file-export"></i> Export</button>
            <Link to="/admin" className="btn ghost"><i className="fas fa-sliders-h"></i> Settings</Link>
          </div>
        </div>

        <main className="admin-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
