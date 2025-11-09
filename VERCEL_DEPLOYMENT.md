# Vercel Deployment Guide

## Hosting Architecture

This guide covers deploying the COCO app to Vercel with different backend options.

---

## Option 1: Frontend on Vercel + Backend on External Platform (RECOMMENDED)

### Why This Approach?
- ✅ Simplest setup
- ✅ Backend can use long-running processes
- ✅ Better for Firebase Admin SDK
- ✅ Free tiers available (Render, Railway)

### Step 1: Deploy Backend

#### Option A: Render.com (Easiest, Free Tier)

1. Go to https://render.com and sign up
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `sunbeth-coco-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free` or `Starter`

5. Add Environment Variables:
   ```
   PORT=3001
   MSAL_TENANT_ID=3493b8fa-b849-45bc-b23e-7d0384e4fa46
   MSAL_CLIENT_ID=d3f0a7e5-2fc7-416f-ac07-1bbc1e18b707
   MSAL_APPROLE_SUPERADMIN=SuperAdmin
   MSAL_APPROLE_ADMIN=Admin
   MSAL_APPROLE_MANAGER=Manager
   BOOTSTRAP_SUPERADMIN_EMAIL=oluwatoba.ogunsakin@sunbeth.net
   GCLOUD_PROJECT=sunbeth-energies-coco-it-891d2
   ```

6. Add Firebase Service Account (Secret File):
   - Upload your `serviceAccountKey.json` as a secret file
   - Set `GOOGLE_APPLICATION_CREDENTIALS=/etc/secrets/serviceAccountKey.json`

7. Deploy! You'll get a URL like: `https://sunbeth-coco-backend.onrender.com`

#### Option B: Railway.app (Also Free Tier)

```bash
cd backend
npm install -g @railway/cli
railway login
railway init
railway up
railway open  # Opens dashboard
```

Add environment variables in Railway dashboard.

#### Option C: Heroku (Paid)

```bash
cd backend
heroku create sunbeth-coco-backend
heroku config:set MSAL_TENANT_ID=your-tenant-id
heroku config:set MSAL_CLIENT_ID=your-client-id
# ... set other env vars
git push heroku main
```

---

### Step 2: Deploy Frontend to Vercel

#### A. Update Frontend Environment Variables

Create `frontend/.env.production`:
```bash
# Backend Configuration - IMPORTANT!
REACT_APP_BACKEND_TYPE=express
REACT_APP_BACKEND_URL=https://sunbeth-coco-backend.onrender.com

# Enable MSAL bridge for production
REACT_APP_USE_MSAL_BRIDGE=true

# Firebase Configuration (keep your existing values)
REACT_APP_FIREBASE_API_KEY=AIzaSyDwX8eCGHWT7Fw3VRWVwHAZQfcwrqpgozk
REACT_APP_FIREBASE_AUTH_DOMAIN=sunbeth-energies-coco-it-891d2.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=sunbeth-energies-coco-it-891d2
REACT_APP_FIREBASE_STORAGE_BUCKET=sunbeth-energies-coco-it-891d2.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=516808574981
REACT_APP_FIREBASE_APP_ID=1:516808574981:web:f79d3df537800e13d6746c

# Microsoft Configuration
REACT_APP_MSAL_CLIENT_ID=d3f0a7e5-2fc7-416f-ac07-1bbc1e18b707
REACT_APP_MSAL_TENANT_ID=3493b8fa-b849-45bc-b23e-7d0384e4fa46

# App Configuration
REACT_APP_ENVIRONMENT=production
REACT_APP_AUTH_PROVIDER=msal
REACT_APP_MS_LOGIN_METHOD=popup
REACT_APP_ENABLE_GOOGLE_SIGNIN=false
REACT_APP_STORAGE_MODE=inline
REACT_APP_COMPANY_NAME=Sunbeth Energies
REACT_APP_APP_URL=https://sunbeth-coco.vercel.app
```

#### B. Deploy to Vercel

**Via Vercel Dashboard (Easiest):**

1. Go to https://vercel.com and sign in
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: `Create React App`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`

5. Add Environment Variables:
   - Click "Environment Variables"
   - Add all variables from `.env.production`
   - Make sure to add `REACT_APP_BACKEND_URL` pointing to your backend

6. Deploy!

**Via Vercel CLI:**

```bash
cd frontend
npm install -g vercel
vercel login
vercel

# Follow prompts:
# - Set root directory: frontend
# - Override build settings if needed
```

---

## Option 2: Serverless Backend on Vercel (Advanced)

Convert Express routes to Vercel Serverless Functions.

### File Structure Needed:

```
frontend/
├── api/                           # Vercel serverless functions
│   ├── auth/
│   │   └── msal-custom-token.js
│   ├── approvals/
│   │   ├── create.js
│   │   └── decision.js
│   └── permissions/
│       └── recompute.js
├── public/
├── src/
└── package.json
```

### Example Serverless Function:

Create `frontend/api/health.js`:
```javascript
export default function handler(req, res) {
  res.status(200).json({ status: 'ok', message: 'Vercel serverless backend' });
}
```

Convert `backend/routes/auth.js` to `frontend/api/auth/msal-custom-token.js`:
```javascript
import admin from 'firebase-admin';
import { createRemoteJWKSet, jwtVerify } from 'jose';

// Initialize Firebase Admin (only once)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export default async function handler(req, res) {
  // Add CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ... rest of auth logic from backend/routes/auth.js
}
```

### Update Frontend Config:

```bash
REACT_APP_BACKEND_TYPE=express
REACT_APP_BACKEND_URL=/api  # Use relative path for same-domain
```

---

## Option 3: Keep Using Cloud Functions (No Express Needed)

If you want to avoid managing a separate backend:

1. Deploy frontend to Vercel
2. Keep using Firebase Cloud Functions
3. Update `.env`:

```bash
REACT_APP_BACKEND_TYPE=cloud-functions
REACT_APP_FIREBASE_PROJECT_ID=sunbeth-energies-coco-it-891d2
REACT_APP_FUNCTIONS_REGION=us-central1
REACT_APP_USE_MSAL_BRIDGE=true
```

4. Ensure Cloud Functions are deployed:
```bash
cd frontend/functions
firebase deploy --only functions
```

---

## Recommended Architecture for Production

### Development:
- Frontend: `localhost:3000`
- Backend: `localhost:3001` (Express)

### Production:
- Frontend: Vercel (`sunbeth-coco.vercel.app`)
- Backend: Render.com (`sunbeth-coco-backend.onrender.com`)
- Database: Firebase Firestore
- Auth: Microsoft Azure AD + Firebase Auth

---

## Post-Deployment Checklist

### 1. Update Azure AD Redirect URIs
Add your Vercel domain to Azure AD app registration:
- `https://your-app.vercel.app`
- `https://your-app.vercel.app/auth/callback`

### 2. Update Firebase Authorized Domains
In Firebase Console → Authentication → Settings → Authorized domains:
- Add `your-app.vercel.app`

### 3. Test the Flow
1. Visit your Vercel URL
2. Click "Sign in with Microsoft"
3. Complete login
4. Verify backend is called (check Network tab)
5. Verify data saves to Firestore

### 4. Monitor Logs
- **Backend logs**: Check Render/Railway/Heroku dashboard
- **Frontend logs**: Check Vercel deployment logs
- **Firebase logs**: Check Firebase Console

---

## Cost Estimate

### Free Tier Option:
- ✅ Vercel: Free (Hobby plan)
- ✅ Render.com: Free tier available
- ✅ Firebase: Spark plan (free tier)
- **Total: $0/month** (with limits)

### Production Option:
- Vercel: $20/month (Pro)
- Render.com: $7-25/month (Starter/Standard)
- Firebase: Pay-as-you-go (Blaze plan)
- **Total: ~$27-45/month**

---

## Troubleshooting

### CORS Errors
Ensure backend has proper CORS configuration:
```javascript
app.use(cors({
  origin: ['https://your-app.vercel.app', 'http://localhost:3000'],
  credentials: true
}));
```

### Backend Not Responding
- Check backend logs on hosting platform
- Verify `REACT_APP_BACKEND_URL` is correct
- Test backend health: `https://your-backend.com/health`

### Authentication Fails
- Check Azure AD redirect URIs
- Verify Firebase config matches
- Check backend environment variables
- Look for CORS issues in browser console

---

## Quick Deploy Commands

```bash
# 1. Deploy backend to Render (via dashboard)
# 2. Get backend URL
# 3. Update frontend .env with backend URL

# 4. Deploy frontend to Vercel
cd frontend
vercel --prod

# 5. Test
curl https://your-app.vercel.app
curl https://your-backend.onrender.com/health
```

---

Need help with deployment? Check:
- `SETUP_CHECKLIST.md` - Setup guide
- `ARCHITECTURE.md` - System architecture
- `backend/README.md` - Backend docs
