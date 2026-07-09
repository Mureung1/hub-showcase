const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000"

/**
 * Shared fetch wrapper. Expects every server response to follow the
 * { success, data } / { success: false, error } shape (see CLAUDE.md).
 */
export async function apiRequest(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  })

  const body = await res.json()

  if (!res.ok || !body.success) {
    throw new Error(body.error ?? `Request failed: ${path}`)
  }

  return body.data
}
