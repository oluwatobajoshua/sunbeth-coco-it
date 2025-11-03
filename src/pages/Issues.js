import React, { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useRecentIssues } from '../hooks/useRecentIssues';
import { exportToCsv } from '../utils/helpers';
import { getStations } from '../services/stationService';
import PageHeader from '../components/PageHeader';

const Tabs = ({ value, onChange }) => {
  const tabs = [
    { key: 'all', label: 'All' },
    { key: 'reported', label: 'Open' },
    { key: 'in-progress', label: 'In Progress' },
    { key: 'resolved', label: 'Resolved' },
  ];
  return (
    <div className="stats-row" role="tablist" aria-label="Issue status filters">
      {tabs.map(t => (
        <button key={t.key} role="tab" aria-selected={value===t.key}
          className={`chip toggle ${value===t.key ? 'active' : ''}`}
          onClick={() => onChange(t.key)}>
          {t.label}
        </button>
      ))}
    </div>
  );
};

const Issues = () => {
  const { user } = useAuth();
  const [filter, setFilter] = useState('all');
  const { issues, loading, error } = useRecentIssues(user?.email, 50);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('newest');

  const [stationNameMap, setStationNameMap] = useState({});

  useEffect(() => {
    (async () => {
      const list = await getStations();
      const map = {};
      list.forEach(s => { map[s.id] = s.name || s.id; });
      setStationNameMap(map);
    })();
  }, []);

  const filtered = useMemo(() => {
    const byStatus = filter === 'all' ? issues : issues.filter(i => i.status === filter);
    const byQuery = query.trim()
      ? byStatus.filter(i => {
          const q = query.toLowerCase();
          return (
            (i.id || '').toLowerCase().includes(q) ||
            (i.description || '').toLowerCase().includes(q) ||
            (stationNameMap[i.stationId] || i.stationId || '').toLowerCase().includes(q)
          );
        })
      : byStatus;
    const sorted = [...byQuery].sort((a,b) => {
      const at = a.createdAt ? a.createdAt.getTime?.() || new Date(a.createdAt).getTime() : 0;
      const bt = b.createdAt ? b.createdAt.getTime?.() || new Date(b.createdAt).getTime() : 0;
      return sort === 'newest' ? bt - at : at - bt;
    });
    return sorted;
  }, [issues, filter, query, sort, stationNameMap]);

  return (
    <div className="container">
      <PageHeader
        title="Your Issues"
        subtitle="Browse and filter your reported issues"
        breadcrumbs={[{ label: 'Home', icon: <i className="fas fa-home" aria-hidden></i> }, { label: 'Issues', active: true }]}
        actions={(
          <div className="d-flex" style={{gap:'8px', flexWrap:'wrap', alignItems:'center'}}>
          <Tabs value={filter} onChange={setFilter} />
          <input
            type="search"
            placeholder="Search by ID, description, or station"
            value={query}
            onChange={(e)=>setQuery(e.target.value)}
            className="input search"
            aria-label="Search issues"
            style={{flex:'1', minWidth:'220px', padding:'8px 10px', borderRadius:'8px', border:'1px solid #e6e6e6'}}
          />
          <select value={sort} onChange={(e)=>setSort(e.target.value)} className="btn-outline" style={{padding:'8px 10px', borderRadius:'8px'}} aria-label="Sort by">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
          <button className="btn btn-outline" onClick={() => exportToCsv('issues.csv', filtered)}>
            <i className="fas fa-download"></i> Export CSV
          </button>
          </div>
        )}
      />

      <section className="recent-issues" aria-live="polite">
        <div className="issues-list">
          {loading && (
            [1,2,3,4].map(i => (
              <div key={i} className="issue-card">
                <div className="skeleton line"></div>
                <div className="skeleton block"></div>
              </div>
            ))
          )}
          {error && (
            <div className="no-issues"><p>Failed to load issues</p></div>
          )}
          {!loading && !error && filtered.length === 0 && (
            <div className="no-issues"><p>No issues found.</p></div>
          )}
          {!loading && !error && filtered.map(issue => (
            <div key={issue.id} className="issue-card">
              <div className="issue-header">
                <span className="issue-id">{issue.id}</span>
                <span className={`status-badge ${issue.status}`}>
                  {issue.status.replace('-', ' ')}
                </span>
              </div>
              <p className="issue-description">{issue.description}</p>
              {/* Other details mirror RecentIssues */}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Issues;