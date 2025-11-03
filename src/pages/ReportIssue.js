import React from 'react';
import IssueForm from '../components/IssueForm';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';

const ReportIssue = () => {
  const handleIssueCreated = () => {
    // After creating an issue, we can navigate back or show a success
    // For now, allow IssueForm internal success modal to guide the user
  };

  return (
    <div className="container">
      <PageHeader
        title="New Issue Report"
        subtitle="Provide details and attach any relevant photos"
        breadcrumbs={[{ label: 'Home', icon: <i className="fas fa-home" aria-hidden></i> }, { label: 'Report Issue', active: true }]}
        actions={(
          <div className="dashboard-actions" style={{justifyContent:'flex-end'}}>
            <Link to="/dashboard" className="btn btn-outline">
              <i className="fas fa-arrow-left"></i>
              Back to Dashboard
            </Link>
          </div>
        )}
      />
      <IssueForm onIssueCreated={handleIssueCreated} />
    </div>
  );
};

export default ReportIssue;