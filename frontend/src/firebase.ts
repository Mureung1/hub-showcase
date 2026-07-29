import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDuIy_9P_oB4omGS0IQPJKU9lqQ4Fd1RX0",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "ai-challenge-d37b2.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "ai-challenge-d37b2",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "ai-challenge-d37b2.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "873941659363",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:873941659363:web:dd6a93f71a383daf921fd6",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-R9LH47D9WL"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
