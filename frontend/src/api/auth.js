import { api, saveToken, clearToken } from "./client";

export async function register({ email, password, name }) {
  const { data } = await api.post("/auth/register", { email, password, name });
  return data;
}

export async function login({ email, password }) {
  const { data } = await api.post("/auth/login", { email, password });
  saveToken(data.token);
  return data.user;
}

export function logout() {
  clearToken();
}

export async function fetchMe() {
  const { data } = await api.get("/auth/me");
  return data;
}
