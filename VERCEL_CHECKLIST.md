# ✅ Vercel Deployment Checklist

Quick reference checklist for deploying COCO Station Tracker to Vercel.

## 📋 Pre-Deployment

- [ ] Build works locally: `cd frontend && npm run build`
- [ ] Firebase service account JSON file downloaded
- [ ] Azure AD app registration completed
- [ ] Vercel account created and CLI installed: `npm install -g vercel`

## 🔐 Required Credentials

### Firebase
- [ ] `GCLOUD_PROJECT` (from service account JSON)
- [ ] `FIREBASE_PRIVATE_KEY` (formatted with `\n` as literal characters)
- [ ] `FIREBASE_CLIENT_EMAIL` (from service account JSON)
- [ ] Frontend Firebase config (API key, auth domain, etc.)

### Azure AD
- [ ] `MSAL_TENANT_ID` (from Azure Portal)
- [ ] `MSAL_CLIENT_ID` (from Azure Portal)

## 🚀 Deployment Steps

### 1. Initial Deploy
```powershell
cd frontend
vercel login
vercel
```

### 2. Add Environment Variables
Go to Vercel Dashboard → Project → Settings → Environment Variables

Add all variables from `.env.vercel.example` (29 variables total):

**Backend (3):**
- [ ] `GCLOUD_PROJECT`
- [ ] `FIREBASE_PRIVATE_KEY`
- [ ] `FIREBASE_CLIENT_EMAIL`

**Frontend Firebase (7):**
- [ ] `REACT_APP_FIREBASE_API_KEY`
- [ ] `REACT_APP_FIREBASE_AUTH_DOMAIN`
- [ ] `REACT_APP_FIREBASE_PROJECT_ID`
- [ ] `REACT_APP_FIREBASE_STORAGE_BUCKET`
- [ ] `REACT_APP_FIREBASE_MESSAGING_SENDER_ID`
- [ ] `REACT_APP_FIREBASE_APP_ID`
- [ ] `REACT_APP_FIREBASE_MEASUREMENT_ID`

**Azure AD (4):**
- [ ] `MSAL_TENANT_ID`
- [ ] `MSAL_CLIENT_ID`
- [ ] `REACT_APP_MSAL_CLIENT_ID`
- [ ] `REACT_APP_MSAL_TENANT_ID`
- [ ] `REACT_APP_MSAL_REDIRECT_URI` (your Vercel URL)

**Backend Config (3):**
- [ ] `REACT_APP_BACKEND_TYPE=express`
- [ ] `REACT_APP_BACKEND_URL=` (leave empty)
- [ ] `REACT_APP_USE_MSAL_BRIDGE=true`

**Optional:**
- [ ] `TEAMS_WEBHOOK_URL` (for approval notifications)

### 3. Production Deploy
```powershell
vercel --prod
```

Copy your production URL (e.g., `https://coco-station-tracker.vercel.app`)

### 4. Configure Azure AD
- [ ] Go to Azure Portal → Azure AD → App Registrations → Your App
- [ ] Go to **Authentication**
- [ ] Add redirect URI: `https://your-app.vercel.app`
- [ ] Add wildcard URI: `https://*.vercel.app` (for previews)
- [ ] Click **Save**

### 5. Configure Firebase
- [ ] Go to Firebase Console → Authentication → Settings
- [ ] Go to **Authorized Domains**
- [ ] Add: `your-app.vercel.app`
- [ ] Add: `vercel.app` (for previews)
- [ ] Click **Add Domain**

## ✅ Verification

### Test API Health
```powershell
curl https://your-app.vercel.app/api/health
```

Expected: `{"status":"ok","message":"COCO Backend API running on Vercel"}`

### Test Frontend
- [ ] Visit `https://your-app.vercel.app`
- [ ] Click "Login with Microsoft"
- [ ] Complete authentication
- [ ] Verify redirect back to app
- [ ] Check browser console for errors

### Test Backend Integration
- [ ] Submit a test issue (Report Issue page)
- [ ] Verify it appears in Firestore
- [ ] Test photo upload (if applicable)
- [ ] Check Vercel function logs for errors

### Test Admin Features (if admin)
- [ ] Navigate to Admin page
- [ ] Test approval workflow
- [ ] Test permission recomputation
- [ ] Verify all API calls work

## 🐛 Common Issues

### API returns 500 errors
→ Check Vercel function logs: Dashboard → Deployments → Functions
→ Verify environment variables are set correctly
→ Check `FIREBASE_PRIVATE_KEY` has literal `\n` (not actual newlines)

### Microsoft login fails
→ Verify Azure AD redirect URIs include your Vercel domain
→ Check `REACT_APP_MSAL_REDIRECT_URI` matches actual domain
→ Verify `MSAL_TENANT_ID` and `MSAL_CLIENT_ID` are correct

### Environment variables not working
→ Redeploy after changing variables: `vercel --prod --force`

## 📊 Post-Deployment

- [ ] Monitor function logs for first 24 hours
- [ ] Set up Vercel alerts (Settings → Notifications)
- [ ] Review Firebase usage (Console → Usage and Billing)
- [ ] Test all user roles (admin, user, super admin)
- [ ] Configure Git integration for auto-deploy (optional)

## 🔒 Security Review

- [ ] Firebase service account key only in Vercel (not in code)
- [ ] Azure AD redirect URIs restricted to Vercel domains
- [ ] Firebase authorized domains restricted to Vercel domains
- [ ] Firestore security rules reviewed and tested
- [ ] Storage rules reviewed and tested
- [ ] All sensitive vars marked as "Sensitive" in Vercel

## 📚 Resources

- Full Guide: `VERCEL_DEPLOYMENT_GUIDE.md`
- Environment Variables: `.env.vercel.example`
- Vercel Dashboard: https://vercel.com/dashboard
- Firebase Console: https://console.firebase.google.com
- Azure Portal: https://portal.azure.com

---

**Estimated Time:** 30-45 minutes for first deployment
**Difficulty:** Medium (requires multiple platform configurations)
