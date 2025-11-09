/**
 * API Configuration
 * 
 * This module provides a centralized configuration for backend API endpoints.
 * The frontend can work with any backend implementation (Cloud Functions, Express, etc.)
 * by simply changing environment variables.
 * 
 * Backend Types:
 * - 'express': Custom Express backend (default)
 * - 'cloud-functions': Firebase Cloud Functions
 * - 'custom': Any custom backend URL
 */

// Backend type: 'express' | 'cloud-functions' | 'custom'
const BACKEND_TYPE = process.env.REACT_APP_BACKEND_TYPE || 'express';

// Base URLs for different backend types
const EXPRESS_BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
const CLOUD_FUNCTIONS_REGION = process.env.REACT_APP_FUNCTIONS_REGION || 'us-central1';
const FIREBASE_PROJECT_ID = process.env.REACT_APP_FIREBASE_PROJECT_ID;
const CUSTOM_BACKEND_URL = process.env.REACT_APP_CUSTOM_BACKEND_URL;

/**
 * Get the base URL for the current backend type
 */
export const getBackendBaseUrl = () => {
  switch (BACKEND_TYPE) {
    case 'cloud-functions':
      if (!FIREBASE_PROJECT_ID) {
        console.error('REACT_APP_FIREBASE_PROJECT_ID is required for cloud-functions backend');
        return null;
      }
      return `https://${CLOUD_FUNCTIONS_REGION}-${FIREBASE_PROJECT_ID}.cloudfunctions.net`;
    
    case 'custom':
      if (!CUSTOM_BACKEND_URL) {
        console.error('REACT_APP_CUSTOM_BACKEND_URL is required for custom backend');
        return null;
      }
      return CUSTOM_BACKEND_URL;
    
    case 'express':
    default:
      // If REACT_APP_BACKEND_URL is empty, use relative path (for Vercel same-domain deployment)
      return EXPRESS_BACKEND_URL || '';
  }
};

/**
 * API Endpoint Mappings
 * Maps logical endpoint names to their actual paths based on backend type
 */
const ENDPOINT_MAPPINGS = {
  'express': {
    msalCustomToken: '/api/auth/msal-custom-token',
    createApprovalRequest: '/api/approvals/create',
    handleApprovalDecision: '/api/approvals/decision',
    recomputeEffectivePerms: '/api/permissions/recompute',
  },
  'cloud-functions': {
    msalCustomToken: '/msalCustomToken',
    createApprovalRequest: '/createApprovalRequest',
    handleApprovalDecision: '/handleApprovalDecision',
    recomputeEffectivePerms: '/recomputeEffectivePerms',
  },
  'custom': {
    // For custom backends, use the same paths as express by default
    // Override via environment variables if needed
    msalCustomToken: process.env.REACT_APP_CUSTOM_MSAL_TOKEN_PATH || '/api/auth/msal-custom-token',
    createApprovalRequest: process.env.REACT_APP_CUSTOM_APPROVAL_CREATE_PATH || '/api/approvals/create',
    handleApprovalDecision: process.env.REACT_APP_CUSTOM_APPROVAL_DECISION_PATH || '/api/approvals/decision',
    recomputeEffectivePerms: process.env.REACT_APP_CUSTOM_PERMS_RECOMPUTE_PATH || '/api/permissions/recompute',
  }
};

/**
 * Get the full URL for a specific endpoint
 * @param {string} endpointName - Name of the endpoint (e.g., 'msalCustomToken')
 * @returns {string|null} Full URL for the endpoint
 */
export const getEndpointUrl = (endpointName) => {
  const baseUrl = getBackendBaseUrl();
  if (!baseUrl) return null;

  const mappings = ENDPOINT_MAPPINGS[BACKEND_TYPE] || ENDPOINT_MAPPINGS['express'];
  const path = mappings[endpointName];
  
  if (!path) {
    console.error(`Unknown endpoint: ${endpointName}`);
    return null;
  }

  return `${baseUrl}${path}`;
};

/**
 * API Configuration Object
 * Export this for backwards compatibility
 */
export const apiConfig = {
  backendType: BACKEND_TYPE,
  baseUrl: getBackendBaseUrl(),
  endpoints: {
    msalCustomToken: getEndpointUrl('msalCustomToken'),
    createApprovalRequest: getEndpointUrl('createApprovalRequest'),
    handleApprovalDecision: getEndpointUrl('handleApprovalDecision'),
    recomputeEffectivePerms: getEndpointUrl('recomputeEffectivePerms'),
  }
};

/**
 * Validate API configuration on module load
 */
const validateConfig = () => {
  const baseUrl = getBackendBaseUrl();
  if (!baseUrl) {
    console.warn('⚠️ Backend API not properly configured. Check environment variables.');
    return false;
  }
  
  console.log(`✅ API Config: Using ${BACKEND_TYPE} backend at ${baseUrl}`);
  return true;
};

// Run validation
validateConfig();

export default apiConfig;
