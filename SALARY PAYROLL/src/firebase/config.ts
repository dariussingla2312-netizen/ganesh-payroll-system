import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  Firestore,
  getFirestore
} from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';

export interface FirebaseConfigParams {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

const getStoredOrEnvConfig = (): FirebaseConfigParams | null => {
  try {
    const stored = localStorage.getItem('staff_payroll_firebase_config');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.apiKey && parsed.projectId) {
        return parsed;
      }
    }
  } catch (e) {
    // ignore
  }

  const envApiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const envProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;

  if (envApiKey && envProjectId && envApiKey !== 'your_api_key_here') {
    return {
      apiKey: envApiKey,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${envProjectId}.firebaseapp.com`,
      projectId: envProjectId,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${envProjectId}.appspot.com`,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
    };
  }

  return null;
};

const activeConfig = getStoredOrEnvConfig();

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;
let isFirebaseConfigured = false;

if (activeConfig) {
  try {
    if (!getApps().length) {
      app = initializeApp(activeConfig);
      // Initialize Firestore with offline persistence
      try {
        db = initializeFirestore(app, {
          localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager(),
          }),
        });
      } catch (cacheErr) {
        console.warn('Firestore offline cache init fallback:', cacheErr);
        db = getFirestore(app);
      }
      auth = getAuth(app);
      isFirebaseConfigured = true;
    } else {
      app = getApps()[0];
      db = getFirestore(app);
      auth = getAuth(app);
      isFirebaseConfigured = true;
    }
  } catch (err) {
    console.warn('Firebase initialization notice (running in offline/demo mode):', err);
    isFirebaseConfigured = false;
  }
}

export { app, db, auth, isFirebaseConfigured };
