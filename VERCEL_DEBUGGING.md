# 🐛 Vercel Deployment Debug Guide

## Current Issue
API endpoints at `/api/*` are returning HTML (the React app) instead of executing as serverless functions.

## What We've Tried
1. ✅ Created `/api` folder with 5 serverless functions
2. ✅ Added all environment variables to Vercel
3. ✅ Multiple `vercel.json` configurations
4. ✅ Explicit function builds in `vercel.json`
5. ✅ Git commits and pushes triggering auto-deploys

## What to Check in Vercel Dashboard

### 1. Go to Latest Deployment
https://vercel.com/oluwatobajoshuas-projects/sunbeth-coco-it/deployments

Click on the most recent deployment

### 2. Check "Building" Tab
Look for:
- ❓ Does it show "Detected Framework: Create React App"?
- ❓ Does it mention anything about serverless functions?
- ❓ What build command is it using?

### 3. Check "Functions" Tab  
- ❓ Are there ANY functions listed?
- ❓ If yes, which ones?
- ❓ If no, this confirms functions aren't being built

### 4. Check Project Settings
Go to: https://vercel.com/oluwatobajoshuas-projects/sunbeth-coco-it/settings

#### General Settings:
- ❓ What is "Root Directory" set to? (Should be blank or ".")
- ❓ What is "Framework Preset"? (Should detect Create React App)

#### Build & Development Settings:
- ❓ Build Command: (Should be `npm run build` or auto-detected)
- ❓ Output Directory: (Should be `build`)
- ❓ Install Command: (Should be `npm install` or auto-detected)

## Possible Root Causes

### A. Framework Preset Override
**Symptom**: Vercel sees CRA and ignores `/api` folder

**Fix**: In Project Settings → Build & Development Settings:
- Try setting Framework Preset to "Other"
- Or add `"framework": null` in `vercel.json` (we tried this)

### B. Root Directory Issue
**Symptom**: Vercel looking in wrong place for files

**Current Setup**:
- Git repo root: `frontend/` folder
- API functions: `frontend/api/*`

**Fix**: Root Directory should be blank or "."

### C. Output Directory Overwriting API
**Symptom**: React build output overwrites `/api` folder

**Current Setup**: Output is `build/` which is separate from `api/`

**Should be OK** ✅

### D. Vercel Not Recognizing Function Format
**Symptom**: `.js` files not treated as serverless functions

**Current Format** (in `api/health.js`):
```javascript
module.exports = (req, res) => {
  // function code
};
```

**This format is CORRECT** ✅

## Alternative Solution: Move to Standalone Serverless

If Vercel continues to ignore the `/api` folder when mixed with CRA, we have these options:

### Option 1: Separate Deployments
- Deploy frontend to Vercel (static site)
- Deploy backend separately (Vercel, Railway, Render, etc.)
- Update `REACT_APP_BACKEND_URL` to point to separate backend

### Option 2: Use Vercel CLI with --prod Flag
Try bypassing Git integration:
```powershell
cd frontend
vercel --prod --yes --force
```

### Option 3: Restructure Repository
Move everything so Git repo root contains both:
```
/
├── api/           # Serverless functions
├── frontend/      # React app
├── vercel.json    # At root
└── package.json   # At root
```

Then configure `vercel.json` at root to:
- Build from `/frontend`  
- Output to `/frontend/build`
- Serve functions from `/api`

## Immediate Next Steps

1. **Check Vercel Dashboard** → Latest Deployment → "Functions" tab
   - If NO functions listed → Vercel isn't building them
   
2. **Check Build Logs** → "Building" tab  
   - Look for any mention of "api" or "functions"
   - Check what framework is detected

3. **Try Manual Deploy**:
   ```powershell
   cd "C:\Users\OluwatobaOgunsakin\Downloads\SEL COCO Station Report\frontend"
   vercel --yes --force
   ```

4. **If Still Failing**, consider Option 3 (restructure repo)

## Test Command
```powershell
# Should return JSON with status:"ok"
Invoke-RestMethod "https://sunbeth-coco-it.vercel.app/api/health"

# Currently returns: HTML (React app index.html)
```

---

**What to report back:**
1. Screenshot or copy of "Functions" tab from latest deployment
2. First 50 lines of build logs from "Building" tab
3. Current "Root Directory" setting from Project Settings

This will tell us exactly what Vercel is doing (or not doing) with the `/api` folder.
