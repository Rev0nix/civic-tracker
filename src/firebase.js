import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from 'firebase/auth';

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

// Configured Google Auth Provider with account selection prompt
export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.setCustomParameters({
  prompt: 'select_account',
});

// Helper for Firebase Google Sign-In with popup
export async function signInWithGoogleFirebase() {
  try {
    const result = await signInWithPopup(auth, googleAuthProvider);
    const user = result.user;
    return {
      success: true,
      user: {
        id: user.uid,
        name: user.displayName || 'Google Citizen',
        email: user.email,
        phone: user.phoneNumber || '+91 98451 23456',
        avatarUrl: user.photoURL,
        role: 'citizen',
        authProvider: 'firebase-google',
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      code: error.code,
    };
  }
}

export { signInWithPopup, signOut };
export default firebaseApp;
