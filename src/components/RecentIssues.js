import React from 'react';
import { useRecentIssues } from '../hooks/useRecentIssues';
import { useAuth } from '../hooks/useAuth';
import { 
  getStationName, 
  capitalizeFirst, 
  formatDate, 
  formatDetailedDate, 
  getIssueTypeIcon 
} from '../utils/helpers';
import { Link } from 'react-router-dom';
import { useState, useMemo } from 'react';

const RecentIssues = ({ limit = 3, stationId }) => {
  const { user } = useAuth();
  const { issues, loading, error } = useRecentIssues(user?.email, limit, stationId);
  const [filter, setFilter] = useState('all');
  const filtered = useMemo(() => {
    if (filter === 'all') return issues;
    return issues.filter(i => i.status === filter);
  }, [issues, filter]);

  if (loading) {
    return (
      <section className="recent-issues">
        <div className="section-header">
          <h3><i className="fas fa-history"></i> Recent Issues</h3>
        </div>
        <div className="issues-list">
          {[1, 2, 3].map(i => (
            <div key={i} className="issue-card">
              <div className="skeleton line"></div>
              <div className="skeleton block"></div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="recent-issues">
        <div className="section-header">
          <h3><i className="fas fa-history"></i> Recent Issues</h3>
        </div>
        <div className="issues-list">
          <div className="no-issues">
            <i className="fas fa-exclamation-triangle"></i>
            <p>Error loading recent issues</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="recent-issues">
      <div className="section-header">
        <h3><i className="fas fa-history"></i> Recent Issues</h3>
        <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
          <div className="stats-row">
            {['all','reported','in-progress','resolved'].map(k => (
              <button key={k} className={`chip toggle ${filter===k?'active':''}`} onClick={()=>setFilter(k)}>
                {k==='all'?'All':k.replace('-',' ')}
              </button>
            ))}
          </div>
          <Link to="/issues" className="btn btn-outline btn-sm">View All</Link>
        </div>
      </div>
      
      <div className="issues-list">
        {filtered.length === 0 ? (
          <div className="no-issues">
            <i className="fas fa-clipboard-list"></i>
            <p>No recent issues found.</p>
          </div>
        ) : (
          filtered.map(issue => (
            <div key={issue.id} className="issue-card">
              <div className="issue-header">
                <span className="issue-id">{issue.id}</span>
                <span className={`status-badge ${issue.status}`}>
                  {issue.status.replace('-', ' ')}
                </span>
              </div>
              
              <p className="issue-description">{issue.description}</p>
              
              <div className="issue-meta">
                <span>
                  <i className="fas fa-map-marker-alt"></i>
                  {getStationName(issue.stationId)}
                </span>
                <span>
                  <i className="fas fa-tag"></i>
                  {capitalizeFirst(issue.issueType)}
                </span>
                <span>
                  <i className="fas fa-calendar"></i>
                  {formatDate(issue.createdAt)}
                </span>
              </div>
              
              <div className="issue-summary">
                <span className="issue-type-badge">
                  <i className={`fas fa-${getIssueTypeIcon(issue.issueType)}`}></i>
                  {capitalizeFirst(issue.issueType)}
                </span>
                <span className="issue-date">
                  {formatDetailedDate(issue.createdAt)}
                </span>
              </div>
              
              {issue.assignee && (
                <p className="assignee">
                  <i className="fas fa-user-cog"></i>
                  {issue.assignee}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
};

export default RecentIssues;