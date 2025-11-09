# Environment Variables Checklist

Concise list of required environment variables for both backend (serverless functions) and frontend (React). Fill in with your real values and then sync to Vercel (production + preview).

## Backend (Serverless Functions)
These must be available to API functions under `/api/*`.

| Variable | Purpose | Example / Notes |
|----------|---------|-----------------|
| GCLOUD_PROJECT | Firebase project ID | sunbeth-energies-coco-it-891d2 |
| FIREBASE_CLIENT_EMAIL | Service account client email | firebase-adminsdk-xxxxx@<project>.iam.gserviceaccount.com |
| FIREBASE_PRIVATE_KEY | Escaped private key with literal \n | "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n" |
| MSAL_TENANT_ID | Azure AD Tenant ID (GUID) | 3493b8fa-b849-45bc-b23e-7d0384e4fa46 |
| MSAL_CLIENT_ID | Azure AD App (client) ID | d3f0a7e5-2fc7-416f-ac07-1bbc1e18b707 |
| MSAL_APPROLE_SUPERADMIN | (Optional) App role value for super admins | superadmin |
| MSAL_APPROLE_ADMIN | (Optional) App role value for admins | admin |
| MSAL_APPROLE_MANAGER | (Optional) App role value for managers | manager |
| BOOTSTRAP_SUPERADMIN_EMAIL | (Optional) Email promoted to Super Admin automatically | admin@example.com |
| TEAMS_WEBHOOK_URL | (Optional) Teams incoming webhook for notifications | https://outlook.office.com/webhook/... |

## Frontend (React App)
Must be prefixed with `REACT_APP_` to be embedded in the build.

| Variable | Purpose | Example / Notes |
|----------|---------|-----------------|
| REACT_APP_FIREBASE_API_KEY | Firebase web API key | AIzaSy... |
| REACT_APP_FIREBASE_AUTH_DOMAIN | Firebase auth domain | <project>.firebaseapp.com |
| REACT_APP_FIREBASE_PROJECT_ID | Firebase project ID | sunbeth-energies-coco-it-891d2 |
| REACT_APP_FIREBASE_STORAGE_BUCKET | Storage bucket | <project>.appspot.com |
| REACT_APP_FIREBASE_MESSAGING_SENDER_ID | Optional | 516808574981 |
| REACT_APP_FIREBASE_APP_ID | Firebase app ID | 1:516808574981:web:xxxx |
| REACT_APP_MSAL_CLIENT_ID | Azure AD App client ID | d3f0a7e5-... |
| REACT_APP_MSAL_TENANT_ID | Azure AD Tenant ID | 3493b8fa-... |
| REACT_APP_MSAL_REDIRECT_URI | SPA redirect URI | https://sel-coco-station-report.vercel.app |
| REACT_APP_BACKEND_TYPE | Backend strategy | express |
| REACT_APP_BACKEND_URL | Override base URL (blank = same origin) | (leave empty) |
| REACT_APP_USE_MSAL_BRIDGE | Whether token bridge is enabled | true |
| REACT_APP_BOOTSTRAP_SUPERADMIN_EMAIL | Mirror of bootstrap email if needed in UI | admin@example.com |

## Optional Values & Notes
- If you don't use Azure AD app roles, you can omit the `MSAL_APPROLE_*` variables; role detection will fall back to Firestore user records.
- Leaving `REACT_APP_BACKEND_URL` empty ensures the frontend points to same origin `/api` when deployed on Vercel.
- Always escape newlines in `FIREBASE_PRIVATE_KEY` as `\n` for Vercel.

## Sync Strategy
1. Populate a copy of `scripts/vercel-env.example.json` with real values.
2. Use `pwsh scripts/sync-vercel-env.ps1 -Project sel-coco-station-report` to push to Vercel.
3. Trigger a deployment (preview or production) after updating secret values.

## Quick Verification Commands
```powershell
# Check health endpoint after deploy
Invoke-RestMethod https://sel-coco-station-report.vercel.app/api/health

# Decode build-time env via browser devtools:
# window.__ENV__ (if you add a dump helper) or inspect network calls.
```

---
Keep this file updated whenever new environment variables are introduced.
