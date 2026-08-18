import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { doc, getFirestore, serverTimestamp, setDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';

// Firebase web configuration is safe to ship in a browser bundle. Security comes
// from Firebase Authentication and Firestore Rules, not from hiding this config.
const hasFirebaseApiKey = Boolean(import.meta.env.VITE_FIREBASE_API_KEY);
const firebaseConfig = {
  // Keep the preview renderable when Firebase has not been connected yet.
  // Firebase Auth only rejects an empty key during initialization; the
  // explicit configuration guard below still prevents fake sign-in attempts.
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'studyace-preview-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'fir-7fa8b.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'fir-7fa8b',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'fir-7fa8b.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '543269803990',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:543269803990:web:e2eec64fd5007ea8be3677',
};

export const firebaseConfigError = hasFirebaseApiKey
  ? ''
  : 'Firebase is not configured. Add the Web API key from Firebase Project settings as VITE_FIREBASE_API_KEY.';

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const ADMIN_EMAIL = 'voidfury1527@gmail.com';

export function assertFirebaseConfigured() {
  if (firebaseConfigError) throw new Error(firebaseConfigError);
}

export async function syncUserProfile(user: User, isNewAccount = false) {
  assertFirebaseConfigured();

  const profile: Record<string, unknown> = {
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || 'StudyAce student',
    emailVerified: user.emailVerified,
    lastLoginAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (isNewAccount) profile.createdAt = serverTimestamp();

  await setDoc(doc(db, 'users', user.uid), profile, { merge: true });
}

export async function createInitialWorkspace(user: User) {
  assertFirebaseConfigured();
  await setDoc(doc(db, 'studyaceData', user.uid), {
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || 'StudyAce student',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}