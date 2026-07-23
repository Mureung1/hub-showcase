// 여러 화면에서 반복되던 "요청 보내고 성공/실패 확인하는" 로직을 하나로 모은 공통 유틸.
// 항상 { ok, data } 또는 { ok:false, error } 모양만 돌려주므로, 호출하는 쪽은 try/catch 없이
// result.ok만 확인하면 된다 — 서버 실패(4xx/5xx)와 네트워크 자체 실패를 같은 모양으로 통일한다.
async function requestJson(method, url, body = {}) {
  let res
  let json
  try {
    res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    json = await res.json()
  } catch {
    return { ok: false, error: '네트워크 오류가 발생했습니다.' }
  }

  if (!res.ok) {
    return { ok: false, error: json.error }
  }
  return { ok: true, data: json }
}

export function postJson(url, body) {
  return requestJson('POST', url, body)
}

export function patchJson(url, body) {
  return requestJson('PATCH', url, body)
}
