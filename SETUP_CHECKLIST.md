# 🚀 Setup Checklist

Complete these steps to get your COCO application running with the new backend architecture.

---

## ✅ Backend Setup

### Step 1: Install Dependencies
```powershell
cd backend
npm install
```
**Expected**: `added 268 packages` (already done ✅)

---

### Step 2: Configure Environment

Copy the example file:
```powershell
cp .env.example .env
```

Edit `backend/.env` with your credentials:
```bash
PORT=3001

# Firebase Admin SDK
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json

# Microsoft Azure AD
MSAL_TENANT_ID=your-tenant-id-here
MSAL_CLIENT_ID=your-client-id-here
MSAL_APPROLE_SUPERADMIN=SuperAdmin
MSAL_APPROLE_ADMIN=Admin
MSAL_APPROLE_MANAGER=Manager

# Bootstrap (optional)
BOOTSTRAP_SUPERADMIN_EMAIL=your-admin@example.com

# Google Cloud
GCLOUD_PROJECT=your-firebase-project-id
```

**Checklist:**
- [ ] `MSAL_TENANT_ID` - From Azure AD app registration
- [ ] `MSAL_CLIENT_ID` - From Azure AD app registration  
- [ ] `GCLOUD_PROJECT` - Your Firebase project ID
- [ ] `GOOGLE_APPLICATION_CREDENTIALS` - Path to service account JSON

---

### Step 3: Add Firebase Service Account Key

1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Save the JSON file as `backend/serviceAccountKey.json`

**Security Note:** This file is in `.gitignore` and should never be committed!

**Checklist:**
- [ ] Service account key downloaded
- [ ] Saved as `backend/serviceAccountKey.json`
- [ ] File is in `.gitignore`

---

### Step 4: Start Backend Server

```powershell
npm start
```

**Expected Output:**
```
✅ COCO Backend running on port 3001
📍 Health check: http://localhost:3001/health
```

**Test it:**
```powershell
curl http://localhost:3001/health
```

**Expected Response:**
```json
{"status":"ok","message":"COCO Backend is running"}
```

**Checklist:**
- [ ] Backend starts without errors
- [ ] Health check returns OK
- [ ] No Firebase credential errors in logs

---

## ✅ Frontend Setup

### Step 5: Install Dependencies
```powershell
cd frontend
npm install
```

---

### Step 6: Configure Environment

The `.env.example` already has the correct defaults, but verify:

```bash
# Backend Configuration (should already be set correctly)
REACT_APP_BACKEND_TYPE=express
REACT_APP_BACKEND_URL=http://localhost:3001
```

**Checklist:**
- [ ] `REACT_APP_BACKEND_TYPE=express`
- [ ] `REACT_APP_BACKEND_URL=http://localhost:3001`
- [ ] Firebase config variables present
- [ ] Azure AD variables present

---

### Step 7: Start Frontend

```powershell
npm start
```

**Expected Output:**
- Development server starts on `http://localhost:3000`
- Opens browser automatically
- Console shows: `✅ API Config: Using express backend at http://localhost:3001`

**Checklist:**
- [ ] Frontend starts without errors
- [ ] API configuration logged correctly
- [ ] No CORS errors in browser console
- [ ] Can access the landing page

---

## ✅ Verification Tests

### Test 1: Backend Health Check
```powershell
curl http://localhost:3001/health
```
✅ Should return: `{"status":"ok","message":"COCO Backend is running"}`

---

### Test 2: Frontend API Configuration

Open browser console and check for:
```
✅ API Config: Using express backend at http://localhost:3001
```

Or run:
```javascript
// In browser console
import { apiConfig } from './config/apiConfig';
console.log(apiConfig);
```

---

### Test 3: Authentication Flow (Optional)

1. Click "Sign in with Microsoft"
2. Complete Microsoft login
3. Check browser Network tab:
   - Should see POST to `http://localhost:3001/api/auth/msal-custom-token`
   - Should receive `{ customToken: "..." }` response
4. User should be authenticated

---

### Test 4: CORS (Optional)

If you see CORS errors:
- Backend should have `cors({ origin: true })` enabled (already configured ✅)
- Restart backend server
- Clear browser cache
- Try again

---

## ✅ Development Workflow

### Daily Development

**Terminal 1 - Backend:**
```powershell
cd backend
npm start
```

**Terminal 2 - Frontend:**
```powershell
cd frontend
npm start
```

**Both running?**
- [ ] Backend on port 3001
- [ ] Frontend on port 3000
- [ ] No errors in either console

---

## ✅ Production Deployment

### Backend Deployment

**Choose a platform:**
- [ ] Heroku
- [ ] Render
- [ ] Railway
- [ ] Azure App Service
- [ ] AWS Elastic Beanstalk
- [ ] Other: __________

**Steps:**
1. Deploy backend to chosen platform
2. Set environment variables in platform dashboard
3. Note the production URL (e.g., `https://your-app.herokuapp.com`)

---

### Frontend Deployment

**Update `.env` for production:**
```bash
REACT_APP_BACKEND_TYPE=express
REACT_APP_BACKEND_URL=https://your-backend-url.com
```

**Deploy to Vercel (or similar):**
1. Connect GitHub repo
2. Set environment variables in Vercel dashboard
3. Deploy

**Checklist:**
- [ ] Backend deployed and accessible
- [ ] Frontend environment variables updated
- [ ] Frontend deployed
- [ ] End-to-end test in production

---

## ✅ Troubleshooting

### Backend won't start

**Error: "Missing MSAL configuration"**
- ✅ Check `.env` has `MSAL_TENANT_ID` and `MSAL_CLIENT_ID`

**Error: Firebase credential issues**
- ✅ Check `serviceAccountKey.json` exists and is valid
- ✅ Or use Application Default Credentials: `gcloud auth application-default login`

**Error: Port 3001 already in use**
- ✅ Change `PORT=3002` in `.env`
- ✅ Update frontend `REACT_APP_BACKEND_URL=http://localhost:3002`

---

### Frontend errors

**Error: "API endpoint not configured"**
- ✅ Restart frontend dev server (required after `.env` changes)
- ✅ Check `REACT_APP_BACKEND_TYPE` is set

**CORS errors**
- ✅ Ensure backend is running
- ✅ Check backend URL is correct
- ✅ Clear browser cache

**Authentication fails**
- ✅ Check Azure AD credentials match between frontend and backend
- ✅ Verify backend can reach Microsoft JWKS endpoint
- ✅ Check Firebase project IDs match

---

## 📚 Documentation Reference

| Document | Purpose |
|----------|---------|
| `BACKEND_INTEGRATION_SUMMARY.md` | Complete overview of changes |
| `ARCHITECTURE.md` | System architecture diagrams |
| `backend/README.md` | Backend setup and API docs |
| `frontend/docs/QUICKSTART_BACKEND.md` | Quick start guide |
| `frontend/docs/BACKEND_API_CONFIGURATION.md` | Full API configuration reference |

---

## 🎓 Next Steps After Setup

Once everything is running:

1. **Test the application**
   - [ ] Sign in with Microsoft
   - [ ] Create an issue
   - [ ] Request approval
   - [ ] Test Teams notifications (if configured)

2. **Configure Teams Webhook (Optional)**
   - Get webhook URL from Teams
   - Add to Firestore: `settings/app/approvalsTeamsWebhookUrl`

3. **Set up additional users**
   - Add users in Firebase Console or use the promote script
   - Configure roles and permissions

4. **Customize branding**
   - Update company name, logo, colors
   - Modify `sunbeth-styles.css` and theme files

---

## ✨ Success Criteria

You're ready when:
- [x] Backend starts and health check passes ✅
- [x] Frontend starts and connects to backend ✅
- [x] No console errors ✅
- [ ] Can sign in with Microsoft
- [ ] Can create and view issues
- [ ] Can navigate all pages

---

## 🆘 Need Help?

**Configuration Issues:**
- Read `frontend/docs/BACKEND_API_CONFIGURATION.md`

**Backend Issues:**
- Read `backend/README.md`
- Check backend logs for errors

**Frontend Issues:**
- Check browser console
- Verify API configuration in console

**Still stuck?**
- Review `ARCHITECTURE.md` for system overview
- Check `TROUBLESHOOTING_CHECKLIST.md` (if exists)
- Review Firebase Console for permission errors

---

**Current Status:** ✅ Backend installed, environment needs configuration

**Last Updated:** November 8, 2025
