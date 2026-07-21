const API_URL = "http://localhost:3001";

async function request(path, options) {
  const token = localStorage.getItem("campus-cart-token");
  const response = await fetch(`${API_URL}${path}`, { ...options, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options?.headers } });
  if (response.status === 204) return null;
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "요청을 처리하지 못했습니다.");
  return body;
}

export const getHealth = () => request("/api/health");
export const getMe = async () => (await request("/api/auth/me")).user;
export const login = (input) => request("/api/auth/login", jsonOptions("POST", input));
export const register = (input) => request("/api/auth/register", jsonOptions("POST", input));
export const getGroupBuys = async () => (await request("/api/group-buys")).groupBuys;
export const getGroupBuy = async (id) => (await request(`/api/group-buys/${id}`)).groupBuy;
export const createGroupBuy = async (input) => (await request("/api/group-buys", jsonOptions("POST", input))).groupBuy;
export const updateGroupBuy = async (id, input) => (await request(`/api/group-buys/${id}`, jsonOptions("PATCH", input))).groupBuy;
export const joinGroupBuy = async (id, input = {}) => (await request(`/api/group-buys/${id}/join`, jsonOptions("POST", input))).groupBuy;
export const votePickup = async (id, candidate) => (await request(`/api/group-buys/${id}/vote`, jsonOptions("POST", { candidate }))).groupBuy;
export const advanceStage = async (id) => (await request(`/api/group-buys/${id}/stage`, { method: "PATCH" })).groupBuy;
export const finalizePickup = async (id) => (await request(`/api/group-buys/${id}/finalize-pickup`, { method: "PATCH" })).groupBuy;
export const deleteGroupBuy = (id) => request(`/api/group-buys/${id}`, { method: "DELETE" });

function jsonOptions(method, body) {
  return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}
