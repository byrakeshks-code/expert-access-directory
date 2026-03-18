import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const firebaseAuth = getAuth(app);

// Disable real reCAPTCHA for phone auth in dev: use test phone numbers only (see README or Firebase Console).
// Set NEXT_PUBLIC_FIREBASE_PHONE_TEST_MODE=true to enable; then add test numbers in Firebase Console.
if (typeof window !== 'undefined' && (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_FIREBASE_PHONE_TEST_MODE === 'true')) {
  try {
    (firebaseAuth as any).settings.appVerificationDisabledForTesting = true;
  } catch {
    // ignore if not supported
  }
}
