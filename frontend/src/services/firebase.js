import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import firebaseConfig from '../config';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

// Opt-in to Firebase Emulators for E2E/CI via env flags
if (process.env.REACT_APP_USE_EMULATORS === 'true') {
	try {
		const host = process.env.REACT_APP_EMULATOR_HOST || 'localhost';
		connectFirestoreEmulator(db, host, Number(process.env.REACT_APP_FIRESTORE_EMULATOR_PORT) || 8080);
		connectStorageEmulator(storage, host, Number(process.env.REACT_APP_STORAGE_EMULATOR_PORT) || 9199);
		connectAuthEmulator(auth, `http://${host}:${Number(process.env.REACT_APP_AUTH_EMULATOR_PORT) || 9099}`);
		// eslint-disable-next-line no-console
		console.log('[Emulators] Connected to Firestore/Storage/Auth emulators');
	} catch (e) {
		// eslint-disable-next-line no-console
		console.warn('Failed to connect to emulators:', e?.message || e);
	}
}

export default app;