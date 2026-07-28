import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

import { env } from "../config/env.js";

const normalizePrivateKey = (key) => String(key || "").replace(/\\n/g, "\n");

export const isFirebaseAdminConfigured = () =>
  Boolean(env.firebaseProjectId && env.firebaseClientEmail && env.firebasePrivateKey);

const getFirebaseAuth = () => {
  if (!isFirebaseAdminConfigured()) {
    throw new Error("Firebase Admin 설정이 필요합니다.");
  }

  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId: env.firebaseProjectId,
        clientEmail: env.firebaseClientEmail,
        privateKey: normalizePrivateKey(env.firebasePrivateKey),
      }),
    });
  }

  return getAuth();
};

export const verifyFirebaseIdToken = async (idToken) => {
  return getFirebaseAuth().verifyIdToken(idToken);
};
