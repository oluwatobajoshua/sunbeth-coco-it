# Quick Start: Backend Configuration

## Default Setup (Express Backend)

The frontend is now configured to use the new Express backend by default.

### Step 1: Copy Environment File

```powershell
# In the frontend directory
cp .env.example .env
```

### Step 2: Verify Backend Configuration

Your `.env` should include:

```bash
# Backend Configuration (uses local Express backend by default)
REACT_APP_BACKEND_TYPE=express
REACT_APP_BACKEND_URL=http://localhost:3001
```

### Step 3: Start Backend Server

```powershell
# Open a new terminal
cd backend
npm install   # First time only
npm start
```

The backend will run on `http://localhost:3001`

### Step 4: Start Frontend

```powershell
# In the frontend directory
npm install   # First time only
npm start
```

The frontend will run on `http://localhost:3000`

## What Changed?

### Old Architecture (Hardcoded Cloud Functions)
```javascript
// ❌ Old way - hardcoded URLs
const url = `https://us-central1-${projectId}.cloudfunctions.net/msalCustomToken`;
const response = await fetch(url, { method: 'POST', ... });
```

### New Architecture (Backend-Agnostic)
```javascript
// ✅ New way - uses configured backend
import { apiClient } from '../config/apiClient';
const result = await apiClient.getMsalCustomToken(idToken);
```

## Switching Backends

### Use Cloud Functions Instead

Update `.env`:
```bash
REACT_APP_BACKEND_TYPE=cloud-functions
REACT_APP_FUNCTIONS_REGION=us-central1
```

### Use Custom Backend

Update `.env`:
```bash
REACT_APP_BACKEND_TYPE=custom
REACT_APP_CUSTOM_BACKEND_URL=https://your-api.example.com
```

## Production Deployment

### Option 1: Express Backend on Heroku/Render/etc.

1. Deploy backend to your hosting platform
2. Update frontend `.env` for production:
```bash
REACT_APP_BACKEND_TYPE=express
REACT_APP_BACKEND_URL=https://your-backend-url.com
```

### Option 2: Firebase Cloud Functions

1. Deploy functions:
```bash
cd frontend/functions
firebase deploy --only functions
```

2. Update frontend `.env`:
```bash
REACT_APP_BACKEND_TYPE=cloud-functions
```

## Environment Variables Quick Reference

| Variable | Purpose | Default |
|----------|---------|---------|
| `REACT_APP_BACKEND_TYPE` | Backend type: `express`, `cloud-functions`, or `custom` | `express` |
| `REACT_APP_BACKEND_URL` | Express backend URL | `http://localhost:3001` |
| `REACT_APP_FUNCTIONS_REGION` | Cloud Functions region | `us-central1` |
| `REACT_APP_CUSTOM_BACKEND_URL` | Custom backend URL | - |

## Testing Your Setup

### 1. Check Backend Health
```powershell
curl http://localhost:3001/health
```

Expected response:
```json
{"status":"ok","message":"COCO Backend is running"}
```

### 2. Check Frontend Configuration

Open browser console and look for:
```
✅ API Config: Using express backend at http://localhost:3001
```

### 3. Test Authentication Flow

Try signing in - the frontend should call the backend's `/api/auth/msal-custom-token` endpoint.

## Need Help?

- 📖 Full documentation: `docs/BACKEND_API_CONFIGURATION.md`
- 🔧 Backend setup: `../backend/README.md`
- 🐛 Troubleshooting: Check both frontend and backend logs

## Common Issues

### "API endpoint not configured"
- **Solution**: Restart frontend dev server after changing `.env`

### CORS errors
- **Solution**: Ensure backend is running and has CORS enabled

### Authentication fails
- **Solution**: Check that `.env` has correct Azure AD credentials

---

**You're all set!** The frontend will now communicate with your configured backend. 🚀
