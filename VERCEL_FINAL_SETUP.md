# 🎯 Vercel Deployment - Final Configuration

## ✅ What We've Done

### 1. Repository Structure
```
/
├── api/                    # Serverless functions (root level for Vercel)
│   ├── health.js
│   ├── auth/
│   │   └── msal-custom-token.js
│   ├── approvals/
│   │   ├── create.js
│   │   └── decision.js
│   └── permissions/
│       └── recompute.js
│
├── frontend/               # React application
│   ├── src/
│   ├── public/
│   ├── build/             # Build output
│   └── package.json
│
├── backend/               # Express server (not used in Vercel)
└── vercel.json           # Vercel configuration
```

### 2. Vercel Configuration (`vercel.json`)
```json
{
  "version": 2,
  "builds": [
    { "src": "api/health.js", "use": "@vercel/node" },
    { "src": "api/auth/msal-custom-token.js", "use": "@vercel/node" },
    { "src": "api/approvals/create.js", "use": "@vercel/node" },
    { "src": "api/approvals/decision.js", "use": "@vercel/node" },
    { "src": "api/permissions/recompute.js", "use": "@vercel/node" },
    { "src": "frontend/package.json", "use": "@vercel/static-build", "config": { "distDir": "frontend/build" } }
  ],
  "routes": [
    { "src": "/api/health", "dest": "/api/health.js" },
    { "src": "/api/auth/msal-custom-token", "dest": "/api/auth/msal-custom-token.js" },
    { "src": "/api/approvals/create", "dest": "/api/approvals/create.js" },
    { "src": "/api/approvals/decision", "dest": "/api/approvals/decision.js" },
    { "src": "/api/permissions/recompute", "dest": "/api/permissions/recompute.js" },
    { "src": "/(.*)", "dest": "/$1" }
  ]
}
```

### 3. Git Repository
 - **Origin**: `https://github.com/oluwatobajoshua/sunbeth-coco-it.git`
- **Branch**: `main`
- **Git Root**: Repository root (not in frontend/)

### 4. Vercel Project
- **Name**: `sel-coco-station-report`
- **URL**: `https://sel-coco-station-report.vercel.app`
- **Dashboard**: `https://vercel.com/oluwatobajoshuas-projects/sel-coco-station-report`
- **Connected to GitHub**: Yes (auto-deploys on push)

## 📋 Next Steps

Go to: https://vercel.com/oluwatobajoshuas-projects/sel-coco-station-report/settings/environment-variables

**Backend Variables** (for API functions):
```
GCLOUD_PROJECT=sunbeth-energies-coco-it-891d2
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@sunbeth-energies-coco-it-891d2.iam.gserviceaccount.com
MSAL_TENANT_ID=3493b8fa-b849-45bc-b23e-7d0384e4fa46
MSAL_CLIENT_ID=d3f0a7e5-2fc7-416f-ac07-1bbc1e18b707
```

**Frontend Variables** (for React app):
```
REACT_APP_FIREBASE_API_KEY=AIzaSyDwX8eCGHWT7Fw3VRWVwHAZQfcwrqpgozk
REACT_APP_FIREBASE_AUTH_DOMAIN=sunbeth-energies-coco-it-891d2.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=sunbeth-energies-coco-it-891d2
(Last reviewed: 2025-11-09, redeploy trigger)
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=516808574981
REACT_APP_FIREBASE_APP_ID=1:516808574981:web:f79d3df537800e13d6746c

REACT_APP_MSAL_CLIENT_ID=d3f0a7e5-2fc7-416f-ac07-1bbc1e18b707
REACT_APP_MSAL_TENANT_ID=3493b8fa-b849-45bc-b23e-7d0384e4fa46
REACT_APP_MSAL_REDIRECT_URI=https://sel-coco-station-report.vercel.app

REACT_APP_BACKEND_TYPE=express
REACT_APP_BACKEND_URL=
REACT_APP_USE_MSAL_BRIDGE=true
```

### Step 3: Quick Add Environment Variables Script
```powershell
cd "C:\Users\OluwatobaOgunsakin\Downloads\SEL COCO Station Report"

# Read Firebase credentials
$json = Get-Content "C:\Users\OluwatobaOgunsakin\secrets\firebase\sunbeth-energies-coco-it-891d2-firebase-adminsdk-fbsvc-38f6c878ed.json" -Raw | ConvertFrom-Json
$projectId = $json.project_id
$clientEmail = $json.client_email
$privateKey = $json.private_key -replace "`n", "\n"

# Add to Vercel
Write-Output $projectId | vercel env add GCLOUD_PROJECT production
Write-Output $clientEmail | vercel env add FIREBASE_CLIENT_EMAIL production
Write-Output $privateKey | vercel env add FIREBASE_PRIVATE_KEY production
Write-Output "3493b8fa-b849-45bc-b23e-7d0384e4fa46" | vercel env add MSAL_TENANT_ID production
Write-Output "d3f0a7e5-2fc7-416f-ac07-1bbc1e18b707" | vercel env add MSAL_CLIENT_ID production
```

### Step 4: Configure Azure AD
1. Go to https://portal.azure.com
2. Azure Active Directory → App Registrations → Your App
3. Authentication → Add redirect URI:
   - `https://sel-coco-station-report.vercel.app`
   - `https://sel-coco-station-report.vercel.app/`
4. Save

### Step 5: Configure Firebase
1. Go to https://console.firebase.google.com
2. Project: sunbeth-energies-coco-it-891d2
3. Authentication → Settings → Authorized Domains
4. Add: `sel-coco-station-report.vercel.app`

### Step 6: Test Deployment
```powershell
# Test API
Invoke-RestMethod "https://sel-coco-station-report.vercel.app/api/health"

# Should return:
# {
#   "status": "ok",
#   "message": "COCO Backend API running on Vercel",
#   "timestamp": "2025-11-09T..."
# }

# Test Frontend
Start-Process "https://sel-coco-station-report.vercel.app"
```

## 🔧 Troubleshooting

### Build Fails with ESLint Errors
If you see ESLint warnings treated as errors:
```powershell
# Temporarily disable ESLint errors in CI
cd frontend
# Add to package.json scripts:
# "build": "DISABLE_ESLINT_PLUGIN=true react-scripts build"
```

### API Returns 404
- Check **Functions** tab in Vercel deployment
- Verify all 5 functions are listed
- Check routes in `vercel.json`

### Frontend Shows but API Doesn't Work
- Verify environment variables are set in Vercel
- Check function logs in Vercel dashboard
- Ensure `FIREBASE_PRIVATE_KEY` has literal `\n` (not actual newlines)

## 📊 Current Status

- ✅ Repository restructured for Vercel
- ✅ `vercel.json` configured with API functions and frontend build
- ✅ API functions at `/api/*` (5 total)
- ✅ Frontend React app in `/frontend`
- ✅ Git connected to GitHub
- ✅ Vercel project created and linked
- ⏳ Waiting for successful build
- ⏳ Need to add environment variables
- ⏳ Need to configure Azure AD and Firebase domains

## 🚀 Once Everything is Set Up

Your app will be fully operational at:
- **Frontend**: https://sel-coco-station-report.vercel.app
- **API Health**: https://sel-coco-station-report.vercel.app/api/health
- **API Auth**: https://sel-coco-station-report.vercel.app/api/auth/msal-custom-token
- **Approvals**: https://sel-coco-station-report.vercel.app/api/approvals/*
- **Permissions**: https://sel-coco-station-report.vercel.app/api/permissions/recompute

All on the same domain - no CORS issues! 🎉
