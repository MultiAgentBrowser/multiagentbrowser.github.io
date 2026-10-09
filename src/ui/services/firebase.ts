import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Object.values(config).every(Boolean);

export function getFirebaseServices() {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase is not configured. Add the Web app settings to .env.local and rebuild.');
  }

  const app = getApps().length > 0 ? getApp() : initializeApp(config);
  return {
    auth: getAuth(app),
    db: getFirestore(app, 'privacy-browser'),
  };
}
