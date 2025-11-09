import React from 'react';

const SuccessModal = ({ show, issueId, teamLabel, onClose }) => {
  if (!show) return null;

  const handleSubmitAnother = () => {
    onClose();
    // Could add callback here to reset form
  };

  return (
    <div className={`modal ${show ? 'active' : ''}`}>
      <div className="modal-content">
        <div className="modal-header">
          <i className="fas fa-check-circle success-icon"></i>
          <h2>Issue Submitted Successfully!</h2>
        </div>
        <div className="modal-body">
          <p>Your issue has been reported and assigned ID:</p>
          <div className="issue-id">{issueId}</div>
          <p>
            The {teamLabel || 'relevant'} team has been notified and will begin review shortly.
          </p>
          <div className="next-steps">
            <h4>What happens next?</h4>
            <ol>
              <li>{(teamLabel || 'Relevant')} team reviews your issue</li>
              <li>You'll receive status updates via your preferred method</li>
              <li>Issue will be resolved and marked complete</li>
            </ol>
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn btn-primary" onClick={onClose}>
            Got it!
          </button>
          <button className="btn btn-outline" onClick={handleSubmitAnother}>
            Submit Another Issue
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuccessModal;