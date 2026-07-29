export const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api";

async function request(path, { method = "GET", body, headers } = {}) {
  const isFormData = body instanceof FormData;
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    // FormData는 boundary가 포함된 Content-Type을 브라우저가 직접 설정해야 해서
    // 여기서 헤더를 지정하면 안 된다.
    headers: isFormData ? headers : { "Content-Type": "application/json", ...headers },
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const error = new Error(data?.error?.message ?? `Request failed: ${res.status}`);
    error.code = data?.error?.code;
    error.status = res.status;
    throw error;
  }

  return data;
}

export const apiClient = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body }),
  patch: (path, body) => request(path, { method: "PATCH", body }),
  delete: (path) => request(path, { method: "DELETE" }),
  uploadImage: (path, file) => {
    const body = new FormData();
    body.append("image", file);
    return request(path, { method: "POST", body });
  },
};
