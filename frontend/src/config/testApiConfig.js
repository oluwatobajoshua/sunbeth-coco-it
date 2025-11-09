/**
 * API Configuration Test
 * 
 * Run this in the browser console to verify your API configuration
 */

import { apiConfig, getEndpointUrl } from './apiConfig';

export const testApiConfig = () => {
  console.group('🧪 API Configuration Test');
  
  console.log('Backend Type:', apiConfig.backendType);
  console.log('Base URL:', apiConfig.baseUrl);
  
  console.group('Endpoints:');
  console.log('MSAL Token:', apiConfig.endpoints.msalCustomToken);
  console.log('Create Approval:', apiConfig.endpoints.createApprovalRequest);
  console.log('Approval Decision:', apiConfig.endpoints.handleApprovalDecision);
  console.log('Recompute Perms:', apiConfig.endpoints.recomputeEffectivePerms);
  console.groupEnd();
  
  // Test dynamic endpoint retrieval
  console.group('Dynamic Retrieval Test:');
  console.log('getMsalToken URL:', getEndpointUrl('msalCustomToken'));
  console.groupEnd();
  
  // Validation
  const allEndpointsConfigured = Object.values(apiConfig.endpoints).every(url => url !== null);
  
  if (allEndpointsConfigured) {
    console.log('✅ All endpoints properly configured!');
  } else {
    console.warn('⚠️ Some endpoints are not configured. Check your environment variables.');
  }
  
  console.groupEnd();
  
  return {
    configured: allEndpointsConfigured,
    config: apiConfig
  };
};

// Auto-run in development
if (process.env.NODE_ENV === 'development') {
  // Run after a short delay to ensure console is visible
  setTimeout(() => {
    testApiConfig();
  }, 1000);
}

export default testApiConfig;
