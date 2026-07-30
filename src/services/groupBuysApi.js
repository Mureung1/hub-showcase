const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:3001").replace(/\/$/, "");

async function request(path, options) {
  const token = localStorage.getItem("campus-cart-token");
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options?.headers } });
  } catch {
    throw new Error("서버에 연결하지 못했습니다. 개발 서버가 실행 중인지 확인해 주세요.");
  }
  if (response.status === 204) return null;
  const text = await response.text();
  const body = text ? parseResponseBody(text) : {};
  if (!response.ok) throw new Error(body.error ?? "요청을 처리하지 못했습니다.");
  return body;
}

export const getHealth = () => request("/api/health");
export const getMe = async () => (await request("/api/auth/me")).user;
export const login = (input) => request("/api/auth/login", jsonOptions("POST", input));
export const register = (input) => request("/api/auth/register", jsonOptions("POST", input));
export const getGroupBuys = async () => (await request("/api/group-buys")).groupBuys;
export const getGroupBuy = async (id) => (await request(`/api/group-buys/${id}`)).groupBuy;
export const createGroupBuy = async (input) => (await request("/api/group-buys", jsonOptions("POST", normalizePickupInput(input)))).groupBuy;
export const previewProduct = async (url) => {
  const body = await request("/api/products/preview", jsonOptions("POST", { url }));
  return { ...body.product, warnings: body.warnings ?? [] };
};
export const updateGroupBuy = async (id, input) => (await request(`/api/group-buys/${id}`, jsonOptions("PATCH", normalizePickupInput(input)))).groupBuy;
export const joinGroupBuy = async (id, input = {}) => (await request(`/api/group-buys/${id}/join`, jsonOptions("POST", normalizeJoinInput(input)))).groupBuy;
export const cancelGroupBuyParticipation = async (id) => (await request(`/api/group-buys/${id}/join`, { method: "DELETE" })).groupBuy;
export const votePickup = async (id, candidate) => (await request(`/api/group-buys/${id}/vote`, jsonOptions("POST", { candidate }))).groupBuy;
export const advanceStage = async (id) => (await request(`/api/group-buys/${id}/stage`, { method: "PATCH" })).groupBuy;
export const finalizePickup = async (id) => (await request(`/api/group-buys/${id}/finalize-pickup`, { method: "PATCH" })).groupBuy;
export const deleteGroupBuy = (id) => request(`/api/group-buys/${id}`, { method: "DELETE" });

function jsonOptions(method, body) {
  return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

function normalizePickupInput(input) {
  return normalizeLocationInput(input, "pickupLocation", "pickupLatitude", "pickupLongitude");
}

function normalizeJoinInput(input) {
  return normalizeLocationInput(input, "startLocation", "latitude", "longitude");
}

function normalizeLocationInput(input, addressField, latitudeField, longitudeField) {
  const address = String(input[addressField] ?? "").trim();
  if (address.length < 2 || address.length > 80) {
    throw new Error("Location address must be between 2 and 80 characters.");
  }
  const hasCoordinatePair = Number.isFinite(input[latitudeField]) && Number.isFinite(input[longitudeField]);
  return {
    ...input,
    [addressField]: address,
    [latitudeField]: hasCoordinatePair ? input[latitudeField] : null,
    [longitudeField]: hasCoordinatePair ? input[longitudeField] : null,
  };
}

function parseResponseBody(text) {
  try {
    return JSON.parse(text);
  } catch {
    return { error: "서버 응답을 확인하지 못했습니다." };
  }
}
