/**
 * API Client
 * 
 * Centralized HTTP client for making backend API calls.
 * Provides a consistent interface regardless of the backend implementation.
 */

import { getEndpointUrl } from './apiConfig';

/**
 * Default fetch options
 */
const defaultOptions = {
  headers: {
    'Content-Type': 'application/json',
  },
};

/**
 * Generic API call wrapper
 * @param {string} endpointName - Name of the endpoint
 * @param {Object} options - Fetch options (method, headers, body, etc.)
 * @returns {Promise<any>} Response data
 */
const apiCall = async (endpointName, options = {}) => {
  const url = getEndpointUrl(endpointName);
  
  if (!url) {
    throw new Error(`API endpoint '${endpointName}' is not configured`);
  }

  const fetchOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...(options.headers || {}),
    },
  };

  try {
    const response = await fetch(url, fetchOptions);
    
    // Handle non-JSON responses (e.g., HTML from approval decision)
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    
    if (!response.ok) {
      const errorData = isJson ? await response.json() : { error: await response.text() };
      throw new Error(errorData.error || `API call failed with status ${response.status}`);
    }

    return isJson ? await response.json() : await response.text();
  } catch (error) {
    console.error(`API Error (${endpointName}):`, error.message);
    throw error;
  }
};

/**
 * API Client object with method-specific functions
 */
export const apiClient = {
  /**
   * Exchange Microsoft ID token for Firebase custom token
   * @param {string} idToken - Microsoft ID token
   * @returns {Promise<{customToken: string}>}
   */
  async getMsalCustomToken(idToken) {
    return apiCall('msalCustomToken', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    });
  },

  /**
   * Create approval request for issue closure
   * @param {Object} data - Approval request data
   * @param {string} data.issueId - Issue ID
   * @param {string} [data.closureNote] - Closure note
   * @param {string} [data.closurePhotoUrl] - Closure photo URL
   * @param {string} [data.requestedBy] - Requester email
   * @returns {Promise<{id: string, status: string}>}
   */
  async createApprovalRequest(data) {
    return apiCall('createApprovalRequest', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Recompute effective permissions for user(s)
   * @param {string} firebaseIdToken - Firebase ID token (Admin/Super Admin)
   * @param {Object} [options] - Recompute options
   * @param {string} [options.uid] - Specific user ID (optional)
   * @param {boolean} [options.dryRun] - Dry run mode
   * @returns {Promise<{updated: number, dryRun: boolean, scoped: boolean}>}
   */
  async recomputeEffectivePerms(firebaseIdToken, options = {}) {
    return apiCall('recomputeEffectivePerms', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${firebaseIdToken}`,
      },
      body: JSON.stringify(options),
    });
  },

  /**
   * Generic GET request
   * @param {string} endpointName - Endpoint name
   * @param {Object} [params] - Query parameters
   * @returns {Promise<any>}
   */
  async get(endpointName, params = {}) {
    const url = getEndpointUrl(endpointName);
    if (!url) throw new Error(`Endpoint '${endpointName}' not found`);

    const queryString = new URLSearchParams(params).toString();
    const requestUrl = queryString ? `${url}?${queryString}` : url;

    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: defaultOptions.headers,
    });

    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');

    if (!response.ok) {
      const errorData = isJson ? await response.json() : { error: await response.text() };
      throw new Error(errorData.error || `API call failed with status ${response.status}`);
    }

    return isJson ? await response.json() : await response.text();
  },

  /**
   * Generic POST request
   * @param {string} endpointName - Endpoint name
   * @param {Object} data - Request body
   * @param {Object} [headers] - Additional headers
   * @returns {Promise<any>}
   */
  async post(endpointName, data, headers = {}) {
    return apiCall(endpointName, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
  },
};

export default apiClient;
