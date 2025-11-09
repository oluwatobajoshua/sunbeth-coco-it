// Firebase Configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "your-api-key",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "coco-tracker.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "coco-tracker", 
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "coco-tracker.appspot.com",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "your-app-id"
};

// Microsoft Graph Configuration
export const msalConfig = {
  auth: {
    clientId: process.env.REACT_APP_MSAL_CLIENT_ID || 'your-client-id',
    authority: `https://login.microsoftonline.com/${process.env.REACT_APP_MSAL_TENANT_ID || 'your-tenant-id'}`
  }
};

export default firebaseConfig;