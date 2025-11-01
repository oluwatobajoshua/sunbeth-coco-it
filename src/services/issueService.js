import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  serverTimestamp 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';

// Generate issue ID
export const generateIssueId = () => {
  const year = new Date().getFullYear();
  const randomNum = Math.floor(Math.random() * 900) + 100;
  return `COCO-${year}-${randomNum.toString().padStart(3, '0')}`;
};

// Upload photos to Firebase Storage
export const uploadPhotos = async (issueId, photos) => {
  const photoUrls = [];
  
  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    const fileName = `issues/${issueId}/photo_${i + 1}_${Date.now()}.jpg`;
    const storageRef = ref(storage, fileName);
    
    try {
      const snapshot = await uploadBytes(storageRef, photo.file);
      const downloadUrl = await getDownloadURL(snapshot.ref);
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
};

// Create new issue
export const createIssue = async (issueData, photos = []) => {
  try {
    const issueId = generateIssueId();
    
    // Upload photos first
    let photoUrls = [];
    if (photos.length > 0) {
      photoUrls = await uploadPhotos(issueId, photos);
    }
    
    // Prepare issue document
    const issue = {
      id: issueId,
      ...issueData,
      photos: photoUrls,
      status: 'reported',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    // Save to Firestore
    await addDoc(collection(db, 'issues'), issue);
    
    return issueId;
  } catch (error) {
    console.error('Error creating issue:', error);
    throw error;
  }
};

// Get recent issues for a user
export const getRecentIssues = async (userEmail, limitCount = 5, stationId) => {
  try {
    const constraints = [
      where('reporterId', '==', userEmail),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    ];
    if (stationId) {
      constraints.unshift(where('stationId', '==', stationId));
    }
    const q = query(collection(db, 'issues'), ...constraints);
    
    const querySnapshot = await getDocs(q);
    const issues = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      issues.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate()
      });
    });
    
    return issues;
  } catch (error) {
    console.error('Error getting recent issues:', error);
    return [];
  }
};

// Send notifications (placeholder for Microsoft Graph integration)
export const sendNotifications = async (issueData) => {
  console.log('Sending notifications for issue:', issueData.id);
  
  // In production, this would integrate with Microsoft Graph
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
  
  // Simulate successful notification
  return Promise.resolve(emailData);
};