import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from 'firebase/auth';

// Safe check if custom production Firebase keys are supplied via environment variables
export const isRealFirebaseConfigured = Boolean(
  import.meta.env.VITE_FIREBASE_API_KEY &&
  !import.meta.env.VITE_FIREBASE_API_KEY.includes('AIzaSyA8wQ3tK7m6')
);

// Standard Firebase Configuration for Lokify Civic Platform
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyA8wQ3tK7m6Z9y2P4q1X8wV0bN5jL7c9e',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'lokify-civic.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'lokify-civic',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'lokify-civic.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1084293847291',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:1084293847291:web:a7b8c9d0e1f2a3b4',
};

// Safe singleton Firebase initialization
export const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Firebase Auth Service
export const auth = getAuth(firebaseApp);

// Configured Google Auth Provider
export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.setCustomParameters({
  prompt: 'select_account',
});

/**
 * Resilient Firebase Google Sign-In helper.
 * If external OAuth endpoint is unconfigured, falls back immediately to in-app
 * account picker without opening an invalid popup that throws "The requested action is invalid".
 */
export async function signInWithGoogleFirebase() {
  if (!isRealFirebaseConfigured) {
    // Return graceful fallback signal so in-app Google Account sheet displays seamlessly
    return {
      success: false,
      fallbackNeeded: true,
      code: 'in-app-selection-required',
      message: 'Opening in-app Google account selection',
    };
  }

  try {
    const result = await signInWithPopup(auth, googleAuthProvider);
    const user = result.user;
    return {
      success: true,
      user: {
        id: user.uid,
        name: user.displayName || user.email?.split('@')[0] || 'Citizen',
        email: user.email,
        avatarUrl: user.photoURL,
        role: 'citizen',
        authProvider: 'firebase-google',
      },
    };
  } catch (error) {
    return {
      success: false,
      fallbackNeeded: true,
      error: error.message,
      code: error.code,
    };
  }
}

export { signInWithPopup, signOut };
export default firebaseApp;
