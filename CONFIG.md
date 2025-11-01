# COCO Station Issue Tracker - Configuration Guide

## Firebase Setup

### 1. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Name your project: `coco-station-tracker`
4. Enable Google Analytics (optional)
5. Create project

### 2. Enable Required Services

#### Firestore Database
1. In Firebase Console, go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" for development
4. Select your preferred location
5. Click "Done"

#### Storage
1. Go to "Storage" in Firebase Console
2. Click "Get started"
3. Choose security rules (start with test mode)
4. Select storage location
5. Click "Done"

#### Authentication
1. Go to "Authentication" in Firebase Console
2. Click "Get started"
3. Go to "Sign-in method" tab
4. Enable "Email/Password" and "Microsoft" providers

### 3. Get Firebase Configuration
1. Go to Project Settings (gear icon)
2. Scroll down to "Your apps"
3. Click "Web" icon (</>)
4. Register your app: "COCO Issue Tracker"
5. Copy the configuration object

### 4. Update app.js
Replace the Firebase config in `app.js`:

```javascript
const firebaseConfig = {
    apiKey: "your-actual-api-key",
    authDomain: "coco-station-tracker.firebaseapp.com",
    projectId: "coco-station-tracker",
    storageBucket: "coco-station-tracker.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-actual-app-id"
};
```

## Microsoft Graph Setup

### 1. Register Azure App
1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to "Azure Active Directory" > "App registrations"
3. Click "New registration"
4. Name: "COCO Issue Tracker"
5. Supported account types: "Single tenant"
6. Redirect URI: `http://localhost:3000` (for development)
7. Click "Register"

### 2. Configure Permissions
1. Go to "API permissions"
2. Click "Add a permission"
3. Select "Microsoft Graph"
4. Choose "Delegated permissions"
5. Add these permissions:
   - `User.Read`
   - `Mail.Send`
   - `Files.ReadWrite`
   - `Directory.Read.All`

### 3. Get Client ID
1. Go to "Overview" in your app registration
2. Copy the "Application (client) ID"
3. Copy the "Directory (tenant) ID"

### 4. Update app.js
Replace the Microsoft Graph config:

```javascript
const msalConfig = {
    auth: {
        clientId: 'your-actual-client-id',
        authority: 'https://login.microsoftonline.com/your-actual-tenant-id'
    }
};
```

## Firestore Security Rules

### Development Rules (app.js assumes these)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Issues collection
    match /issues/{issueId} {
      allow read, write: if request.auth != null;
    }
    
    // Users collection
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Stations collection (read-only for most users)
    match /stations/{stationId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
                     request.auth.token.role == 'admin';
    }
  }
}
```

### Storage Rules
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /issues/{issueId}/{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Firestore Data Structure

### Collections to Create

#### 1. `stations` Collection
```javascript
// Document ID: station-id (e.g., "coco-lagos-1")
{
  id: "coco-lagos-1",
  name: "COCO Lagos Central",
  address: "Victoria Island, Lagos, Nigeria",
  phone: "+234-1-234-5678",
  manager: "john.manager@cocostation.com",
  region: "Southwest",
  status: "active",
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### 2. `users` Collection
```javascript
// Document ID: user-email
{
  email: "john.manager@cocostation.com",
  name: "John Manager",
  role: "station_manager", // station_manager, engineer, admin
  stationId: "coco-lagos-1", // for station managers
  phone: "+234-801-234-5678",
  notifications: {
    email: true,
    sms: true
  },
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### 3. `issues` Collection
```javascript
// Document ID: auto-generated or custom (e.g., "COCO-2025-001")
{
  id: "COCO-2025-001",
  stationId: "coco-lagos-1",
  reporterId: "john.manager@cocostation.com",
  reporterName: "John Manager",
  issueType: "electrical", // electrical, mechanical, safety, equipment
  description: "Generator not starting properly...",
  priority: "high", // low, medium, high
  status: "reported", // reported, in-progress, resolved, closed
  contactMethod: "both", // email, sms, both
  photos: [
    {
      url: "https://firebasestorage.googleapis.com/...",
      fileName: "generator-issue.jpg",
      size: 2048576
    }
  ],
  assigneeId: "engineer@cocostation.com",
  assigneeName: "Engineer Smith",
  resolution: "Replaced starter motor and battery",
  createdAt: timestamp,
  updatedAt: timestamp,
  resolvedAt: timestamp, // when marked as resolved
  closedAt: timestamp    // when confirmed closed
}
```

## Initial Data Setup

### 1. Add Stations Data
Run this in your browser console after authentication:

```javascript
// Add sample stations
const stations = [
  {
    id: "coco-lagos-1",
    name: "COCO Lagos Central",
    address: "Victoria Island, Lagos",
    region: "Southwest"
  },
  {
    id: "coco-abuja-1", 
    name: "COCO Abuja Main",
    address: "Central Business District, Abuja",
    region: "North Central"
  },
  {
    id: "coco-port-1",
    name: "COCO Port Harcourt",
    address: "GRA, Port Harcourt",
    region: "South South"
  }
];

stations.forEach(async (station) => {
  await db.collection('stations').doc(station.id).set({
    ...station,
    status: 'active',
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
});
```

### 2. Add Sample Users
```javascript
const users = [
  {
    email: "john.manager@cocostation.com",
    name: "John Manager",
    role: "station_manager",
    stationId: "coco-lagos-1"
  },
  {
    email: "engineer@cocostation.com", 
    name: "Engineer Smith",
    role: "engineer"
  }
];

users.forEach(async (user) => {
  await db.collection('users').doc(user.email).set({
    ...user,
    notifications: { email: true, sms: true },
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
});
```

## Local Development

### 1. Serve Files
Since this is a client-side app, you can use any local server:

```bash
# Using Python
python -m http.server 3000

# Using Node.js live-server
npx live-server --port=3000

# Using VS Code Live Server extension
# Right-click index.html and select "Open with Live Server"
```

### 2. Access the App
Open your browser to: `http://localhost:3000`

## Production Deployment

### 1. Firebase Hosting
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize hosting in your project directory
firebase init hosting

# Select your Firebase project
# Set public directory to current folder (.)
# Configure as single-page app: No
# Set up automatic builds: No

# Deploy
firebase deploy --only hosting
```

### 2. Custom Domain (Optional)
1. In Firebase Console, go to "Hosting"
2. Click "Add custom domain"
3. Follow the verification steps
4. Update DNS settings as instructed

## Security Considerations

### 1. Environment Variables
For production, store sensitive config in environment variables:

```javascript
const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    // ... other config
};
```

### 2. Update Security Rules
Before going to production, update Firestore rules to be more restrictive:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /issues/{issueId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && 
                      request.auth.token.email == resource.data.reporterId;
      allow update: if request.auth != null && 
                      (request.auth.token.role == 'engineer' || 
                       request.auth.token.role == 'admin' ||
                       request.auth.token.email == resource.data.reporterId);
    }
  }
}
```

## Testing the Application

### 1. Manual Testing Checklist
- [ ] User authentication works
- [ ] Form validation prevents submission with missing fields
- [ ] Photo upload works (max 3 photos, 5MB each)
- [ ] Issue submission creates Firestore document
- [ ] Recent issues display correctly
- [ ] Responsive design works on mobile
- [ ] Modal shows success message with issue ID

### 2. Sample Test Data
The app includes mock data for testing. In production, replace the `loadRecentIssues()` function to load from Firestore:

```javascript
async function loadRecentIssues() {
    try {
        const snapshot = await db.collection('issues')
            .where('reporterId', '==', appState.currentUser.email)
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();
            
        appState.recentIssues = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate()
        }));
        
        renderRecentIssues();
    } catch (error) {
        console.error('Error loading recent issues:', error);
    }
}
```

This configuration guide will help you set up the complete system with Firebase and Microsoft Graph integration.