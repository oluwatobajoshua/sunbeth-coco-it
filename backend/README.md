# COCO Backend API

Backend server for COCO Station Issue Tracker - Sunbeth Energies.

This Express-based backend clones all the Firebase Cloud Functions from `frontend/functions/` and exposes them as REST API endpoints.

## Features

- **Authentication**: Microsoft Azure AD token exchange for Firebase custom tokens
- **Approvals**: Create and manage approval requests with Teams webhook integration
- **Permissions**: Recompute user effective permissions based on role inheritance
- Firebase Admin SDK integration
- CORS-enabled REST API

## Prerequisites

- Node.js 18+ (same as Firebase Functions)
- Firebase project with Admin SDK credentials
- Microsoft Azure AD app registration (for MSAL)

## Installation

```powershell
cd backend
npm install
```

## Configuration

1. Copy `.env.example` to `.env`:
```powershell
cp .env.example .env
```

2. Configure your environment variables in `.env`:
   - `PORT`: Server port (default: 3001)
   - `GOOGLE_APPLICATION_CREDENTIALS`: Path to Firebase service account JSON
   - `MSAL_TENANT_ID`, `MSAL_CLIENT_ID`: Microsoft Azure AD credentials
   - `GCLOUD_PROJECT`: Your Firebase/GCP project ID

3. Place your Firebase service account key as `serviceAccountKey.json` in the backend folder (or use Application Default Credentials).

## Running the Server

### Development (with auto-reload)
```powershell
npm run dev
```

### Production
```powershell
npm start
```

The server will start on `http://localhost:3001` (or your configured PORT).

## API Endpoints

### Health Check
- **GET** `/health` - Check if server is running

### Authentication
- **POST** `/api/auth/msal-custom-token` - Exchange Microsoft ID token for Firebase custom token
  - Body: `{ "idToken": "..." }` or Authorization header: `Bearer <idToken>`
  - Returns: `{ "customToken": "..." }`

### Approvals
- **POST** `/api/approvals/create` - Create approval request and send Teams notification
  - Body: `{ "issueId": "...", "closureNote": "...", "closurePhotoUrl": "...", "requestedBy": "..." }`
  - Returns: `{ "id": "...", "status": "pending" }`

- **GET** `/api/approvals/decision?id=...&decision=approve|reject&token=...` - Handle approval decision from Teams link
  - Returns: HTML page confirming the decision

### Permissions
- **POST** `/api/permissions/recompute` - Recompute effective permissions for users
  - Headers: `Authorization: Bearer <firebase-id-token>`
  - Body: `{ "uid": "..." (optional), "dryRun": false }`
  - Returns: `{ "updated": 123, "dryRun": false, "scoped": false }`

## Migration from Cloud Functions

This backend replicates the following Firebase Cloud Functions:

1. `msalCustomToken` → `/api/auth/msal-custom-token`
2. `createApprovalRequest` → `/api/approvals/create`
3. `handleApprovalDecision` → `/api/approvals/decision`
4. `recomputeEffectivePerms` → `/api/permissions/recompute`

### Frontend Integration

Update your frontend to point to the new backend URLs instead of Cloud Functions:

```javascript
// Old (Cloud Functions)
const url = `https://us-central1-${projectId}.cloudfunctions.net/msalCustomToken`;

// New (Backend API)
const url = `http://localhost:3001/api/auth/msal-custom-token`;
```

## Project Structure

```
backend/
├── index.js              # Main Express app
├── routes/
│   ├── auth.js          # Authentication routes
│   ├── approvals.js     # Approval workflow routes
│   └── permissions.js   # Permission management routes
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

## Security Notes

- All endpoints use CORS with `{ origin: true }` - configure this appropriately for production
- Authentication endpoints verify Microsoft ID tokens using JWKS
- Permission endpoints require valid Firebase ID tokens with Admin/Super Admin roles
- Approval decision tokens are one-time-use SHA256 hashes

## Troubleshooting

### Firebase Admin initialization fails
- Ensure `GOOGLE_APPLICATION_CREDENTIALS` points to a valid service account JSON
- Or use Application Default Credentials (`gcloud auth application-default login`)

### MSAL token verification fails
- Verify `MSAL_TENANT_ID` and `MSAL_CLIENT_ID` are correct
- Check that the ID token is valid and not expired

### Teams webhook not sending
- Ensure `approvalsTeamsWebhookUrl` is configured in Firestore `settings/app` document
- Verify the webhook URL is accessible

## Development Tips

- Use `nodemon` for auto-reload during development (`npm run dev`)
- Check logs for detailed error messages
- Test endpoints with Postman or curl
- Health check endpoint: `curl http://localhost:3001/health`

## License

Proprietary - Sunbeth Energies
