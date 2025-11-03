import React from 'react';

export default function PageHeader({ title, subtitle, actions, breadcrumbs }) {
  return (
    <section className="page-header card">
      <div className="page-header-left">
        {breadcrumbs && (
          <div className="breadcrumbs small">
            {breadcrumbs.map((b, i) => (
              <span key={i} className={`crumb ${b.active ? 'active' : ''}`}>{b.icon ? b.icon : null} {b.label}{i < breadcrumbs.length - 1 ? <span className="sep">/</span> : null}</span>
            ))}
          </div>
        )}
        <h1 className="welcome-title" style={{marginBottom: 4}}>{title}</h1>
        {subtitle ? <p className="welcome-subtitle" style={{margin: 0}}>{subtitle}</p> : null}
      </div>
      {actions ? (
        <div className="page-header-actions">
          {actions}
        </div>
      ) : null}
    </section>
  );
}
