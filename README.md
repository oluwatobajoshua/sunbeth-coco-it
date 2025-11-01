# COCO Station Issue Tracker

A beautiful, user-friendly web application for reporting and tracking engineering issues at COCO fuel stations. Built with modern web technologies and integrated with Firebase and Microsoft Graph.

## 🌟 Features

### ✨ **World-Class UI/UX**
- **Clean, Modern Design** - Intuitive interface with smooth animations
- **Mobile-First Responsive** - Works perfectly on all devices
- **Progressive Form** - 3-step guided process with visual progress
- **Drag & Drop Photos** - Easy photo upload with preview
- **Real-time Validation** - Instant feedback on form fields
- **Success Animations** - Delightful confirmation experience

### 🚀 **Core Functionality**
- **Quick Issue Reporting** - Select station, type, add description and photos
- **Priority Classification** - Low, Medium, High priority levels
- **Photo Documentation** - Up to 3 photos, auto-resized, 5MB max each
- **Contact Preferences** - Choose email, SMS, or both for updates
- **Recent Issues View** - See your submitted issues with status
- **Unique Issue IDs** - Auto-generated tracking numbers

### 🔧 **Technical Integration**
- **Firebase Backend** - Firestore database, Storage, Authentication
- **Microsoft Graph** - Office 365 integration for notifications
- **Real-time Updates** - Live status tracking
- **Secure Authentication** - Role-based access control
- **Cloud Storage** - Automatic photo backup and management

## 🎯 **User Experience Highlights**

### **Super Simple for Users**
1. **Login once** - Microsoft 365 single sign-on
2. **3 clicks to report** - Station → Issue Type → Submit
3. **No training needed** - Intuitive visual interface
4. **Instant confirmation** - Clear issue ID and next steps
5. **Mobile optimized** - Report from anywhere on any device

### **Smart Workflow**
- **Auto-assignment** - Issues automatically go to engineering queue
- **Status tracking** - Reported → In Progress → Resolved → Closed
- **Photo evidence** - Visual documentation for faster resolution
- **Priority routing** - High priority issues get immediate attention
- **History tracking** - Complete audit trail of all changes

## 📱 **Screenshots**

### Desktop Experience
- Beautiful gradient background with clean white form
- Step-by-step progress indicator
- Large, touch-friendly buttons
- Professional color scheme with COCO branding

### Mobile Experience  
- Fully responsive design
- Optimized for touch interaction
- Camera integration for instant photo capture
- Thumb-friendly navigation

## 🛠 **Quick Start**

### 1. **Open the App**
Simply open `index.html` in your browser or deploy to any web server.

### 2. **Firebase Setup** (5 minutes)
- Create Firebase project
- Enable Firestore, Storage, Authentication
- Copy config to `app.js`
- Deploy security rules

### 3. **Microsoft Graph Setup** (5 minutes)
- Register Azure app
- Configure permissions
- Copy client ID to `app.js`

### 4. **Ready to Use!**
The app works immediately with mock data for testing.

## 🎨 **Design Philosophy**

### **Simplicity First**
- Minimal cognitive load
- Clear visual hierarchy  
- Consistent interactions
- Error prevention over correction

### **Beauty & Function**
- Smooth micro-animations
- Thoughtful color palette
- Typography optimized for readability
- Accessibility built-in

### **Performance**
- Fast loading times
- Offline-ready design
- Optimized images
- Minimal dependencies

## 🔧 **Technical Architecture**

```
Frontend (HTML/CSS/JS)
├── Responsive Design (Mobile-first)
├── Progressive Form Logic
├── Photo Upload & Processing
└── Real-time Validation

Backend Services
├── Firebase Firestore (Database)
├── Firebase Storage (Photos)
├── Firebase Auth (Security)
└── Microsoft Graph (Notifications)

Integration Layer
├── REST API patterns
├── Real-time listeners
├── File upload handling
└── Error handling
```

## 📊 **Data Flow**

1. **Issue Submission**
   - Form validation
   - Photo compression & upload
   - Firestore document creation
   - Auto-assignment to engineering

2. **Notifications**
   - Email to engineering team
   - SMS to reporter (optional)
   - Dashboard updates
   - Status change alerts

3. **Tracking**
   - Real-time status updates
   - History logging
   - Response time metrics
   - SLA monitoring

## 🎯 **Perfect For**

### **Station Managers**
- Quick issue reporting
- Photo documentation
- Status tracking
- Mobile accessibility

### **Engineering Team** 
- Centralized issue queue
- Visual documentation
- Priority management
- Progress tracking

### **Management**
- Real-time dashboards
- Response time metrics
- Issue analytics
- Performance monitoring

## 🚀 **Getting Started Now**

### **Immediate Use (No Setup)**
1. Open `index.html` in your browser
2. The app works with demo data
3. Test all features immediately
4. Perfect for demonstrations

### **Production Setup (15 minutes)**
1. Follow `CONFIG.md` for Firebase setup
2. Configure Microsoft Graph integration  
3. Deploy to Firebase Hosting
4. Add your COCO stations data

## 📈 **Scalability**

- **Multi-tenant ready** - Support multiple station networks
- **Role-based access** - Station managers, engineers, admins
- **API extensible** - Easy integration with existing systems
- **Cloud native** - Automatic scaling with Firebase

## 🎉 **Why This Solution?**

### **Immediate Impact**
- ✅ **Deploy today** - Works out of the box
- ✅ **Zero training** - Intuitive for all users
- ✅ **Mobile ready** - Use from anywhere
- ✅ **Professional look** - Builds confidence

### **Technical Excellence**
- ✅ **Modern stack** - Latest web technologies
- ✅ **Secure** - Enterprise-grade security
- ✅ **Fast** - Optimized performance
- ✅ **Maintainable** - Clean, documented code

### **Business Value**
- ✅ **Faster resolution** - Clear communication
- ✅ **Better tracking** - Nothing gets lost
- ✅ **Data insights** - Response time analytics
- ✅ **Cost effective** - No licensing fees

---

**Ready to transform your COCO station issue management?**  
Open `index.html` and see the difference immediately! 🚀

---

## React App, Admin Console, and Permissions (Updated)

This project now includes a full React implementation with an ERP-style Admin Console and permission controls.

- Tech: React 18, React Router, Firebase (Firestore/Storage/Auth)
- Pages: Dashboard (/), Report (/report), Issues (/issues), Admin (/admin)
- Exports: Dashboard → PNG/PDF; Issues/Admin → CSV where applicable

### Admin Console

- Stations: Full CRUD
- Issue Types: Full CRUD
- Users: Full CRUD with roles and optional station assignment
- Permissions: Role → permission matrix persisted at Firestore doc `settings/permissions`
- Settings: App limits, CSV enable, Demo Mode toggle, environment summary
- Debug (Super Admin): Seed first 30 demo issues into Firestore, clear all issues (destructive), toggle Demo Mode, clear local/session storage

Permissions are enforced at route/nav level in `src/pages/Admin.js` via helpers in `src/utils/permissions.js`.

Default roles (overridable by Firestore matrix):

- station_manager, engineer: dashboard/report/manage_issues
- admin: adds Admin access + manage stations/types/users
- super_admin: all permissions including Debug

Tip: During development, `src/hooks/useAuth.js` uses a mock user. Change `role` to `Super Admin` to see all admin sections.

### Demo Mode & Sample Data

- Toggle from the header or Admin → Settings (localStorage feature flag)
- Provider: `src/demo/DemoDataContext.jsx` (wraps app)
- Data: `src/demo/data.js` with realistic seeded issues
- Hooks switch automatically to in-memory dataset when Demo Mode is on
- Admin → Debug can seed/clear issues in Firestore for testing

### React Quick Start

1. `npm install`
2. `npm start` → http://localhost:3000
3. Copy `.env.example` to `.env` and fill Firebase/Azure values for live data
4. `npm run build` for production

For a deeper React-specific guide (structure, scripts, deployment), see `README-REACT.md`.