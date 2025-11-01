import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import PhotoUpload from './PhotoUpload';
import SuccessModal from './SuccessModal';
import { createIssue, sendNotifications } from '../services/issueService';
import { validateForm } from '../utils/helpers';
import { useAuth } from '../hooks/useAuth';

const IssueForm = ({ onIssueCreated }) => {
  const { user } = useAuth();
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm();
  const [currentStep, setCurrentStep] = useState(1);
  const [photos, setPhotos] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successModal, setSuccessModal] = useState({ show: false, issueId: null });

  const totalSteps = 3;
  const watchedFields = watch();

  const nextStep = () => {
    const validation = validateCurrentStep();
    if (validation.isValid) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    } else {
      Object.values(validation.errors).forEach(error => {
        toast.error(error);
      });
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return validateForm({
          stationId: watchedFields.stationSelect,
          issueType: watchedFields.issueType
        });
      case 2:
        return validateForm({
          description: watchedFields.issueDescription,
          priority: watchedFields.priority
        });
      default:
        return { isValid: true, errors: {} };
    }
  };

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    
    try {
      const issueData = {
        stationId: data.stationSelect,
        issueType: data.issueType,
        description: data.issueDescription,
        priority: data.priority,
        contactMethod: data.contactMethod || 'email',
        reporterId: user.email,
        reporterName: user.name
      };

      const issueId = await createIssue(issueData, photos);
      await sendNotifications({ ...issueData, id: issueId });
      
      setSuccessModal({ show: true, issueId });
      reset();
      setPhotos([]);
      setCurrentStep(1);
      
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
            <div className="progress-indicator">
              {[1, 2, 3].map(step => (
                <div
                  key={step}
                  className={`step ${step <= currentStep ? 'active' : ''}`}
                >
                  {step}
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="issue-form">
            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
              <div className="form-step active">
                <div className="form-group">
                  <label htmlFor="stationSelect">
                    <i className="fas fa-map-marker-alt"></i>
                    Station Location
                  </label>
                  <select
                    {...register('stationSelect', { required: 'Station selection is required' })}
                    id="stationSelect"
                    className={errors.stationSelect ? 'error-field' : ''}
                  >
                    <option value="">Select your station...</option>
                    <option value="coco-lagos-1">COCO Lagos Central</option>
                    <option value="coco-abuja-1">COCO Abuja Main</option>
                    <option value="coco-port-1">COCO Port Harcourt</option>
                    <option value="coco-kano-1">COCO Kano Junction</option>
                    <option value="coco-ibadan-1">COCO Ibadan Express</option>
                  </select>
                  {errors.stationSelect && (
                    <span className="error">{errors.stationSelect.message}</span>
                  )}
                </div>

                <div className="form-group">
                  <label>
                    <i className="fas fa-tags"></i>
                    Issue Type
                  </label>
                  <div className="issue-type-grid">
                    {[
                      { value: 'electrical', icon: 'bolt', label: 'Electrical' },
                      { value: 'mechanical', icon: 'cog', label: 'Mechanical' },
                      { value: 'safety', icon: 'shield-alt', label: 'Safety' },
                      { value: 'equipment', icon: 'wrench', label: 'Equipment' }
                    ].map(type => (
                      <label key={type.value} className="issue-type-card">
                        <input
                          type="radio"
                          {...register('issueType', { required: 'Issue type is required' })}
                          value={type.value}
                        />
                        <div className="card-content">
                          <i className={`fas fa-${type.icon}`}></i>
                          <span>{type.label}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                  {errors.issueType && (
                    <span className="error">{errors.issueType.message}</span>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Description */}
            {currentStep === 2 && (
              <div className="form-step active">
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
                  <label>
                    <i className="fas fa-flag"></i>
                    Priority Level
                  </label>
                  <div className="priority-selector">
                    {[
                      { value: 'low', label: 'Low Priority', desc: 'Can wait for regular maintenance' },
                      { value: 'medium', label: 'Medium Priority', desc: 'Should be addressed within 24 hours' },
                      { value: 'high', label: 'High Priority', desc: 'Urgent - affects operations' }
                    ].map(priority => (
                      <label key={priority.value} className={`priority-option ${priority.value}`}>
                        <input
                          type="radio"
                          {...register('priority', { required: 'Priority is required' })}
                          value={priority.value}
                        />
                        <span className="priority-label">
                          <i className="fas fa-flag"></i>
                          {priority.label}
                        </span>
                        <small>{priority.desc}</small>
                      </label>
                    ))}
                  </div>
                  {errors.priority && (
                    <span className="error">{errors.priority.message}</span>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Photos & Submit */}
            {currentStep === 3 && (
              <div className="form-step active">
                <PhotoUpload photos={photos} onChange={handlePhotoChange} />

                <div className="form-group">
                  <label htmlFor="contactMethod">
                    <i className="fas fa-phone"></i>
                    Preferred Contact Method
                  </label>
                  <select {...register('contactMethod')} id="contactMethod">
                    <option value="email">Email Notifications</option>
                    <option value="sms">SMS Updates</option>
                    <option value="both">Email + SMS</option>
                  </select>
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className="form-actions">
              {currentStep > 1 && (
                <button type="button" className="btn btn-secondary" onClick={prevStep}>
                  <i className="fas fa-arrow-left"></i>
                  Previous
                </button>
              )}
              
              {currentStep < totalSteps ? (
                <button type="button" className="btn btn-primary" onClick={nextStep}>
                  Next
                  <i className="fas fa-arrow-right"></i>
                </button>
              ) : (
                <button 
                  type="submit" 
                  className="btn btn-success"
                  disabled={isSubmitting}
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
              )}
            </div>
          </form>
        </div>
      </section>

      <SuccessModal
        show={successModal.show}
        issueId={successModal.issueId}
        onClose={closeSuccessModal}
      />
    </>
  );
};

export default IssueForm;