import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import PhotoUpload from './PhotoUpload';
import SuccessModal from './SuccessModal';
import { createIssue, sendNotifications } from '../services/issueService';
import { createInitialEscalation } from '../services/escalationService';
// import { validateForm } from '../utils/helpers';
import { useAuth } from '../hooks/useAuth';
import { getStations } from '../services/stationService';
import { getIssueTypes } from '../services/issueTypeService';
import { useFormDraft } from '../utils/useFormDraft';
import { getOptions, ensureSeededAll } from '../services/optionsService';

const IssueForm = ({ onIssueCreated }) => {
  const { user } = useAuth();
  const { register, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm();
  const [photos, setPhotos] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successModal, setSuccessModal] = useState({ show: false, issueId: null, teamLabel: null });
  const [stations, setStations] = useState([]);
  const [types, setTypes] = useState([]);
  const [priorities, setPriorities] = useState([
    { value: 'low', label: 'Low Priority', desc: 'Can wait for regular maintenance' },
    { value: 'medium', label: 'Medium Priority', desc: 'Should be addressed within 24 hours' },
    { value: 'high', label: 'High Priority', desc: 'Urgent - affects operations' }
  ]);

  const watchedFields = watch();

  // Draft persistence (exclude photos)
  const { clearDraft } = useFormDraft('issueFormDraft', watch, reset, { exclude: ['photos'] });

  // Load stations and issue-related options; prefill user's station
  useEffect(() => {
    (async () => {
      const list = await getStations();
      setStations(list);
      if (!watchedFields.stationSelect && user?.stationId) {
        setValue('stationSelect', user.stationId);
      }
      let t = [];
      try { t = await getIssueTypes(); } catch(_) { t = []; }
      if (!Array.isArray(t) || t.length === 0) {
        try { await ensureSeededAll(); } catch(_) {}
        try {
          const t2 = await getIssueTypes();
          if (Array.isArray(t2) && t2.length) {
            t = t2;
          } else {
            t = [
              { id: 'electrical', key: 'electrical', label: 'Electrical', icon: 'bolt', active: true },
              { id: 'mechanical', key: 'mechanical', label: 'Mechanical', icon: 'cog', active: true },
              { id: 'safety', key: 'safety', label: 'Safety', icon: 'shield-alt', active: true },
              { id: 'equipment', key: 'equipment', label: 'Equipment', icon: 'wrench', active: true },
            ];
          }
        } catch(_) {
          t = [
            { id: 'electrical', key: 'electrical', label: 'Electrical', icon: 'bolt', active: true },
            { id: 'mechanical', key: 'mechanical', label: 'Mechanical', icon: 'cog', active: true },
            { id: 'safety', key: 'safety', label: 'Safety', icon: 'shield-alt', active: true },
            { id: 'equipment', key: 'equipment', label: 'Equipment', icon: 'wrench', active: true },
          ];
        }
      }
      setTypes(t);
      try {
        const opts = await getOptions();
        if (Array.isArray(opts?.priorities) && opts.priorities.length) {
          const pr = opts.priorities.map(p => typeof p === 'string' ? { value: p, label: p, desc: '' } : p);
          setPriorities(pr);
        }
      } catch (_) { /* ignore */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.stationId]);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    
    try {
      const issueData = {
        stationId: data.stationSelect,
        issueType: data.issueType,
        description: data.issueDescription,
        priority: data.priority,
        // contactMethod removed from form; notification channels are admin-managed
        reporterId: user.email,
        reporterName: user.name
      };

  const issueId = await createIssue(issueData, photos);
  const fullIssue = { ...issueData, id: issueId };
      await sendNotifications(fullIssue);
      if (issueData.priority === 'high') {
        // Fire-and-forget; robust processing can be handled server-side later
        createInitialEscalation(fullIssue);
      }
      
      // Determine team label from selected issue type for SuccessModal copy
      const selected = (types || []).find(t => (t.key || t.id) === issueData.issueType);
      const inferredLabel = selected?.label || String(issueData.issueType || 'Relevant')
        .replace(/[-_]+/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
      setSuccessModal({ show: true, issueId, teamLabel: inferredLabel });
      reset();
    setPhotos([]);
  clearDraft();
      
      if (onIssueCreated) {
        onIssueCreated();
      }
      
      toast.success('Issue submitted successfully!');
    } catch (error) {
      console.error('Error submitting issue:', error);
      toast.error('Failed to submit issue. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhotoChange = (newPhotos) => {
    setPhotos(newPhotos);
  };

  const closeSuccessModal = () => {
    setSuccessModal({ show: false, issueId: null });
  };

  return (
    <>
      <section className="form-section">
        <div className="form-card">
          <div className="form-header">
            <h2>
              <i className="fas fa-exclamation-triangle"></i> New Issue Report
            </h2>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="issue-form" data-testid="issue-form">
            {/* Single step: All fields */}
            <div className="form-step active" data-testid="form-single">
                <div className="form-group">
                  <label htmlFor="stationSelect">
                    <i className="fas fa-map-marker-alt"></i>
                    Station Location
                  </label>
                  <select
                    {...register('stationSelect', { required: 'Station selection is required' })}
                    id="stationSelect"
                    className={errors.stationSelect ? 'error-field' : ''}
                    data-testid="station-select"
                  >
                    <option value="">Select your station...</option>
                    {stations.map(s => (
                      <option key={s.id} value={s.id} data-testid={`station-option-${s.id}`}>{s.name || s.id}</option>
                    ))}
                  </select>
                  {errors.stationSelect && (
                    <span className="error">{errors.stationSelect.message}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="issueType">
                    <i className="fas fa-tags"></i>
                    Issue Type
                  </label>
                  <select
                    {...register('issueType', { required: 'Issue type is required' })}
                    id="issueType"
                    className={errors.issueType ? 'error-field' : ''}
                    data-testid="issue-type-select"
                  >
                    <option value="">Select issue type...</option>
                    {types.map(type => (
                      <option key={type.key || type.id} value={type.key || type.id} data-testid={`issue-type-option-${type.key || type.id}`}>
                        {type.label || type.key}
                      </option>
                    ))}
                  </select>
                  {errors.issueType && (
                    <span className="error">{errors.issueType.message}</span>
                  )}
                </div>
                <div className="form-group">
                  <label htmlFor="issueDescription">
                    <i className="fas fa-comment-alt"></i>
                    Describe the Issue
                  </label>
                  <textarea
                    {...register('issueDescription', { 
                      required: 'Description is required',
                      minLength: { value: 10, message: 'Description must be at least 10 characters' }
                    })}
                    id="issueDescription"
                    rows="5"
                    placeholder="Please provide details about the issue you're experiencing..."
                    maxLength="500"
                    className={errors.issueDescription ? 'error-field' : ''}
                    data-testid="issue-description"
                  />
                  <div className="char-counter">
                    <span style={{ color: watchedFields.issueDescription?.length > 450 ? 'var(--danger-color)' : 'var(--muted)' }}>
                      {watchedFields.issueDescription?.length || 0}
                    </span>/500 characters
                  </div>
                  {errors.issueDescription && (
                    <span className="error">{errors.issueDescription.message}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="priority">
                    <i className="fas fa-flag"></i>
                    Priority Level
                  </label>
                  <select
                    {...register('priority', { required: 'Priority is required' })}
                    id="priority"
                    className={errors.priority ? 'error-field' : ''}
                    data-testid="priority-select"
                  >
                    <option value="">Select priority...</option>
                    {priorities.map(priority => (
                      <option key={priority.value} value={priority.value} data-testid={`priority-option-${priority.value}`}>
                        {priority.label}
                      </option>
                    ))}
                  </select>
                  {errors.priority && (
                    <span className="error">{errors.priority.message}</span>
                  )}
                </div>
                <div className="form-group">
                  <PhotoUpload photos={photos} onChange={handlePhotoChange} />
                </div>
            </div>

            {/* Form Actions */}
            <div className="form-actions">
              <button 
                type="submit" 
                className="btn btn-success"
                disabled={isSubmitting}
                data-testid="submit-button"
              >
                {isSubmitting ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Submitting...
                  </>
                ) : (
                  <>
                    <i className="fas fa-paper-plane"></i>
                    Submit Issue
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </section>

      <SuccessModal
        show={successModal.show}
        issueId={successModal.issueId}
        teamLabel={successModal.teamLabel}
        onClose={closeSuccessModal}
      />
    </>
  );
};

export default IssueForm;