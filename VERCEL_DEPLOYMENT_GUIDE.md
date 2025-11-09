# 🚀 Vercel Deployment Guide

Complete guide for deploying the COCO Station Issue Tracking System to Vercel with integrated serverless backend.

## 📋 Prerequisites

- Vercel account (sign up at https://vercel.com)
- Vercel CLI installed: `npm install -g vercel`
- Firebase project with Admin SDK credentials
- Azure AD app registration with client ID and tenant ID
- Access to your Firebase service account JSON file

## 🏗️ Architecture on Vercel

```
┌─────────────────────────────────────────────────┐
│           Vercel Deployment                     │
│                                                 │
│  ┌──────────────────┐    ┌─────────────────┐  │
│  │   React Frontend │    │ Serverless API  │  │
│  │   (Static Build) │───▶│  /api/*         │  │
│  └──────────────────┘    └─────────────────┘  │
│                               │                 │
└───────────────────────────────┼─────────────────┘
                                │
                    ┌───────────┴──────────┐
                    │                      │
            ┌───────▼────────┐    ┌───────▼─────────┐
            │ Firebase       │    │  Microsoft      │
            │ (Firestore +   │    │  Azure AD       │
            │  Auth)         │    │  (MSAL)         │
            └────────────────┘    └─────────────────┘
```

## 📦 Step 1: Prepare Your Project

### 1.1 Navigate to Frontend Directory
```powershell
cd frontend
```

### 1.2 Verify Build Works
```powershell
npm run build
```

This should create a `build/` directory with your production-ready React app.

## 🔐 Step 2: Configure Environment Variables

### 2.1 Get Firebase Service Account Credentials

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Project Settings** → **Service Accounts**
4. Click **Generate New Private Key**
5. Save the JSON file securely

### 2.2 Extract Required Values

From the downloaded JSON file, extract:
- `project_id` → `GCLOUD_PROJECT`
- `private_key` → `FIREBASE_PRIVATE_KEY`
- `client_email` → `FIREBASE_CLIENT_EMAIL`

**IMPORTANT**: The `private_key` must be formatted with `\n` as literal characters, not actual newlines.

### 2.3 Format Private Key for Vercel

Use this PowerShell command to format the private key correctly:
```powershell
# Read the JSON file and extract the private key with escaped newlines
$json = Get-Content service-account.json -Raw | ConvertFrom-Json
$privateKey = $json.private_key -replace "`n", "\n"
Write-Output $privateKey
```

Copy the output (it should look like `"-----BEGIN PRIVATE KEY-----\nMIIEvQIBADA...\n-----END PRIVATE KEY-----\n"`)

### 2.4 Get Azure AD Credentials

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App Registrations**
3. Select your app
4. Copy:
   - **Application (client) ID** → `MSAL_CLIENT_ID` and `REACT_APP_MSAL_CLIENT_ID`
   - **Directory (tenant) ID** → `MSAL_TENANT_ID` and `REACT_APP_MSAL_TENANT_ID`

## 🌐 Step 3: Deploy to Vercel

### 3.1 Login to Vercel CLI
```powershell
vercel login
```

### 3.2 Initial Deployment
```powershell
# Deploy from the frontend directory
cd frontend
vercel
```

Follow the prompts:
- **Set up and deploy?** Yes
- **Which scope?** Select your account/team
- **Link to existing project?** No
- **Project name?** `coco-station-tracker` (or your preferred name)
- **Directory?** `.` (current directory)
- **Override settings?** No

This creates a preview deployment and gives you a URL like `https://coco-station-tracker-xxx.vercel.app`

### 3.3 Add Environment Variables

Go to [Vercel Dashboard](https://vercel.com/dashboard) → Your Project → **Settings** → **Environment Variables**

Add all variables from `.env.vercel.example`:

#### Firebase Variables (Backend)
| Variable | Value | Environments |
|----------|-------|--------------|
| `GCLOUD_PROJECT` | your-firebase-project-id | Production, Preview, Development |
| `FIREBASE_PRIVATE_KEY` | "-----BEGIN PRIVATE KEY-----\n..." | Production, Preview, Development |
| `FIREBASE_CLIENT_EMAIL` | firebase-adminsdk-xxx@... | Production, Preview, Development |

#### Firebase Variables (Frontend)
| Variable | Value | Environments |
|----------|-------|--------------|
| `REACT_APP_FIREBASE_API_KEY` | AIzaSy... | Production, Preview, Development |
| `REACT_APP_FIREBASE_AUTH_DOMAIN` | your-project.firebaseapp.com | Production, Preview, Development |
| `REACT_APP_FIREBASE_PROJECT_ID` | your-firebase-project-id | Production, Preview, Development |
| `REACT_APP_FIREBASE_STORAGE_BUCKET` | your-project.appspot.com | Production, Preview, Development |
| `REACT_APP_FIREBASE_MESSAGING_SENDER_ID` | 123456789012 | Production, Preview, Development |
| `REACT_APP_FIREBASE_APP_ID` | 1:123456789012:web:... | Production, Preview, Development |
| `REACT_APP_FIREBASE_MEASUREMENT_ID` | G-XXXXXXXXXX | Production, Preview, Development |

#### Azure AD Variables
| Variable | Value | Environments |
|----------|-------|--------------|
| `MSAL_TENANT_ID` | xxxxxxxx-xxxx-xxxx-... | Production, Preview, Development |
| `MSAL_CLIENT_ID` | yyyyyyyy-yyyy-yyyy-... | Production, Preview, Development |
| `REACT_APP_MSAL_CLIENT_ID` | yyyyyyyy-yyyy-yyyy-... | Production, Preview, Development |
| `REACT_APP_MSAL_TENANT_ID` | xxxxxxxx-xxxx-xxxx-... | Production, Preview, Development |
| `REACT_APP_MSAL_REDIRECT_URI` | https://your-app.vercel.app | Production, Preview, Development |

#### Backend Configuration
| Variable | Value | Environments |
|----------|-------|--------------|
| `REACT_APP_BACKEND_TYPE` | express | Production, Preview, Development |
| `REACT_APP_BACKEND_URL` | (leave empty) | Production, Preview, Development |
| `REACT_APP_USE_MSAL_BRIDGE` | true | Production, Preview, Development |

#### Optional: Teams Webhook
| Variable | Value | Environments |
|----------|-------|--------------|
| `TEAMS_WEBHOOK_URL` | https://outlook.office.com/webhook/... | Production (optional) |

### 3.4 Production Deployment
```powershell
vercel --prod
```

This deploys to your production domain (e.g., `https://coco-station-tracker.vercel.app`)

## 🔧 Step 4: Configure Azure AD Redirect URIs

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App Registrations** → Your App
3. Go to **Authentication**
4. Under **Single-page application** platform, add these redirect URIs:
   - `https://your-production-domain.vercel.app`
   - `https://your-production-domain.vercel.app/`
   - `https://*.vercel.app` (for preview deployments)
5. Click **Save**

## 🔥 Step 5: Configure Firebase Authorized Domains

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Authentication** → **Settings** → **Authorized Domains**
4. Add:
   - `your-production-domain.vercel.app`
   - `vercel.app` (for preview deployments)
5. Click **Add Domain**

## ✅ Step 6: Verify Deployment

### 6.1 Test Health Endpoint
```powershell
curl https://your-app.vercel.app/api/health
```

Expected response:
```json
{
  "status": "ok",
  "message": "COCO Backend API running on Vercel"
}
```

### 6.2 Test Microsoft Login Flow

1. Visit `https://your-app.vercel.app`
2. Click **Login with Microsoft**
3. Complete Azure AD authentication
4. Verify you're redirected back and authenticated
5. Check browser console for any errors

### 6.3 Test Issue Submission

1. Navigate to **Report Issue** page
2. Fill out the form
3. Upload a photo (optional)
4. Submit the issue
5. Verify it appears in Firestore

### 6.4 Test Admin Features (if admin user)

1. Navigate to **Admin** page
2. Test approval workflow creation
3. Test permission recomputation
4. Verify all backend API calls work

## 🐛 Troubleshooting

### Issue: 500 Internal Server Error on `/api/*` endpoints

**Solution**: Check Vercel Function Logs
1. Go to Vercel Dashboard → Your Project → **Deployments**
2. Click on the latest deployment
3. Go to **Functions** tab
4. Click on failing function to see logs
5. Look for errors related to:
   - Missing environment variables
   - Firebase initialization errors
   - JWT verification errors

### Issue: Firebase Admin SDK initialization error

**Symptom**: Error message "Failed to initialize Firebase Admin SDK"

**Solution**: Verify `FIREBASE_PRIVATE_KEY` format
- Must include literal `\n` characters (not actual newlines)
- Must be wrapped in double quotes
- Use the PowerShell command from Step 2.3 to format correctly

### Issue: MSAL authentication fails

**Symptom**: Microsoft login redirects but doesn't complete authentication

**Solutions**:
1. Verify Azure AD redirect URIs include your Vercel domain
2. Check `REACT_APP_MSAL_REDIRECT_URI` matches your actual domain
3. Check browser console for MSAL errors
4. Verify `MSAL_TENANT_ID` and `MSAL_CLIENT_ID` are correct

### Issue: CORS errors

**Symptom**: Browser console shows "CORS policy blocked" errors

**Solution**: Serverless functions should already set CORS headers
- Check `frontend/api/*/` files include CORS headers
- Verify Origin header in requests
- Check if you're mixing HTTP/HTTPS

### Issue: Environment variables not updating

**Solution**: Redeploy after changing environment variables
```powershell
vercel --prod --force
```

## 📊 Monitoring & Logs

### View Function Logs
1. Vercel Dashboard → Your Project → **Deployments**
2. Click on a deployment
3. Go to **Functions** tab
4. Click on any function to see real-time logs

### View Build Logs
1. Vercel Dashboard → Your Project → **Deployments**
2. Click on a deployment
3. Go to **Building** tab

### Set Up Alerts
1. Vercel Dashboard → Your Project → **Settings**
2. Go to **Notifications**
3. Configure email/Slack alerts for:
   - Deployment failures
   - Function errors
   - Quota warnings

## 🔄 Continuous Deployment

Vercel automatically deploys on every Git push if you connected your repository.

### Connect Git Repository
1. Vercel Dashboard → Your Project → **Settings** → **Git**
2. Click **Connect Git Repository**
3. Select GitHub/GitLab/Bitbucket
4. Choose your repository
5. Configure:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`
   - **Install Command**: `npm install`

Now every push to `main` branch triggers production deployment automatically!

## 📈 Performance Optimization

### Enable Edge Caching
Already configured in `vercel.json`:
```json
{
  "headers": [
    {
      "source": "/static/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### Monitor Function Performance
- Go to Vercel Dashboard → **Analytics**
- Check serverless function execution times
- Optimize slow endpoints if needed

## 🔒 Security Checklist

- [ ] Firebase service account key secured in Vercel environment variables only
- [ ] Azure AD redirect URIs restricted to your Vercel domains only
- [ ] Firebase authorized domains restricted to your Vercel domains
- [ ] Firestore security rules properly configured
- [ ] Firebase Storage rules properly configured
- [ ] All sensitive environment variables marked as "Sensitive" in Vercel
- [ ] Admin role assignments reviewed in Firestore
- [ ] CORS headers properly configured in serverless functions

## 💰 Cost Considerations

### Vercel Free Tier Includes:
- 100 GB bandwidth per month
- 100 GB-hours serverless function execution
- Unlimited deployments
- Preview deployments for all branches

### Firebase Spark (Free) Tier Includes:
- 1 GB storage
- 10 GB monthly transfer
- 50K document reads/day
- 20K document writes/day

Monitor usage in:
- **Vercel**: Dashboard → **Usage**
- **Firebase**: Console → **Usage and Billing**

## 🆘 Support

If you encounter issues:

1. Check Vercel function logs (Dashboard → Deployments → Functions)
2. Check browser console for frontend errors
3. Review Firebase Firestore rules and logs
4. Verify all environment variables are set correctly
5. Test locally with `vercel dev` before deploying

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)
- [Firebase Admin SDK Documentation](https://firebase.google.com/docs/admin/setup)
- [Microsoft MSAL.js Documentation](https://github.com/AzureAD/microsoft-authentication-library-for-js)

---

**Deployment Complete! 🎉**

Your COCO Station Issue Tracking System is now live on Vercel with integrated serverless backend.
