import React from 'react';

const NavItem = ({ active, onClick, icon, label }) => (
  <button className={`btn ghost ${active ? 'active' : ''}`} onClick={onClick} style={{ justifyContent: 'flex-start' }}>
    <i className={`fas fa-${icon}`} style={{ marginRight: 8 }}></i>
    <span>{label}</span>
  </button>
);

const AdminLayout = ({ section, setSection, children, visibleKeys }) => {
  const items = [
    { key: 'overview', label: 'Overview', icon: 'tachometer-alt' },
    { key: 'issues', label: 'Issues', icon: 'clipboard-list' },
    { key: 'stations', label: 'Stations', icon: 'gas-pump' },
    { key: 'types', label: 'Issue Types', icon: 'tags' },
    { key: 'users', label: 'Users', icon: 'users' },
    { key: 'permissions', label: 'Permissions', icon: 'user-shield' },
    { key: 'settings', label: 'Settings', icon: 'cogs' },
    { key: 'debug', label: 'Debug', icon: 'tools' },
  ];
  const filtered = Array.isArray(visibleKeys) && visibleKeys.length
    ? items.filter(it => visibleKeys.includes(it.key))
    : items;

  return (
    <div className="container" style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16 }}>
      <aside className="card" style={{ padding: 12 }}>
        <div className="section-header" style={{ marginBottom: 8 }}>
          <h3 className="small" style={{ marginBottom: 0 }}>Admin</h3>
        </div>
        <div style={{ display: 'grid', gap: 6 }}>
          {filtered.map(it => (
            <NavItem key={it.key} active={section===it.key} onClick={() => setSection(it.key)} icon={it.icon} label={it.label} />
          ))}
        </div>
      </aside>
      <main>
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;
