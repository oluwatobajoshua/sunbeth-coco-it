// Firebase Configuration
const firebaseConfig = {
    // Replace with your Firebase config
    apiKey: "your-api-key",
    authDomain: "coco-tracker.firebaseapp.com",
    projectId: "coco-tracker",
    storageBucket: "coco-tracker.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();
const auth = firebase.auth();

// Microsoft Graph Configuration
const msalConfig = {
    auth: {
        clientId: 'your-client-id',
        authority: 'https://login.microsoftonline.com/your-tenant-id'
    }
};

// Application State
const appState = {
    currentStep: 1,
    totalSteps: 3,
    currentUser: null,
    uploadedPhotos: [],
    recentIssues: []
};

// DOM Elements
const elements = {
    form: document.getElementById('issueForm'),
    steps: document.querySelectorAll('.form-step'),
    progressSteps: document.querySelectorAll('.step'),
    nextBtn: document.getElementById('nextBtn'),
    prevBtn: document.getElementById('prevBtn'),
    submitBtn: document.getElementById('submitBtn'),
    photoUploadArea: document.getElementById('photoUploadArea'),
    photoInput: document.getElementById('photoInput'),
    photoPreview: document.getElementById('photoPreview'),
    charCount: document.getElementById('charCount'),
    issueDescription: document.getElementById('issueDescription'),
    successModal: document.getElementById('successModal'),
    loadingSpinner: document.getElementById('loadingSpinner'),
    generatedIssueId: document.getElementById('generatedIssueId'),
    recentIssues: document.getElementById('recentIssues'),
    userName: document.getElementById('userName'),
    userAvatar: document.getElementById('userAvatar'),
    logoutBtn: document.getElementById('logoutBtn')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
    await initializeAuth();
    setupEventListeners();
    loadRecentIssues();
    updateUI();
}

// Authentication with Microsoft Graph
async function initializeAuth() {
    try {
        // Simulate user authentication - replace with actual Microsoft Graph auth
        const user = {
            name: 'John Manager',
            email: 'john.manager@cocostation.com',
            role: 'Station Manager',
            stationId: 'coco-lagos-1'
        };
        
        appState.currentUser = user;
        elements.userName.textContent = user.name;
        
        // Initialize user avatar with first letter
        const firstLetter = user.name.charAt(0).toUpperCase();
        elements.userAvatar.innerHTML = firstLetter;
        
    } catch (error) {
        console.error('Authentication failed:', error);
        showError('Authentication failed. Please refresh and try again.');
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Form navigation
    elements.nextBtn.addEventListener('click', nextStep);
    elements.prevBtn.addEventListener('click', prevStep);
    elements.form.addEventListener('submit', handleSubmit);
    
    // Photo upload
    elements.photoUploadArea.addEventListener('click', () => elements.photoInput.click());
    elements.photoUploadArea.addEventListener('dragover', handleDragOver);
    elements.photoUploadArea.addEventListener('drop', handleDrop);
    elements.photoInput.addEventListener('change', handlePhotoSelect);
    
    // Character counter
    elements.issueDescription.addEventListener('input', updateCharCounter);
    
    // Modal controls
    document.getElementById('closeModalBtn').addEventListener('click', closeModal);
    document.getElementById('submitAnotherBtn').addEventListener('click', resetForm);
    
    // Logout
    elements.logoutBtn.addEventListener('click', handleLogout);
    
    // Form validation on change
    elements.form.addEventListener('change', validateCurrentStep);
    elements.form.addEventListener('input', validateCurrentStep);
}

// Step Navigation
function nextStep() {
    if (!validateCurrentStep()) {
        showError('Please complete all required fields before continuing.');
        return;
    }
    
    if (appState.currentStep < appState.totalSteps) {
        appState.currentStep++;
        updateStepDisplay();
        updateUI();
        
        // Add smooth animation
        elements.steps[appState.currentStep - 1].classList.add('fade-in');
    }
}

function prevStep() {
    if (appState.currentStep > 1) {
        appState.currentStep--;
        updateStepDisplay();
        updateUI();
        
        // Add smooth animation
        elements.steps[appState.currentStep - 1].classList.add('fade-in');
    }
}

function updateStepDisplay() {
    // Update form steps
    elements.steps.forEach((step, index) => {
        step.classList.toggle('active', index === appState.currentStep - 1);
    });
    
    // Update progress indicators
    elements.progressSteps.forEach((step, index) => {
        step.classList.toggle('active', index < appState.currentStep);
    });
}

function updateUI() {
    // Update button visibility
    elements.prevBtn.style.display = appState.currentStep > 1 ? 'flex' : 'none';
    elements.nextBtn.style.display = appState.currentStep < appState.totalSteps ? 'flex' : 'none';
    elements.submitBtn.style.display = appState.currentStep === appState.totalSteps ? 'flex' : 'none';
}

// Form Validation
function validateCurrentStep() {
    const currentStepElement = elements.steps[appState.currentStep - 1];
    const requiredFields = currentStepElement.querySelectorAll('[required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
        if (field.type === 'radio') {
            const radioGroup = currentStepElement.querySelectorAll(`[name="${field.name}"]`);
            const isRadioValid = Array.from(radioGroup).some(radio => radio.checked);
            if (!isRadioValid) {
                isValid = false;
                highlightInvalidField(field);
            } else {
                removeHighlight(field);
            }
        } else if (!field.value.trim()) {
            isValid = false;
            highlightInvalidField(field);
        } else {
            removeHighlight(field);
        }
    });
    
    return isValid;
}

function highlightInvalidField(field) {
    field.style.borderColor = 'var(--danger-color)';
    field.style.boxShadow = '0 0 0 3px rgba(220, 53, 69, 0.1)';
}

function removeHighlight(field) {
    field.style.borderColor = '';
    field.style.boxShadow = '';
}

// Photo Handling
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    elements.photoUploadArea.style.borderColor = 'var(--primary-color)';
    elements.photoUploadArea.style.background = 'rgba(0, 102, 204, 0.05)';
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const files = Array.from(e.dataTransfer.files);
    handlePhotoFiles(files);
    
    // Reset styles
    elements.photoUploadArea.style.borderColor = '';
    elements.photoUploadArea.style.background = '';
}

function handlePhotoSelect(e) {
    const files = Array.from(e.target.files);
    handlePhotoFiles(files);
}

function handlePhotoFiles(files) {
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (appState.uploadedPhotos.length + imageFiles.length > 3) {
        showError('Maximum 3 photos allowed.');
        return;
    }
    
    imageFiles.forEach(file => {
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            showError(`File ${file.name} is too large. Maximum size is 5MB.`);
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const photoData = {
                file: file,
                url: e.target.result,
                id: Date.now() + Math.random()
            };
            
            appState.uploadedPhotos.push(photoData);
            renderPhotoPreview();
        };
        reader.readAsDataURL(file);
    });
}

function renderPhotoPreview() {
    elements.photoPreview.innerHTML = '';
    
    appState.uploadedPhotos.forEach(photo => {
        const photoElement = document.createElement('div');
        photoElement.className = 'photo-item';
        photoElement.innerHTML = `
            <img src="${photo.url}" alt="Issue photo">
            <button type="button" class="photo-remove" onclick="removePhoto(${photo.id})">
                <i class="fas fa-times"></i>
            </button>
        `;
        elements.photoPreview.appendChild(photoElement);
    });
}

function removePhoto(photoId) {
    appState.uploadedPhotos = appState.uploadedPhotos.filter(photo => photo.id !== photoId);
    renderPhotoPreview();
}

// Character Counter
function updateCharCounter() {
    const text = elements.issueDescription.value;
    const count = text.length;
    const maxLength = 500;
    
    elements.charCount.textContent = count;
    elements.charCount.style.color = count > maxLength * 0.9 ? 'var(--danger-color)' : 'var(--gray-500)';
    
    if (count > maxLength) {
        elements.issueDescription.value = text.substring(0, maxLength);
        elements.charCount.textContent = maxLength;
    }
}

// Form Submission
async function handleSubmit(e) {
    e.preventDefault();
    
    if (!validateCurrentStep()) {
        showError('Please complete all required fields.');
        return;
    }
    
    showLoading(true);
    
    try {
        const formData = new FormData(elements.form);
        const issueData = {
            id: generateIssueId(),
            stationId: formData.get('stationSelect') || document.getElementById('stationSelect').value,
            issueType: formData.get('issueType'),
            description: formData.get('issueDescription') || elements.issueDescription.value,
            priority: formData.get('priority'),
            contactMethod: formData.get('contactMethod') || document.getElementById('contactMethod').value,
            reporterId: appState.currentUser.email,
            reporterName: appState.currentUser.name,
            status: 'reported',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            photos: []
        };
        
        // Upload photos to Firebase Storage
        if (appState.uploadedPhotos.length > 0) {
            issueData.photos = await uploadPhotosToStorage(issueData.id);
        }
        
        // Save to Firestore
        await db.collection('issues').doc(issueData.id).set(issueData);
        
        // Send notifications (simulate)
        await sendNotifications(issueData);
        
        showLoading(false);
        showSuccess(issueData.id);
        
    } catch (error) {
        console.error('Error submitting issue:', error);
        showLoading(false);
        showError('Failed to submit issue. Please try again.');
    }
}

async function uploadPhotosToStorage(issueId) {
    const photoUrls = [];
    
    for (let i = 0; i < appState.uploadedPhotos.length; i++) {
        const photo = appState.uploadedPhotos[i];
        const fileName = `issues/${issueId}/photo_${i + 1}_${Date.now()}.jpg`;
        const storageRef = storage.ref(fileName);
        
        try {
            const snapshot = await storageRef.put(photo.file);
            const downloadUrl = await snapshot.ref.getDownloadURL();
            photoUrls.push({
                url: downloadUrl,
                fileName: photo.file.name,
                size: photo.file.size
            });
        } catch (error) {
            console.error('Error uploading photo:', error);
        }
    }
    
    return photoUrls;
}

async function sendNotifications(issueData) {
    // Simulate sending notifications
    // In production, this would trigger Azure Functions or similar
    console.log('Sending notifications for issue:', issueData.id);
    
    // Simulate email to engineering team
    const emailData = {
        to: 'engineering@cocostation.com',
        subject: `New Issue Reported: ${issueData.issueType} at ${issueData.stationId}`,
        body: `
            Issue ID: ${issueData.id}
            Station: ${issueData.stationId}
            Type: ${issueData.issueType}
            Priority: ${issueData.priority}
            Description: ${issueData.description}
            Reporter: ${issueData.reporterName}
        `
    };
    
    // Send via Microsoft Graph (simulate)
    // await sendEmailViaGraph(emailData);
}

// Recent Issues
async function loadRecentIssues() {
    try {
        // Simulate loading recent issues
        const mockIssues = [
            {
                id: 'COCO-2025-001',
                stationId: 'coco-lagos-1',
                issueType: 'electrical',
                description: 'Generator not starting properly after maintenance',
                status: 'in-progress',
                priority: 'high',
                createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
                assignee: 'Engineer Smith'
            },
            {
                id: 'COCO-2025-002',
                stationId: 'coco-lagos-1',
                issueType: 'mechanical',
                description: 'Fuel pump making unusual noise during operation',
                status: 'resolved',
                priority: 'medium',
                createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
                assignee: 'Engineer Johnson'
            }
        ];
        
        appState.recentIssues = mockIssues;
        renderRecentIssues();
        
    } catch (error) {
        console.error('Error loading recent issues:', error);
    }
}

function renderRecentIssues() {
    elements.recentIssues.innerHTML = '';
    
    if (appState.recentIssues.length === 0) {
        elements.recentIssues.innerHTML = `
            <div class="no-issues">
                <i class="fas fa-clipboard-list"></i>
                <p>No recent issues found.</p>
            </div>
        `;
        return;
    }
    
    appState.recentIssues.forEach(issue => {
        const issueCard = document.createElement('div');
        issueCard.className = 'issue-card';
        issueCard.innerHTML = `
            <div class="issue-header">
                <span class="issue-id">${issue.id}</span>
                <span class="status-badge ${issue.status}">${issue.status.replace('-', ' ')}</span>
            </div>
            <p class="issue-description">${issue.description}</p>
            <div class="issue-meta">
                <span><i class="fas fa-map-marker-alt"></i> ${getStationName(issue.stationId)}</span>
                <span><i class="fas fa-tag"></i> ${capitalizeFirst(issue.issueType)}</span>
                <span><i class="fas fa-calendar"></i> ${formatDate(issue.createdAt)}</span>
            </div>
            <div class="issue-summary">
                <span class="issue-type-badge">
                    <i class="fas fa-${getIssueTypeIcon(issue.issueType)}"></i>
                    ${capitalizeFirst(issue.issueType)}
                </span>
                <span class="issue-date">${formatDetailedDate(issue.createdAt)}</span>
            </div>
            ${issue.assignee ? `<p class="assignee"><i class="fas fa-user-cog"></i> ${issue.assignee}</p>` : ''}
        `;
        elements.recentIssues.appendChild(issueCard);
    });
}

// Utility Functions
function generateIssueId() {
    const year = new Date().getFullYear();
    const randomNum = Math.floor(Math.random() * 900) + 100;
    return `COCO-${year}-${randomNum.toString().padStart(3, '0')}`;
}

function getStationName(stationId) {
    const stationNames = {
        'coco-lagos-1': 'COCO Lagos Central',
        'coco-abuja-1': 'COCO Abuja Main',
        'coco-port-1': 'COCO Port Harcourt',
        'coco-kano-1': 'COCO Kano Junction',
        'coco-ibadan-1': 'COCO Ibadan Express'
    };
    return stationNames[stationId] || stationId;
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatDate(date) {
    if (!date) return 'Unknown';
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDetailedDate(date) {
    if (!date) return 'Unknown';
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getIssueTypeIcon(issueType) {
    const icons = {
        'electrical': 'bolt',
        'mechanical': 'cog',
        'safety': 'shield-alt',
        'equipment': 'wrench'
    };
    return icons[issueType] || 'exclamation-triangle';
}

// UI Feedback Functions
function showSuccess(issueId) {
    elements.generatedIssueId.textContent = issueId;
    elements.successModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function showError(message) {
    // Create a toast notification
    const toast = document.createElement('div');
    toast.className = 'toast error';
    toast.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <span>${message}</span>
    `;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--danger-color);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: var(--border-radius-md);
        box-shadow: var(--shadow-lg);
        z-index: 1002;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

function showLoading(show) {
    elements.loadingSpinner.classList.toggle('active', show);
    document.body.style.overflow = show ? 'hidden' : '';
}

function closeModal() {
    elements.successModal.classList.remove('active');
    document.body.style.overflow = '';
}

function resetForm() {
    closeModal();
    elements.form.reset();
    appState.currentStep = 1;
    appState.uploadedPhotos = [];
    updateStepDisplay();
    updateUI();
    renderPhotoPreview();
    updateCharCounter();
}

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        // Clear user data
        appState.currentUser = null;
        
        // Redirect to login page (simulate)
        alert('Logout successful. In production, you would be redirected to the login page.');
        location.reload();
    }
}

// Add CSS for toast animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .no-issues {
        text-align: center;
        color: rgba(255, 255, 255, 0.7);
        padding: 3rem;
        grid-column: 1 / -1;
    }
    
    .no-issues i {
        font-size: 3rem;
        margin-bottom: 1rem;
        opacity: 0.5;
    }
    
    .assignee {
        color: var(--gray-500);
        font-size: 0.875rem;
        margin: 0;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
`;
document.head.appendChild(style);