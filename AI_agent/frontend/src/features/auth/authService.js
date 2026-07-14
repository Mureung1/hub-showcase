import { clearSession, getAuthToken, getSession, saveSession } from "./authStorage";

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
  const token = getAuthToken();

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
  const data = await requestJson("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name: user.name,
      username: user.username,
      email: user.email,
      password: user.password,
      school: user.school,
      major: user.major,
      verificationOrigin: window.location.origin,
    }),
  });

  return {
    ok: true,
    user: data.user,
  };
};

export const loginUser = async ({ account, password }) => {
  const data = await requestJson("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ account, password }),
  });

  saveSession({ ...data.user, token: data.token });

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

export const logoutUser = () => {
  clearSession();
};
