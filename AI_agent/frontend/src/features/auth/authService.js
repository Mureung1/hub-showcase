import { clearSession, getAuthToken, getSession, saveSession } from "./authStorage";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  getIdToken,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import { assertFirebaseConfigured, firebaseAuth } from "./firebaseClient";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

const requestJson = async (path, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const missingLabels = data.details?.missingLabels;
    const detailMessage = Array.isArray(missingLabels)
      ? ` (${missingLabels.join(", ")})`
      : "";
    throw new Error(`${data.message || "요청을 처리하지 못했습니다."}${detailMessage}`);
  }

  return data;
};

export const requestAuthJson = async (path, options = {}) => {
  const firebaseUser = firebaseAuth?.currentUser;
  const token = firebaseUser ? await getIdToken(firebaseUser) : getAuthToken();

  return requestJson(path, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
};

export const isAuthenticated = () => {
  const session = getSession();

  return Boolean(session?.token);
};

export const getCurrentSession = () => {
  return getSession();
};

export const registerUser = async (user) => {
  assertFirebaseConfigured();

  await requestJson("/api/auth/firebase-registration-check", {
    method: "POST",
    body: JSON.stringify({
      email: user.email,
      username: user.username,
    }),
  });

  const credential = await createUserWithEmailAndPassword(
    firebaseAuth,
    user.email,
    user.password
  );

  await sendEmailVerification(credential.user, {
    url: `${window.location.origin}/login`,
  });

  const idToken = await getIdToken(credential.user, true);

  try {
    await requestJson("/api/auth/firebase-profile", {
      method: "POST",
      body: JSON.stringify({
        idToken,
        username: user.username,
        name: user.name,
        school: user.school,
        major: user.major,
      }),
    });
  } catch (error) {
    await deleteUser(credential.user).catch(() => {});
    await signOut(firebaseAuth).catch(() => {});
    throw error;
  }

  saveSession({
    id: "",
    email: user.email,
    username: user.username,
    name: user.name,
    school: user.school,
    major: user.major,
    emailVerified: false,
    token: "",
  });

  await signOut(firebaseAuth);

  return {
    ok: true,
    user: {
      email: user.email,
      name: user.name,
    },
  };
};

export const loginUser = async ({ account, password }) => {
  assertFirebaseConfigured();

  const loginEmail = account.includes("@")
    ? account.trim().toLowerCase()
    : (await requestJson("/api/auth/firebase-login-email", {
        method: "POST",
        body: JSON.stringify({ account }),
      })).email;

  const credential = await signInWithEmailAndPassword(firebaseAuth, loginEmail, password);
  await credential.user.reload();

  if (!credential.user.emailVerified) {
    await sendEmailVerification(credential.user, {
      url: `${window.location.origin}/login`,
    });
    await signOut(firebaseAuth);
    throw new Error("이메일 인증을 완료해 주세요. 인증 메일을 다시 발송했습니다.");
  }

  const idToken = await getIdToken(credential.user, true);
  const profile = getSession();
  const profileMatchesLogin =
    profile?.email?.toLowerCase?.() === credential.user.email?.toLowerCase();
  const data = await requestJson("/api/auth/firebase-session", {
    method: "POST",
    body: JSON.stringify({
      idToken,
      username: profileMatchesLogin ? profile.username : "",
      name: profileMatchesLogin
        ? profile.name
        : credential.user.displayName || credential.user.email?.split("@")[0],
      school: profileMatchesLogin ? profile.school : "",
      major: profileMatchesLogin ? profile.major : "",
    }),
  });

  saveSession({ ...data.user, token: idToken });

  return {
    ok: true,
    user: data.user,
  };
};

export const verifyEmail = async (token) => {
  const data = await requestJson("/api/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ token }),
  });

  return data.user;
};

export const fetchCurrentUser = async () => {
  const data = await requestAuthJson("/api/auth/me");
  saveSession({ ...data.user, token: getAuthToken() });

  return data.user;
};

export const updateCurrentUser = async (profile) => {
  const data = await requestAuthJson("/api/auth/me", {
    method: "PATCH",
    body: JSON.stringify(profile),
  });

  saveSession({ ...data.user, token: getAuthToken() });
  return data.user;
};

export const logoutUser = () => {
  if (firebaseAuth?.currentUser) {
    signOut(firebaseAuth).catch(() => {});
  }
  clearSession();
};
