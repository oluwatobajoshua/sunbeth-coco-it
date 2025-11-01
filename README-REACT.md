# COCO Station Issue Tracker - React.js

A modern React.js application for reporting and tracking engineering issues at COCO fuel stations. Built with React 18, Firebase, and Microsoft Graph integration.

## 🧭 App Overview

- Home: Executive Dashboard with KPIs and animated charts
- Report: Issue reporting form (multi-step, photo uploads)
- Issues: Browse, filter, and export recent issues
- Admin: ERP-style Admin Console (CRUD, permissions, settings, debug)

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ installed
- npm or yarn package manager

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm start
```

The app will open at `http://localhost:3000`

### Build for Production

```bash
# Create production build
npm run build

# The build folder will contain the optimized files
```

## 🏗️ Project Structure

```
coco-issue-tracker/
├── public/
│   ├── index.html        # HTML template
│   └── manifest.json     # PWA manifest
├── src/
│   ├── components/       # React components
│   │   ├── Header.js     # App header with branding
│   │   ├── IssueForm.js  # Multi-step issue reporting form
│   │   ├── PhotoUpload.js # Drag & drop photo upload
│   │   ├── RecentIssues.js # Recent issues display
│   │   └── SuccessModal.js # Success confirmation modal
│   ├── hooks/            # Custom React hooks
│   │   ├── useAuth.js    # Authentication hook
│   │   └── useRecentIssues.js # Recent issues data hook
│   ├── services/         # External service integrations
│   │   ├── firebase.js   # Firebase configuration
│   │   └── issueService.js # Issue CRUD operations
│   ├── utils/            # Utility functions
│   │   └── helpers.js    # Common helper functions
│   │   └── permissions.js # Permission matrix helpers
│   ├── config.js         # App configuration
│   ├── styles.css        # Global styles (Sunbeth theme)
│   ├── App.js           # Main app component
│   ├── App.test.js      # App component tests
│   └── index.js         # React app entry point
├── .env.example         # Environment variables template
├── package.json         # Dependencies and scripts
├── start.bat           # Windows start script
├── start.sh            # Unix start script
└── README-REACT.md     # This documentation
```

## 🎨 Features

### ✨ Modern React Architecture
- **Functional Components** with React Hooks
- **Custom Hooks** for reusable logic
- **React Hook Form** for form management
- **React Dropzone** for file uploads
- **React Hot Toast** for notifications

### 🔥 Firebase Integration
- **Firestore** for issue storage
- **Storage** for photo management
- **Authentication** ready for production

### 📱 UI/UX Excellence
- **Responsive Design** - Mobile-first approach
- **Sunbeth Branding** - Custom theme integration
- **Progressive Forms** - 3-step guided process
- **Real-time Validation** - Instant feedback
- **Drag & Drop** - Intuitive photo upload

### 🔧 Technical Features
- **TypeScript Ready** - Easy to convert
- **Environment Variables** - Secure configuration
- **Modern ES6+** - Latest JavaScript features
- **Component-based** - Reusable architecture
- **State Management** - React Context ready

## 🔐 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=your-firebase-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=your-app-id

# Microsoft Graph Configuration
REACT_APP_MSAL_CLIENT_ID=your-azure-client-id  
REACT_APP_MSAL_TENANT_ID=your-azure-tenant-id
```

### Firebase Setup

1. **Create Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create new project: "coco-station-tracker"

2. **Enable Services**
   - Firestore Database (test mode for development)
   - Storage (test mode for development)
   - Authentication (Email/Password + Microsoft)

3. **Get Configuration**
   - Project Settings → General → Your apps
   - Add web app and copy config values
   - Update `.env` file with your values

### Microsoft Graph Setup
### Authentication Notes (MSAL vs Firebase Auth)

This app uses MSAL for sign-in (identity) and loads roles from Firestore `users`. To enforce security at the database layer (Firestore Rules), Firebase Authentication must be used by the client or via a backend. Options:

- Easiest: Use Firebase Auth for app sign-in (Email/Password or supported OAuth) and map roles from `users` collection.
- Advanced: Bridge Azure AD (MSAL) to Firebase Auth using custom tokens issued by a lightweight backend.

Without Firebase Auth, Firestore must run in test/open mode for reads/writes, which is NOT suitable for production.


1. **Register Azure App**
   - Azure Portal → Azure Active Directory → App registrations
   - New registration: "COCO Issue Tracker"

2. **Configure Permissions**
   - API permissions → Microsoft Graph
   - Add: `User.Read`, `Mail.Send`, `Files.ReadWrite`

3. **Update Configuration**
   - Copy Application (client) ID and Directory (tenant) ID
   - Update `.env` file

## 🛠️ Development

### Available Scripts

```bash
# Start development server
npm start

# Run tests
npm test

# Build for production
npm run build

# Eject (not recommended)
npm run eject
```

### Component Development

Each component is self-contained with clear props and responsibilities:

```jsx
// Example: Using the IssueForm component
<IssueForm onIssueCreated={handleIssueCreated} />
```

### Custom Hooks

```jsx
// Example: Using authentication
const { user, login, logout, isAuthenticated } = useAuth();

// Example: Loading recent issues
const { issues, loading, error, refetch } = useRecentIssues(user?.email);
```

## 🎯 Key Components

### IssueForm
- Multi-step form with validation
- Photo upload with drag & drop
- Real-time character counting
- Priority selection with visual feedback

### RecentIssues
- Displays user's recent issues
- Professional compact layout
- Status badges with Sunbeth colors
- Loading and error states

### PhotoUpload
- Drag & drop interface
- File size validation (5MB max)
- Preview with remove functionality
- Support for multiple image formats

## 🚀 Deployment

### Netlify (Recommended)
```bash
# Build the project
npm run build

# Deploy build folder to Netlify
# Or connect GitHub repo for automatic deployments
```

### Firebase Hosting
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login and initialize
firebase login
firebase init hosting

# Deploy
firebase deploy
```

### Vercel
### GitHub Actions (CI/CD)

A CI workflow builds the app on pushes/PRs. A separate deploy workflow can publish to Firebase Hosting when secrets are present.

Required GitHub secrets for CI build:

- REACT_APP_FIREBASE_API_KEY
- REACT_APP_FIREBASE_AUTH_DOMAIN
- REACT_APP_FIREBASE_PROJECT_ID
- REACT_APP_FIREBASE_STORAGE_BUCKET
- REACT_APP_FIREBASE_MESSAGING_SENDER_ID
- REACT_APP_FIREBASE_APP_ID
- REACT_APP_MSAL_CLIENT_ID
- REACT_APP_MSAL_TENANT_ID (optional if using common authority)

For Firebase Hosting deploy (optional):

- FIREBASE_SERVICE_ACCOUNT_JSON (Service Account key JSON string)
- REACT_APP_FIREBASE_PROJECT_ID (project id)

Notes:

- The deploy workflow currently deploys Hosting only. Firestore Rules require Firebase Auth (or MSAL→Firebase custom tokens). Configure auth first, then extend deploy to include rules.
- If you prefer Netlify/Vercel, keep CI for build checks and ignore the Firebase deploy workflow.

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

## 🔒 Security

### Environment Variables
- Never commit `.env` files
- Use different configs for dev/staging/production
- Rotate keys regularly

### Firebase Security Rules
```javascript
// Firestore Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /issues/{issueId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 📊 Performance

### Optimization Features
- **Code Splitting** - Automatic with Create React App
- **Image Compression** - Built-in photo optimization
- **Lazy Loading** - Components load as needed
- **Caching** - Firebase SDK handles caching

### Bundle Analysis
```bash
# Analyze bundle size
npm install -g source-map-explorer
npm run build
npx source-map-explorer 'build/static/js/*.js'
```

## 🧪 Testing

### Unit Tests
```bash
# Run tests
npm test

# Run with coverage
npm test -- --coverage
```

### Example Test
```jsx
import { render, screen } from '@testing-library/react';
import Header from './components/Header';

test('renders COCO Issue Tracker header', () => {
  render(<Header />);
  const headerElement = screen.getByText(/COCO Issue Tracker/i);
  expect(headerElement).toBeInTheDocument();
});
```

## 🎨 Styling

### Sunbeth Theme
The app uses your organization's exact brand colors:
- Primary: `#0c5343` (Sunbeth Green)
- Accent: `#f64500` (Sunbeth Orange)
- Typography: Segoe UI system font

### CSS Variables
```css
:root {
  --primary-color: #0c5343;
  --accent-color: #f64500;
  --bg: #f7f8fa;
  --radius: 12px;
  --shadow: 0 6px 22px rgba(12, 83, 67, 0.08);
}
```

## 🔄 State Management

Currently uses React's built-in state management:
- `useState` for component state
- Custom hooks for shared logic
- Context API ready for global state

For larger applications, consider:
- Redux Toolkit
- Zustand
- Jotai

## 📱 Mobile Support

### PWA Features
- Responsive design
- Touch-friendly interactions
- Offline capability (with service worker)
- App-like experience

### Mobile Testing
```bash
# Test on different screen sizes
# Chrome DevTools → Device Toolbar
# Test touch interactions
# Verify performance on mobile networks
```

## 🎉 What's Next?

### Phase 2 Features
- [ ] Real-time updates with WebSockets
- [ ] Push notifications
- [ ] Offline support with PWA
- [ ] Advanced filtering and search
- [ ] Dashboard analytics
- [ ] Admin panel for engineers

### Technical Improvements
- [ ] Convert to TypeScript
- [ ] Add comprehensive test suite
- [ ] Implement proper error boundaries
- [ ] Add performance monitoring
- [ ] Setup CI/CD pipeline

---

**🚀 Your React.js COCO Issue Tracker is ready for development!**

Run `npm start` to see your beautiful, modern React application in action!

---

## 🔐 Admin Console and Permissions

The Admin Console provides an ERP-style experience for managing the system:

- Stations: Full CRUD for stations
- Issue Types: Full CRUD for issue categories
- Users: Admin-managed directory with roles and station assignments
- Permissions: Role → permission matrix persisted in Firestore (`settings/permissions`)
- Settings: App-level settings (limits, CSV export, Demo Mode toggle)
- Debug: Super Admin tools (seed demo issues, clear all issues, toggle demo mode, clear local/session storage)

Guarding and visibility are enforced via:

- `src/utils/permissions.js` with `normalizeRole`, `fetchPermissionsMatrix`, and `hasPermission`
- `src/pages/Admin.js` applies `view_admin`, `manage_stations`, `manage_issue_types`, `manage_users`, `manage_issues`, and `debug_tools`

Default roles and permissions (can be overridden by Firestore):

- station_manager, engineer: dashboard/report/manage_issues
- admin: adds access to Admin + manage stations/types/users
- super_admin: everything, including Debug tools

Tip: During development, `src/hooks/useAuth.js` uses a mock user. Change the `role` to `Super Admin` to see all admin sections.

---

## 🧪 Demo Mode and Sample Data

Demo Mode shows executive-ready dashboards without requiring Firestore data.

- Toggle from the header or Admin → Settings
- Data source: `src/demo/data.js`
- Provider: `src/demo/DemoDataContext.jsx` wraps the app
- Feature flag: `src/utils/featureFlags.js` (localStorage-backed)

Debug tools for Super Admin (Admin → Debug):

- Seed first 30 demo issues into Firestore
- Clear ALL Firestore issues (destructive)
- Toggle Demo Mode
- Clear local/session storage

---

## 📤 Exports

- Dashboard: Export PNG or PDF via built-in buttons (uses `html2canvas` + `jsPDF`)
- Issues: Export CSV from the Issues page
- Admin: CSV exports where applicable (e.g., users)
