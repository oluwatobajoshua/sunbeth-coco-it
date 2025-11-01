import React from 'react';
import IssueForm from '../components/IssueForm';
import { Link } from 'react-router-dom';

const ReportIssue = () => {
  const handleIssueCreated = () => {
    // After creating an issue, we can navigate back or show a success
    // For now, allow IssueForm internal success modal to guide the user
  };

  return (
    <div className="container">
      <section className="welcome-section">
        <h1 className="welcome-title">New Issue Report</h1>
        <p className="welcome-subtitle">Provide details and attach any relevant photos</p>
        <div className="dashboard-actions" style={{justifyContent:'flex-start'}}>
          <Link to="/" className="btn btn-outline">
            <i className="fas fa-arrow-left"></i>
            Back to Dashboard
          </Link>
        </div>
      </section>
      <IssueForm onIssueCreated={handleIssueCreated} />
    </div>
  );
};

export default ReportIssue;