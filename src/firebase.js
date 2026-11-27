import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
} from 'firebase/auth';

// Firebase Configuration from Vite Environment Variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

// Check if valid Firebase configuration is present
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    !firebaseConfig.apiKey.includes('placeholder')
);

// Safe singleton Firebase initialization
export const firebaseApp = isFirebaseConfigured
  ? getApps().length > 0
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;

// Firebase Auth Service
export const auth = firebaseApp ? getAuth(firebaseApp) : null;

// Official Google Auth Provider configured with 'select_account'
export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.setCustomParameters({
  prompt: 'select_account',
});

/**
 * Official Google Sign-In via Firebase Authentication.
 * 1. Opens the official Google Sign-In account selection interface (accounts.google.com).
 * 2. Displays all Google accounts available in the browser/device with name, email, and avatar.
 * 3. Provides "Use another account" (Add account) directly from Google's interface.
 * 4. Authenticates the user and returns the verified profile and JWT ID token.
 * 5. If the user cancels or closes the window, returns { cancelled: true } with zero error thrown.
 */
export async function signInWithGoogleFirebase() {
  if (!auth) {
    return {
      success: false,
      configured: false,
      error:
        'Firebase Google Sign-In is not configured. Please set VITE_FIREBASE_API_KEY and VITE_FIREBASE_AUTH_DOMAIN in your environment.',
    };
  }

  try {
    const result = await signInWithPopup(auth, googleAuthProvider);
    const user = result.user;
    const token = await user.getIdToken();

    return {
      success: true,
      user: {
        id: user.uid,
        name: user.displayName || user.email?.split('@')[0] || 'Citizen',
        email: user.email,
        avatarUrl:
          user.photoURL ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'Citizen')}&background=1F6FEB&color=fff`,
        role: 'citizen',
        authProvider: 'firebase-google',
        token,
        loginTime: new Date().toISOString(),
      },
    };
  } catch (error) {
    // If popup is blocked by the browser, fallback to redirect flow
    if (
      error.code === 'auth/popup-blocked' ||
      error.code === 'auth/operation-not-supported-in-this-environment'
    ) {
      try {
        await signInWithRedirect(auth, googleAuthProvider);
        return { pendingRedirect: true };
      } catch (redirectError) {
        return {
          success: false,
          error: redirectError.message,
          code: redirectError.code,
        };
      }
    }

    // User cancelled the login (closed the popup)
    const isCancelled =
      error.code === 'auth/popup-closed-by-user' ||
      error.code === 'auth/cancelled-popup-request' ||
      error.message?.toLowerCase().includes('closed');

    return {
      success: false,
      cancelled: isCancelled,
      error: isCancelled ? null : error.message,
      code: error.code,
    };
  }
}

/**
 * Checks for a pending redirect authentication result on application mount.
 */
export async function checkFirebaseRedirectResult() {
  if (!auth) return null;

  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      const user = result.user;
      const token = await user.getIdToken();

      return {
        id: user.uid,
        name: user.displayName || user.email?.split('@')[0] || 'Citizen',
        email: user.email,
        avatarUrl:
          user.photoURL ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'Citizen')}&background=1F6FEB&color=fff`,
        role: 'citizen',
        authProvider: 'firebase-google',
        token,
        loginTime: new Date().toISOString(),
      };
    }
  } catch (error) {
    console.warn('Firebase redirect result inspection error:', error);
  }
  return null;
}

export { signInWithPopup, signInWithRedirect, getRedirectResult, signOut };
export default firebaseApp;
