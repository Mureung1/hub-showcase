const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await response.json() : null;

  if (!response.ok) {
    throw new Error(body?.error ?? `요청이 실패했습니다 (${response.status})`);
  }

  return body;
}

export const apiClient = {
  get: (path) => request(path, { method: "GET" }),
  post: (path, data) => request(path, { method: "POST", body: JSON.stringify(data) }),
  patch: (path, data) => request(path, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (path) => request(path, { method: "DELETE" }),
};
