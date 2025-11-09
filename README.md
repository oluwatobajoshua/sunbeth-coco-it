# COCO Station Issue Tracker

Sunbeth Energies COCO station issue tracking system with Microsoft Azure AD authentication.

## 🏗️ Project Structure

```
/
├── api/                          # Vercel Serverless Functions
│   ├── health.js                # Health check endpoint
│   ├── auth/
│   │   └── msal-custom-token.js # Microsoft authentication
│   ├── approvals/
│   │   ├── create.js            # Create approval requests
│   │   └── decision.js          # Handle approval decisions
│   └── permissions/
│       └── recompute.js         # Recompute user permissions
│
├── frontend/                     # React Application
│   ├── src/                     # React source code
│   ├── public/                  # Static assets
│   ├── build/                   # Production build output
│   └── package.json             # Frontend dependencies
│
├── backend/                      # Express Server (Development/Alternative)
│   └── ...                      # Express routes (not used in Vercel)
│
├── vercel.json                  # Vercel configuration
├── package.json                 # Root package.json
└── README.md                    # This file
```

## 🚀 Deployment

This app is optimized for Vercel deployment:

- **Frontend**: React app built from `frontend/` directory
- **API**: Serverless functions in `api/` directory
- **Build Output**: `frontend/build/`

### Deploy to Vercel

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Login and deploy:
   ```bash
   vercel login
   vercel --prod
   ```

3. Add environment variables in Vercel Dashboard

## 📦 Local Development

### Frontend
```bash
cd frontend
npm install
npm start
```

### Backend (Express - Optional)
```bash
cd backend
npm install
npm start
```

## 🔐 Environment Variables

See `frontend/.env.vercel.example` for required variables.

Required for Vercel serverless functions:
- `GCLOUD_PROJECT`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_CLIENT_EMAIL`
- `MSAL_TENANT_ID`
- `MSAL_CLIENT_ID`
- Frontend React environment variables (REACT_APP_*)

## 📚 Documentation

- [Vercel Deployment Guide](VERCEL_DEPLOYMENT_GUIDE.md)
- [Deployment Checklist](VERCEL_CHECKLIST.md)
- [Backend API Documentation](BACKEND_INTEGRATION_SUMMARY.md)
- [Architecture Overview](ARCHITECTURE.md)
