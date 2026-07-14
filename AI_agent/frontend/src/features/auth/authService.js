import { clearSession, getSession, saveSession } from "./authStorage";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

const requestJson = async (path, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "요청을 처리하지 못했습니다.");
  }

  return data;
};

export const isAuthenticated = () => {
  return Boolean(getSession());
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

  saveSession(data.user);

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

export const logoutUser = () => {
  clearSession();
};
