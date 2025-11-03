import React from 'react';
import AdminLayout from './admin/AdminLayout';
import AdminStations from './admin/AdminStations';
import AdminIssueTypes from './admin/AdminIssueTypes';
import AdminUsers from './admin/AdminUsers';
import AdminPermissions from './admin/AdminPermissions';
import AdminRoles from './admin/AdminRoles';
import AdminSettings from './admin/AdminSettings';
import AdminIssues from './admin/AdminIssues';
import AdminDebug from './admin/AdminDebug';
import { useAuth } from '../hooks/useAuth';
import { useIssueStats } from '../hooks/useIssueStats';
import { getStations } from '../services/stationService';
import { normalizeRole, fetchPermissionsMatrix, hasPermission } from '../utils/permissions';

const KPI = ({ label, value, icon }) => (
  <div className="card kpi-card" style={{ minWidth: 180 }}>
    <div className="kpi-top">
      <div className="kpi-label">{label}</div>
      {icon && <div className="kpi-icon" aria-hidden>{icon}</div>}
    </div>
    <div className="kpi-value">{value ?? '—'}</div>
  </div>
);

const Overview = () => {
  const { stats } = useIssueStats(null, undefined, 30);
  const [stationCount, setStationCount] = React.useState(null);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await getStations();
        if (mounted) setStationCount(list.length);
      } catch {
        if (mounted) setStationCount(null);
      }
    })();
    return () => { mounted = false; };
  }, []);
  return (
    <section>
      <div className="section-header"><h3 className="small">Overview</h3></div>
      <div className="dashboard-kpis" style={{ marginTop: 0 }}>
        <KPI label="Total Issues" value={stats.total} icon={<i className="fas fa-clipboard-list" />} />
        <KPI label="Open" value={stats.open} icon={<i className="fas fa-exclamation-circle" />} />
        <KPI label="Resolved" value={stats.resolved} icon={<i className="fas fa-check-circle" />} />
        <KPI label="Stations" value={stationCount} icon={<i className="fas fa-gas-pump" />} />
      </div>
    </section>
  );
};

const Admin = () => {
  const { user } = useAuth();
  const roleKey = normalizeRole(user?.role);
  const [matrix, setMatrix] = React.useState(null);
  const [section, setSection] = React.useState('overview');

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      const m = await fetchPermissionsMatrix();
      if (mounted) setMatrix(m);
    })();
    return () => { mounted = false; };
  }, []);

  const allowed = ['overview'];
  if (hasPermission(matrix, roleKey, 'manage_issues')) allowed.push('issues');
  if (hasPermission(matrix, roleKey, 'manage_stations')) allowed.push('stations');
  if (hasPermission(matrix, roleKey, 'manage_issue_types')) allowed.push('types');
  if (hasPermission(matrix, roleKey, 'manage_users')) allowed.push('users', 'permissions');
  if (hasPermission(matrix, roleKey, 'manage_roles')) allowed.push('roles');
  if (hasPermission(matrix, roleKey, 'view_admin')) allowed.push('settings');
  if (hasPermission(matrix, roleKey, 'debug_tools')) allowed.push('debug');

  const renderSection = (key) => {
    switch (key) {
      case 'overview': return <Overview />;
      case 'issues': return <AdminIssues />;
      case 'stations': return <AdminStations />;
      case 'types': return <AdminIssueTypes />;
      case 'users': return <AdminUsers />;
  case 'permissions': return <AdminPermissions />;
  case 'roles': return <AdminRoles />;
      case 'settings': return <AdminSettings />;
      case 'debug': return <AdminDebug />;
      default: return <Overview />;
    }
  };
  const safeSection = allowed.includes(section) ? section : 'overview';

  if (!user || !matrix) {
    return <div className="container"><div className="small">Loading admin...</div></div>;
  }

  // If user cannot view admin at all, block access
  if (!hasPermission(matrix, roleKey, 'view_admin')) {
    return (
      <div className="container">
        <section className="card" style={{ padding: 16 }}>
          <h3 className="small">Access denied</h3>
          <div className="small">You do not have permission to access the Admin Console.</div>
          <div style={{ marginTop: 8 }}>
            <a className="btn btn-outline" href="/dashboard">Go to Dashboard</a>
          </div>
        </section>
      </div>
    );
  }

  return (
    <AdminLayout section={safeSection} setSection={setSection} visibleKeys={allowed}>
      {renderSection(safeSection)}
    </AdminLayout>
  );
};

export default Admin;
