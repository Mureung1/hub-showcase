const DEFAULT_API_BASE_URL = "";
const configuredApiBaseUrl =
  import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL;

async function readResponse(response) {
  const payload = await response.json().catch(() => null);

  if (!response.ok || payload?.success !== true) {
    const error = new Error(
      payload?.error?.message || "게스트 세션 요청에 실패했습니다."
    );
    error.code = payload?.error?.code || "GUEST_SESSION_REQUEST_FAILED";
    throw error;
  }

  return payload.data;
}

export function createGuestSessionApi({
  baseUrl = configuredApiBaseUrl,
  fetchImpl = (...args) => globalThis.fetch(...args)
} = {}) {
  const endpoint = `${String(baseUrl).replace(/\/+$/, "")}/api/guest-sessions`;

  return {
    async create() {
      return readResponse(
        await fetchImpl(endpoint, { method: "POST", cache: "no-store" })
      );
    },
    async recover(recoveryKey) {
      return readResponse(
        await fetchImpl(`${endpoint}/recover`, {
          method: "POST",
          headers: { "X-Guest-Key": recoveryKey },
          cache: "no-store"
        })
      );
    },
    async remove(recoveryKey, { keepalive = false } = {}) {
      const response = await fetchImpl(`${endpoint}/current`, {
        method: "DELETE",
        headers: { "X-Guest-Key": recoveryKey },
        cache: "no-store",
        keepalive
      });

      if (!response.ok) {
        const error = new Error("임시 게스트 세션을 정리하지 못했습니다.");
        error.code = "GUEST_SESSION_DELETE_FAILED";
        throw error;
      }
    }
  };
}

const defaultApi = createGuestSessionApi();
export const createGuestSession = () => defaultApi.create();
export const recoverGuestSession = (recoveryKey) =>
  defaultApi.recover(recoveryKey);
export const deleteGuestSession = (recoveryKey, options) =>
  defaultApi.remove(recoveryKey, options);
