import React from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { useIssueStats } from '../hooks/useIssueStats';
import { useAuth } from '../hooks/useAuth';
import { getStations } from '../services/stationService';
import { normalizeRole } from '../utils/permissions';
import StatusDonut from '../components/charts/StatusDonut';
import TypeBar from '../components/charts/TypeBar';
// import TrendLine from '../components/charts/TrendLine';
import PriorityDonut from '../components/charts/PriorityDonut';
import AgingBar from '../components/charts/AgingBar';
import TopStationsBar from '../components/charts/TopStationsBar';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const Sparkline = ({ points }) => {
  if (!points || points.length === 0) return null;
  const max = Math.max(...points, 1);
  const w = 120, h = 36, step = w / (points.length - 1 || 1);
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${i*step} ${h - (p / max) * (h - 4) - 2}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" opacity="0.6" />
    </svg>
  );
};

const StatCard = ({ label, value, trend, icon, spark }) => {
  return (
    <div className="card kpi-card">
      <div className="kpi-top">
        <div className="kpi-label">{label}</div>
        {icon && <div className="kpi-icon" aria-hidden>{icon}</div>}
      </div>
      <div className="kpi-value">{value ?? '—'}</div>
      {typeof trend === 'number' && (
        <div className={`kpi-trend ${trend >= 0 ? 'up' : 'down'}`}>
          <i className={`fas fa-arrow-${trend >= 0 ? 'up' : 'down'}`}></i>
          <span>{Math.abs(trend)}%</span>
        </div>
      )}
      {spark && <div className="kpi-spark"><Sparkline points={spark} /></div>}
    </div>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const [station, setStation] = React.useState('');
  const [since, setSince] = React.useState(30);
  const [scope, setScope] = React.useState('my');
  const reporter = scope === 'org' ? null : user?.email;
  const { stats, loading } = useIssueStats(reporter, station || undefined, since);
  const containerRef = React.useRef(null);
  const [stations, setStations] = React.useState([]);

  React.useEffect(() => {
    (async () => {
      const list = await getStations();
      setStations(list);
    })();
  }, []);

  // Default scope: admins see organization by default
  React.useEffect(() => {
    const role = normalizeRole(user?.role);
    if (role === 'admin' || role === 'super_admin') {
      setScope('org');
    } else {
      setScope('my');
    }
  }, [user?.role]);

  const exportPNG = async () => {
    if (!containerRef.current) return;
    const node = containerRef.current;
    const canvas = await html2canvas(node, { scale: 2, backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--background') || '#ffffff' });
    const dataURL = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataURL;
    a.download = 'Sunbeth-COCO-Dashboard.png';
    a.click();
  };

  const exportPDF = async () => {
    if (!containerRef.current) return;
    const node = containerRef.current;
    const canvas = await html2canvas(node, { scale: 2, backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--background') || '#ffffff' });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = canvas.height * (imgWidth / canvas.width);
    if (imgHeight < pageHeight) {
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    } else {
      // Add multipage if content is long
      let remainingHeight = imgHeight;
      let position = 0;
      while (remainingHeight > 0) {
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        remainingHeight -= pageHeight;
        position -= pageHeight; // move image up for next slice
        if (remainingHeight > 0) pdf.addPage();
      }
    }
    pdf.save('Sunbeth-COCO-Dashboard.pdf');
  };

  return (
    <div className="container dashboard-compact" ref={containerRef}>
      <PageHeader
        title="COCO Station Dashboard"
        subtitle="Overview of your COCO station issues and activity"
        breadcrumbs={[{ label: 'Home', icon: <i className="fas fa-home" aria-hidden></i> }, { label: 'Dashboard', active: true }]}
        actions={(
          <div className="dashboard-actions" style={{flexWrap:'wrap', justifyContent:'flex-end'}}>
          <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
            <label className="small" htmlFor="station-select">Station</label>
            <select id="station-select" value={station} onChange={(e)=>setStation(e.target.value)} className="btn-outline" style={{padding:'8px 10px', borderRadius:'8px'}}>
              <option value="">All Stations</option>
              {stations.map(s => (
                <option key={s.id} value={s.id}>{s.name || s.id}</option>
              ))}
            </select>
          </div>
          <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
            <label className="small" htmlFor="since-select">Period</label>
            <select id="since-select" value={since} onChange={(e)=>setSince(Number(e.target.value))} className="btn-outline" style={{padding:'8px 10px', borderRadius:'8px'}}>
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </div>
          <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
            <label className="small" htmlFor="scope-select">Scope</label>
            <select id="scope-select" value={scope} onChange={(e)=>setScope(e.target.value)} className="btn-outline" style={{padding:'8px 10px', borderRadius:'8px'}}>
              <option value="my">My reports</option>
              <option value="org">Organization</option>
            </select>
          </div>
          <Link className="btn btn-accent" to="/report">
            <i className="fas fa-plus-circle"></i>
            New Issue Report
          </Link>
          <Link className="btn btn-outline" to="/issues">
            <i className="fas fa-table"></i>
            View All Issues
          </Link>
          <button className="btn btn-outline" onClick={exportPNG} title="Export dashboard as PNG">
            <i className="fas fa-image"></i>
            Export PNG
          </button>
          <button className="btn btn-outline" onClick={exportPDF} title="Export dashboard as PDF">
            <i className="fas fa-file-pdf"></i>
            Export PDF
          </button>
          </div>
        )}
      />

      <section className="dashboard-kpis">
        <StatCard label="Total Issues" value={loading ? '…' : stats.total}
          trend={stats.trendTotal} icon={<i className="fas fa-clipboard-list" />} spark={stats.trend7} />
        <StatCard label="Open" value={loading ? '…' : stats.open}
          trend={stats.trendOpen} icon={<i className="fas fa-exclamation-circle" />} />
        <StatCard label="In Progress" value={loading ? '…' : stats.inProgress}
          trend={stats.trendInProgress} icon={<i className="fas fa-tools" />} />
        <StatCard label="Resolved" value={loading ? '…' : stats.resolved}
          trend={stats.trendResolved} icon={<i className="fas fa-check-circle" />} />
        <StatCard label="Closed" value={loading ? '…' : stats.closed}
          trend={0} icon={<i className="fas fa-lock" />} />
      </section>

      <section className="charts-grid">
  <div className="card"><StatusDonut open={stats.open} inProgress={stats.inProgress} resolved={stats.resolved} closed={stats.closed} /></div>
        <div className="card"><PriorityDonut low={stats.byPriority?.low} medium={stats.byPriority?.medium} high={stats.byPriority?.high} /></div>
      </section>

      <section className="dashboard-panels">
        <div className="card"><TypeBar byType={stats.byType} /></div>
        <div className="card"><AgingBar buckets={stats.agingBuckets} /></div>
      </section>

      {scope === 'org' && stats.topStations && stats.topStations.length > 0 && (
        <section className="card" style={{marginBottom:'var(--spacing-md)'}}>
          <TopStationsBar items={stats.topStations} />
        </section>
      )}

      <section className="card analytics-card">
        <div className="analytics-header">
          <h3 className="small">This Week Resolution Rate</h3>
          <span className="small muted">Simple snapshot</span>
        </div>
        <div className="progressBar">
          <i style={{ width: `${stats.resolutionRate ?? 0}%` }} />
        </div>
        <div className="analytics-legend">
          <span className="chip ok">Resolved: {stats.resolved ?? 0}</span>
          <span className="chip warn">Open: {stats.open ?? 0}</span>
        </div>
      </section>

      {/* Floating action on mobile */}
      <Link to="/report" className="fab">
        <i className="fas fa-plus"></i>
      </Link>
    </div>
  );
};

export default Dashboard;