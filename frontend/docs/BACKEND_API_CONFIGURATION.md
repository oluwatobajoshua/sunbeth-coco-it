# Backend-Agnostic API Configuration

## Overview

The COCO frontend has been designed to be **backend-agnostic**, meaning it can work with any backend implementation through a simple configuration change. The frontend communicates with the backend via a centralized API client that abstracts away the underlying infrastructure.

## Supported Backend Types

1. **Express Backend** (default) - Custom Node.js/Express server
2. **Firebase Cloud Functions** - Serverless functions hosted on Firebase
3. **Custom Backend** - Any custom API endpoint

## Configuration

### Environment Variables

Add these variables to your `.env` or `.env.local` file:

```bash
# Backend type: 'express' (default), 'cloud-functions', or 'custom'
REACT_APP_BACKEND_TYPE=express

# Express backend URL (used when BACKEND_TYPE=express)
REACT_APP_BACKEND_URL=http://localhost:3001

# Cloud Functions region (used when BACKEND_TYPE=cloud-functions)
REACT_APP_FUNCTIONS_REGION=us-central1

# Custom backend URL (used when BACKEND_TYPE=custom)
REACT_APP_CUSTOM_BACKEND_URL=https://api.example.com
```

### Backend Type Configuration

#### 1. Express Backend (Default)

```bash
REACT_APP_BACKEND_TYPE=express
REACT_APP_BACKEND_URL=http://localhost:3001
```

For production:
```bash
REACT_APP_BACKEND_TYPE=express
REACT_APP_BACKEND_URL=https://api.sunbeth-energies.com
```

#### 2. Firebase Cloud Functions

```bash
REACT_APP_BACKEND_TYPE=cloud-functions
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FUNCTIONS_REGION=us-central1
```

#### 3. Custom Backend

```bash
REACT_APP_BACKEND_TYPE=custom
REACT_APP_CUSTOM_BACKEND_URL=https://your-api.example.com
```

For custom backends with non-standard endpoints:
```bash
REACT_APP_BACKEND_TYPE=custom
REACT_APP_CUSTOM_BACKEND_URL=https://api.example.com
REACT_APP_CUSTOM_MSAL_TOKEN_PATH=/auth/token
REACT_APP_CUSTOM_APPROVAL_CREATE_PATH=/approvals/new
REACT_APP_CUSTOM_APPROVAL_DECISION_PATH=/approvals/decide
REACT_APP_CUSTOM_PERMS_RECOMPUTE_PATH=/permissions/sync
```

## API Endpoints

The frontend communicates with the following backend endpoints:

| Endpoint Name | Express Route | Cloud Function | Purpose |
|--------------|---------------|----------------|---------|
| `msalCustomToken` | `/api/auth/msal-custom-token` | `/msalCustomToken` | Exchange Microsoft ID token for Firebase custom token |
| `createApprovalRequest` | `/api/approvals/create` | `/createApprovalRequest` | Create approval request for issue closure |
| `handleApprovalDecision` | `/api/approvals/decision` | `/handleApprovalDecision` | Handle approval decision from Teams |
| `recomputeEffectivePerms` | `/api/permissions/recompute` | `/recomputeEffectivePerms` | Recompute user effective permissions |

## Usage in Code

### Using the API Client

The recommended way to make backend API calls:

```javascript
import { apiClient } from '../config/apiClient';

// Exchange MSAL token
const { customToken } = await apiClient.getMsalCustomToken(idToken);

// Create approval request
const result = await apiClient.createApprovalRequest({
  issueId: 'ISSUE-123',
  closureNote: 'Fixed',
  closurePhotoUrl: 'https://...',
  requestedBy: 'user@example.com'
});

// Recompute permissions
const { updated } = await apiClient.recomputeEffectivePerms(firebaseToken, {
  uid: 'user-id',
  dryRun: false
});
```

### Using the Configuration Directly

For advanced use cases:

```javascript
import { getEndpointUrl, apiConfig } from '../config/apiConfig';

// Get specific endpoint URL
const tokenUrl = getEndpointUrl('msalCustomToken');

// Access all configuration
console.log(apiConfig.backendType); // 'express'
console.log(apiConfig.baseUrl); // 'http://localhost:3001'
console.log(apiConfig.endpoints); // Object with all endpoint URLs
```

## Architecture

### File Structure

```
frontend/src/
├── config/
│   ├── apiConfig.js     # Backend configuration and endpoint mapping
│   └── apiClient.js     # HTTP client with typed methods
├── hooks/
│   └── useAuth.js       # Uses apiClient for MSAL token exchange
└── services/
    └── adminService.js  # Uses apiClient for approval requests
```

### How It Works

1. **Configuration Layer** (`apiConfig.js`)
   - Reads `REACT_APP_BACKEND_TYPE` from environment
   - Maps logical endpoint names to actual paths
   - Constructs full URLs based on backend type

2. **Client Layer** (`apiClient.js`)
   - Provides typed methods for each API endpoint
   - Handles HTTP requests, headers, and error handling
   - Returns parsed JSON responses

3. **Service Layer** (hooks/services)
   - Uses `apiClient` methods
   - No direct knowledge of backend infrastructure
   - Works with any backend type

## Switching Backends

### Development to Production

**Development** (local Express backend):
```bash
REACT_APP_BACKEND_TYPE=express
REACT_APP_BACKEND_URL=http://localhost:3001
```

**Production** (cloud-hosted Express):
```bash
REACT_APP_BACKEND_TYPE=express
REACT_APP_BACKEND_URL=https://api.sunbeth-energies.com
```

### Migrating to Cloud Functions

If you want to switch to Firebase Cloud Functions:

1. Update `.env`:
```bash
REACT_APP_BACKEND_TYPE=cloud-functions
REACT_APP_FUNCTIONS_REGION=us-central1
```

2. Deploy cloud functions:
```bash
cd frontend/functions
firebase deploy --only functions
```

3. Rebuild frontend:
```bash
npm run build
```

### Using a Different Backend

To integrate with a completely different backend:

1. Set backend type to `custom`:
```bash
REACT_APP_BACKEND_TYPE=custom
REACT_APP_CUSTOM_BACKEND_URL=https://your-backend.com
```

2. If your backend uses different endpoint paths, configure them:
```bash
REACT_APP_CUSTOM_MSAL_TOKEN_PATH=/v1/auth/exchange
REACT_APP_CUSTOM_APPROVAL_CREATE_PATH=/v1/approvals
```

3. Ensure your backend implements the expected API contract (see API Endpoints section)

## API Contract

Any backend must implement these endpoints with the following contracts:

### POST /api/auth/msal-custom-token
**Request:**
```json
{
  "idToken": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```
Or via header: `Authorization: Bearer <idToken>`

**Response:**
```json
{
  "customToken": "eyJhbGciOiJSUzI1NiIsInR..."
}
```

### POST /api/approvals/create
**Request:**
```json
{
  "issueId": "ISSUE-123",
  "closureNote": "Fixed the problem",
  "closurePhotoUrl": "https://...",
  "requestedBy": "user@example.com"
}
```

**Response:**
```json
{
  "id": "approval-id-123",
  "status": "pending"
}
```

### GET /api/approvals/decision
**Query Parameters:**
- `id`: Approval ID
- `decision`: 'approve' or 'reject'
- `token`: Security token

**Response:** HTML page confirming the decision

### POST /api/permissions/recompute
**Headers:**
- `Authorization: Bearer <firebase-id-token>`

**Request:**
```json
{
  "uid": "optional-user-id",
  "dryRun": false
}
```

**Response:**
```json
{
  "updated": 42,
  "dryRun": false,
  "scoped": true
}
```

## Deployment

### Vercel (with Express Backend)

Set environment variables in Vercel dashboard:
```
REACT_APP_BACKEND_TYPE=express
REACT_APP_BACKEND_URL=https://your-backend-api.com
```

### Vercel (with Cloud Functions)

```
REACT_APP_BACKEND_TYPE=cloud-functions
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FUNCTIONS_REGION=us-central1
```

## Troubleshooting

### "API endpoint not configured" error
- Check that `REACT_APP_BACKEND_TYPE` is set correctly
- Verify the corresponding URL environment variable is set
- Restart the development server after changing `.env`

### CORS errors
- Ensure your backend has CORS properly configured
- For Express backend, check `cors({ origin: true })` middleware
- For Cloud Functions, ensure the `cors` wrapper is used

### Authentication failures
- Verify Microsoft Azure AD credentials match between frontend and backend
- Check that Firebase project IDs match
- Ensure backend has proper service account credentials

## Best Practices

1. **Never hardcode URLs** - Always use environment variables
2. **Use apiClient methods** - Don't make raw fetch calls
3. **Test with multiple backends** - Ensure your code works with different backend types
4. **Document custom endpoints** - If adding new endpoints, update both `apiConfig.js` and this document
5. **Handle errors gracefully** - apiClient throws descriptive errors

## Adding New Endpoints

To add a new backend endpoint:

1. Add to `ENDPOINT_MAPPINGS` in `apiConfig.js`:
```javascript
const ENDPOINT_MAPPINGS = {
  'express': {
    // ... existing mappings
    myNewEndpoint: '/api/my/new/endpoint',
  },
  // ... other backend types
};
```

2. Add method to `apiClient.js`:
```javascript
export const apiClient = {
  // ... existing methods
  
  async myNewEndpoint(data) {
    return apiCall('myNewEndpoint', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
```

3. Use in your service/hook:
```javascript
import { apiClient } from '../config/apiClient';

const result = await apiClient.myNewEndpoint({ foo: 'bar' });
```

## Summary

The backend-agnostic architecture provides:
- ✅ **Flexibility** - Switch backends without code changes
- ✅ **Portability** - Deploy to any hosting platform
- ✅ **Maintainability** - Single source of truth for API configuration
- ✅ **Testability** - Easy to mock different backend types
- ✅ **Scalability** - Choose the right backend for your scale

For questions or issues, refer to the main project documentation or contact the development team.
