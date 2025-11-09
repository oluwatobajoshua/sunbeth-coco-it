# Backend Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         COCO Frontend                            │
│                     (React Application)                          │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ API Calls
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API Configuration Layer                       │
│                    (src/config/apiConfig.js)                     │
│                                                                   │
│  • Reads REACT_APP_BACKEND_TYPE environment variable            │
│  • Maps endpoint names to actual URLs                           │
│  • Supports: Express | Cloud Functions | Custom                 │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Client Layer                            │
│                    (src/config/apiClient.js)                     │
│                                                                   │
│  • getMsalCustomToken(idToken)                                  │
│  • createApprovalRequest(data)                                  │
│  • recomputeEffectivePerms(token, options)                      │
│  • Generic get/post methods                                     │
└─────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                │               │               │
                ▼               ▼               ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │   Express    │  │    Cloud     │  │    Custom    │
    │   Backend    │  │  Functions   │  │   Backend    │
    │  (Default)   │  │  (Optional)  │  │  (Optional)  │
    └──────────────┘  └──────────────┘  └──────────────┘
            │                 │                 │
            └─────────────────┴─────────────────┘
                            │
                            ▼
                ┌──────────────────────┐
                │  Firebase Services   │
                ├──────────────────────┤
                │  • Firestore         │
                │  • Authentication    │
                │  • Storage           │
                └──────────────────────┘
```

---

## Express Backend Architecture (Default)

```
┌─────────────────────────────────────────────────────────────────┐
│                       Express Server                             │
│                      (backend/index.js)                          │
│                                                                   │
│  • Port: 3001                                                    │
│  • CORS: Enabled                                                │
│  • Middleware: JSON, URLEncoded                                 │
└─────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                │               │               │
                ▼               ▼               ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │    Auth      │  │  Approvals   │  │ Permissions  │
    │    Routes    │  │    Routes    │  │    Routes    │
    └──────────────┘  └──────────────┘  └──────────────┘
    │ routes/auth.js│  │routes/       │  │routes/       │
    │               │  │approvals.js  │  │permissions.js│
    └──────────────┘  └──────────────┘  └──────────────┘
                                │
                                ▼
                    ┌──────────────────────┐
                    │   Firebase Admin SDK │
                    ├──────────────────────┤
                    │  • Firestore Client  │
                    │  • Auth Management   │
                    │  • Token Verification│
                    └──────────────────────┘
```

### Route Mapping

```
POST /api/auth/msal-custom-token
  ├─ Verify Microsoft ID token (JWKS)
  ├─ Map Azure AD roles to app roles
  ├─ Query Firestore users collection
  ├─ Create Firebase custom token
  └─ Return: { customToken }

POST /api/approvals/create
  ├─ Create approval document in Firestore
  ├─ Update issue status to 'pending_approval'
  ├─ Send Teams adaptive card notification
  └─ Return: { id, status }

GET /api/approvals/decision?id=...&decision=...&token=...
  ├─ Verify approval token (SHA256)
  ├─ Update approval status
  ├─ Update issue status (if approved)
  ├─ Create audit log entry
  └─ Return: HTML confirmation page

POST /api/permissions/recompute
  ├─ Verify Firebase ID token
  ├─ Check user role (Admin/Super Admin)
  ├─ Load roles catalog from Firestore
  ├─ Compute effective permissions
  ├─ Update user documents
  └─ Return: { updated, dryRun, scoped }
```

---

## Data Flow: MSAL Authentication

```
┌─────────────┐
│   User      │
│  (Browser)  │
└─────────────┘
      │
      │ 1. Click "Sign in with Microsoft"
      ▼
┌─────────────────┐
│  MSAL React     │
│  (@azure/msal)  │
└─────────────────┘
      │
      │ 2. Redirect to Microsoft Login
      ▼
┌─────────────────┐
│  Microsoft      │
│  Azure AD       │
└─────────────────┘
      │
      │ 3. Return ID Token
      ▼
┌─────────────────┐
│   Frontend      │
│  (useAuth.js)   │
└─────────────────┘
      │
      │ 4. Call apiClient.getMsalCustomToken(idToken)
      ▼
┌─────────────────┐
│  API Client     │
│  (apiClient.js) │
└─────────────────┘
      │
      │ 5. POST /api/auth/msal-custom-token
      ▼
┌─────────────────┐
│  Express        │
│  Backend        │
└─────────────────┘
      │
      ├─ 6a. Verify ID token with Microsoft JWKS
      ├─ 6b. Map Azure AD roles
      ├─ 6c. Query Firestore users
      └─ 6d. Create Firebase custom token
      │
      │ 7. Return { customToken }
      ▼
┌─────────────────┐
│   Frontend      │
│  (useAuth.js)   │
└─────────────────┘
      │
      │ 8. signInWithCustomToken(auth, customToken)
      ▼
┌─────────────────┐
│  Firebase       │
│  Authentication │
└─────────────────┘
      │
      │ 9. Return Firebase User object
      ▼
┌─────────────────┐
│   User          │
│  (Authenticated)│
└─────────────────┘
```

---

## Data Flow: Approval Request

```
┌─────────────┐
│ Admin User  │
│  (Browser)  │
└─────────────┘
      │
      │ 1. Request Issue Closure
      ▼
┌─────────────────┐
│  adminService.js│
│  (Frontend)     │
└─────────────────┘
      │
      ├─ 2a. Upload closure photo to Firebase Storage
      └─ 2b. Get download URL
      │
      │ 3. Call apiClient.createApprovalRequest(...)
      ▼
┌─────────────────┐
│  Express        │
│  Backend        │
│  (approvals.js) │
└─────────────────┘
      │
      ├─ 4a. Generate secure token (SHA256)
      ├─ 4b. Create approval document in Firestore
      ├─ 4c. Update issue status to 'pending_approval'
      └─ 4d. Send Teams adaptive card
      │
      │ 5. POST to Teams Webhook
      ▼
┌─────────────────┐
│  Microsoft      │
│  Teams          │
└─────────────────┘
      │
      │ 6. Display adaptive card with Approve/Reject buttons
      ▼
┌─────────────────┐
│  Approver       │
│  (Teams User)   │
└─────────────────┘
      │
      │ 7. Click "Approve" or "Reject"
      ▼
┌─────────────────┐
│  Express        │
│  Backend        │
│  (GET decision) │
└─────────────────┘
      │
      ├─ 8a. Verify token
      ├─ 8b. Update approval status
      ├─ 8c. Update issue status (if approved)
      ├─ 8d. Create audit log
      └─ 8e. Return HTML confirmation
      │
      ▼
┌─────────────────┐
│  Approver       │
│  (Confirmation) │
└─────────────────┘
```

---

## Environment Configuration Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      .env Configuration                          │
└─────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                │               │               │
                ▼               ▼               ▼
┌──────────────────────────────────────────────────────────────────┐
│  REACT_APP_BACKEND_TYPE = 'express'                              │
│  REACT_APP_BACKEND_URL = 'http://localhost:3001'                 │
└──────────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────┐
│  REACT_APP_BACKEND_TYPE = 'cloud-functions'                      │
│  REACT_APP_FIREBASE_PROJECT_ID = 'project-123'                   │
│  REACT_APP_FUNCTIONS_REGION = 'us-central1'                      │
└──────────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────┐
│  REACT_APP_BACKEND_TYPE = 'custom'                               │
│  REACT_APP_CUSTOM_BACKEND_URL = 'https://api.example.com'        │
└──────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│               apiConfig.js reads environment                      │
│               and configures endpoint URLs                        │
└──────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│  Express:        http://localhost:3001/api/auth/...              │
│  Cloud Funcs:    https://us-central1-project.cloud.../...        │
│  Custom:         https://api.example.com/api/auth/...            │
└──────────────────────────────────────────────────────────────────┘
```

---

## Deployment Architecture

### Development
```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│  Frontend   │─────▶│   Express   │─────▶│  Firebase   │
│ localhost:  │      │   Backend   │      │   Services  │
│   3000      │      │ localhost:  │      │   (Cloud)   │
│             │      │   3001      │      │             │
└─────────────┘      └─────────────┘      └─────────────┘
```

### Production (Option A: Express)
```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│  Frontend   │─────▶│   Express   │─────▶│  Firebase   │
│   Vercel    │      │   Heroku/   │      │   Services  │
│             │      │   Render    │      │   (Cloud)   │
└─────────────┘      └─────────────┘      └─────────────┘
```

### Production (Option B: Cloud Functions)
```
┌─────────────┐      ┌─────────────┐
│  Frontend   │─────▶│  Firebase   │
│   Vercel    │      │  Functions  │
│             │      │  & Services │
└─────────────┘      └─────────────┘
```

---

## Technology Stack

### Frontend
- **Framework**: React 18
- **Auth**: @azure/msal-react, Firebase Auth
- **HTTP Client**: Native Fetch API
- **State**: React Hooks
- **Router**: React Router v6
- **UI**: Custom CSS + Lucide Icons

### Backend (Express)
- **Runtime**: Node.js 18+
- **Framework**: Express 4
- **Auth**: jose (JWKS verification)
- **Database**: Firebase Admin SDK (Firestore)
- **Storage**: Firebase Admin SDK
- **CORS**: cors middleware

### Infrastructure
- **Database**: Cloud Firestore
- **Storage**: Firebase Storage
- **Auth**: Firebase Authentication
- **Hosting**: Vercel (Frontend), Flexible (Backend)
- **Notifications**: Microsoft Teams Webhooks

---

## Security Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Security Layers                             │
└─────────────────────────────────────────────────────────────────┘

Layer 1: Authentication
├─ Microsoft Azure AD (OIDC)
├─ JWKS signature verification
├─ Token expiration checks
└─ Firebase custom token exchange

Layer 2: Authorization
├─ Role-based access control (RBAC)
├─ Firebase Security Rules
├─ Firestore permission checks
└─ Backend route guards

Layer 3: Data Protection
├─ HTTPS/TLS encryption
├─ CORS policy enforcement
├─ Token hashing (SHA256)
└─ Environment variable secrets

Layer 4: Audit
├─ Firestore audit logs collection
├─ Action tracking (who, what, when)
├─ Approval workflow trails
└─ State change history
```

---

## Scalability Considerations

### Horizontal Scaling
- Express backend can run multiple instances behind load balancer
- Stateless design (no session storage)
- Firebase handles database scaling automatically

### Performance Optimization
- API client includes error handling and retries
- Firestore queries use indexes
- Token caching in frontend (MSAL)
- CDN for static frontend assets

### Cost Optimization
- Express backend cheaper than Cloud Functions for steady load
- Firebase free tier for development
- Vercel free tier for frontend hosting
- Pay-as-you-go for production traffic

---

Last Updated: November 8, 2025
