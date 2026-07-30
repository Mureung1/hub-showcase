// 서버 응답을 JSON 으로 읽고, 실패하면 error.code 를 붙인 Error 를 던진다.
// 주소는 `data/api.js` 의 `apiUrl` 이 만든다. 화면은 `/api/...` 경로만 넘긴다.
// 계약(CONTRACT 7장)은 활성 분석 결과가 없으면 503 과
// { "error": { "code": "NO_ACTIVE_ANALYSIS", "message": ... } } 를 내도록 정해 두었다.
// 화면은 이 코드를 보고 빈 화면 대신 "아직 준비되지 않은 직무" 안내를 띄운다.

import { apiUrl } from '../data/api'
import { normalizeUserFacingCopy } from '../data/userFacingCopy'

export const NO_ACTIVE_ANALYSIS = 'NO_ACTIVE_ANALYSIS'
export const UNSUPPORTED_JOB = 'UNSUPPORTED_JOB'

// 아직 분석 결과가 없는 직무를 뜻하는 코드. 서버 전환 전에는 400 UNSUPPORTED_JOB 이 같은 뜻으로 온다.
const NOT_READY_CODES = new Set([NO_ACTIVE_ANALYSIS, UNSUPPORTED_JOB, 'EMPTY_DATASET'])

export function isJobNotReady(code) {
  return NOT_READY_CODES.has(code)
}

export async function fetchJson(path, options) {
  const res = await fetch(apiUrl(path), options)
  // 본문이 비었거나 JSON 이 아닐 수도 있다. 그 경우는 null 로 두고 상태 코드만 쓴다.
  const body = normalizeUserFacingCopy(await res.json().catch(() => null))
  if (!res.ok) {
    const error = new Error(body?.error?.message || `HTTP ${res.status}`)
    error.code = body?.error?.code || `HTTP_${res.status}`
    error.status = res.status
    throw error
  }
  return body
}
