import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

// Config parsed from firebase-applet-config.json
const firebaseConfig = {
  apiKey: "AIzaSyC5gLwGmllLAQvpDAE5CNHTxHcZaX3mDoI",
  authDomain: "flawless-chimera-wwrl4.firebaseapp.com",
  projectId: "flawless-chimera-wwrl4",
  storageBucket: "flawless-chimera-wwrl4.firebasestorage.app",
  messagingSenderId: "1084911806372",
  appId: "1:1084911806372:web:b0f5d35cc27b5885d24331"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, "ai-studio-pickmyclothes-162faf5b-fe25-4133-9e8c-9ec21c393968");

/**
 * SHA-256 helper for client-side password hashing
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  // Salt is appended to prevent standard dictionary/rainbow-table matchings
  const data = encoder.encode(password + "_pmc_salt_secure_2026");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

export interface FirestoreUserData {
  closet: any[];
  savedStyles: any[];
  calendarEvents: any[];
  profile: {
    username: string;
    avatarUrl: string;
  };
}

/**
 * Syncs user data to Firestore
 */
export async function syncUserDataToCloud(username: string, data: Partial<FirestoreUserData>) {
  if (!username) return;
  const docId = username.toLowerCase().trim();
  const userRef = doc(db, "user_data", docId);
  try {
    await setDoc(userRef, data, { merge: true });
    console.log(`[Firebase] Synced data successfully for user: ${username}`);
  } catch (error) {
    console.error(`[Firebase] Failed to sync data for ${username}:`, error);
  }
}

/**
 * Loads user data from Firestore
 */
export async function loadUserDataFromCloud(username: string): Promise<FirestoreUserData | null> {
  if (!username) return null;
  const docId = username.toLowerCase().trim();
  const userRef = doc(db, "user_data", docId);
  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data() as FirestoreUserData;
    }
  } catch (error) {
    console.error(`[Firebase] Failed to load data for ${username}:`, error);
  }
  return null;
}
