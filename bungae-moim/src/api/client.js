// 백엔드 API 공통 fetch 래퍼. 성공하면 응답 본문의 data를 반환하고, 실패하면
// 서버가 준 에러 메시지/코드를 담은 Error를 던진다. credentials: 'same-origin'으로
// 세션 쿠키를 함께 실어 보낸다(Vite dev proxy 덕에 브라우저 입장에선 동일 오리진).
export async function request(path, options) {
  const res = await fetch(path, { credentials: 'same-origin', ...options })
  const body = await res.json().catch(() => null)

  if (!res.ok) {
    const error = new Error(body?.error?.message ?? '요청에 실패했어요. 잠시 후 다시 시도해 주세요.')
    error.code = body?.error?.code
    throw error
  }

  return body.data
}
