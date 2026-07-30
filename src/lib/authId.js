// 아이디 + 비밀번호 인증(PRD v2.0 §1)의 순수 로직 — 아이디 정규화/유효성 검사, 아이디↔인증용 이메일
// 매핑, 로그인 실패 잠금.
//
// [왜 "합성 이메일" 매핑인가]
// PRD FR-1.3은 "로그인 이후의 세션/토큰 발급과 데이터 접근 권한 체계는 기존 구조 그대로 유지"를 못박고
// 있다. 이 앱의 데이터 접근 제어는 전부 Supabase RLS의 `auth.uid()`에 걸려 있고(supabase/schema.sql),
// 세션 저장·갱신도 supabase-js가 담당한다. 그래서 인증 "수단"만 갈아끼우는 가장 안전한 방법은,
// Supabase Auth(GoTrue)를 그대로 쓰되 사용자에게는 아이디만 받고 내부적으로 `<아이디>@ID_EMAIL_DOMAIN`
// 이라는 고정 규칙의 이메일로 변환해 넘기는 것이다. 그 결과:
//   · 비밀번호는 GoTrue가 bcrypt로 해싱해 저장한다 → FR-1.4(해시 저장 필수)를 코드 추가 없이 충족.
//   · auth.users / auth.uid() / RLS 정책 / meals·profiles 스키마가 한 줄도 바뀌지 않는다 → FR-1.3 충족.
//   · 이메일 컬럼의 UNIQUE 제약이 그대로 "아이디 중복 방지"가 된다.
// 이 도메인 주소로는 메일을 보내지도, 받지도 않는다(Supabase 대시보드에서 이메일 확인을 꺼야 한다 —
// supabase/migrations/2026-07-22_id-password-auth.sql 머리말 참고). 사용자에게는 어디에도 노출되지 않는
// 내부 식별자일 뿐이다.
//
// [대안이었던 방식과 기각 사유]
// 자체 users 테이블 + pgcrypto crypt()로 직접 해싱하고 RPC로 토큰을 발급하는 방식도 가능하지만,
// auth.uid()가 비게 되어 RLS 정책 8개·리더보드 SECURITY DEFINER 함수·세션 갱신까지 전부 다시 만들어야
// 한다. "인증 수단만 교체"라는 PRD 제약을 정면으로 어기고, 직접 만든 토큰 체계가 GoTrue보다 안전할
// 이유도 없어 기각했다.

import { get, set } from './storage.js'

// 인증 내부용 합성 이메일의 도메인. 실제로 메일을 주고받지 않는 네임스페이스지만, 일부 이메일 형식
// 검증기가 알 수 없는 TLD를 거부하는 경우가 있어 실재하는 TLD를 쓴다. 바꿔야 한다면 이 한 줄만 고치면
// 되지만, 이미 가입한 계정의 로그인이 전부 깨지므로 운영 중에는 절대 바꾸지 말 것.
// 안정성 점검(Phase B) — 이 파일 밖에서 이 상수를 쓰는 곳이 없어 export를 뗐다(이 파일 안에서는 계속 쓴다).
const ID_EMAIL_DOMAIN = 'mealyze.app'

// PRD FR-1.1: 영문 소문자 + 숫자, 4~20자.
const LOGIN_ID_RE = /^[a-z0-9]{4,20}$/
// PRD FR-1.1: 8자 이상, 영문+숫자 조합(둘 다 최소 1자 이상 포함).
const PASSWORD_MIN_LENGTH = 8
const NICKNAME_MAX_LENGTH = 12

export function normalizeLoginId(raw) {
  return String(raw ?? '').trim().toLowerCase()
}

// 유효하면 null, 아니면 화면에 그대로 띄울 인라인 에러 문구를 반환한다(모든 검증 함수 공통 규약).
export function validateLoginId(loginId) {
  if (!loginId) return '아이디를 입력해주세요.'
  if (!LOGIN_ID_RE.test(loginId)) return '아이디는 영문 소문자와 숫자 4~20자로 입력해주세요.'
  return null
}

export function validatePassword(password) {
  if (!password) return '비밀번호를 입력해주세요.'
  if (password.length < PASSWORD_MIN_LENGTH) return '비밀번호는 8자 이상이어야 해요.'
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) return '비밀번호에 영문과 숫자를 모두 포함해주세요.'
  return null
}

export function validatePasswordConfirm(password, passwordConfirm) {
  if (!passwordConfirm) return '비밀번호를 한 번 더 입력해주세요.'
  if (password !== passwordConfirm) return '비밀번호가 일치하지 않습니다.'
  return null
}

export function validateNickname(nickname) {
  const trimmed = String(nickname ?? '').trim()
  if (!trimmed) return '닉네임을 입력해주세요.'
  if (trimmed.length > NICKNAME_MAX_LENGTH) return `닉네임은 ${NICKNAME_MAX_LENGTH}자 이하로 입력해주세요.`
  return null
}

export function loginIdToEmail(loginId) {
  return `${normalizeLoginId(loginId)}@${ID_EMAIL_DOMAIN}`
}

// 세션에 남아있는 인증용 이메일에서 화면에 보여줄 아이디를 되돌린다. user_metadata.login_id가 있으면
// 그쪽이 우선이고(닉네임 표시 로직 참고), 이건 그게 없을 때를 위한 폴백이다.
export function emailToLoginId(email) {
  const value = String(email ?? '')
  const at = value.lastIndexOf('@')
  return at === -1 ? value : value.slice(0, at)
}

// 세션 사용자 객체에서 화면에 표시할 이름을 고른다: 닉네임 > 아이디 > 이메일 앞부분.
export function displayNameOf(user) {
  const meta = user?.user_metadata ?? {}
  return meta.nickname || meta.login_id || emailToLoginId(user?.email)
}

// ── 로그인 실패 잠금 (PRD FR-1.2: 동일 아이디 연속 5회 실패 → 1분 잠금) ──────────────
// 브라우저 로컬 카운터라 "이 기기에서의 무차별 대입"만 막는다 — 진짜 방어선은 Supabase Auth가 서버에서
// 거는 요청 제한이고, 이건 그 앞단에서 사람이 오타를 반복하는 흔한 경우를 즉시 잡아 서버 호출 자체를
// 줄이는 UX 레벨의 최소 방어다(PRD도 "무차별 대입 최소 방어"로 규정). 아이디별로 카운트해, 다른 아이디
// 로그인은 막지 않는다.
const LOCK_STATE_KEY = 'loginAttempts'
export const LOGIN_FAIL_LIMIT = 5
export const LOGIN_LOCK_MS = 60 * 1000

function readLockState() {
  const state = get(LOCK_STATE_KEY, {})
  return state && typeof state === 'object' ? state : {}
}

// 남은 잠금 시간(ms). 잠겨있지 않으면 0.
export function getLockRemainingMs(loginId, now = Date.now()) {
  const entry = readLockState()[normalizeLoginId(loginId)]
  if (!entry?.lockedUntil) return 0
  return Math.max(0, entry.lockedUntil - now)
}

// 실패 1회 기록. 한도에 도달하면 잠금 시각을 찍고 카운터를 리셋한다(잠금이 풀린 뒤 곧바로 5회를 다시
// 채워야 재잠금되게). 갱신된 남은 잠금 시간(ms)을 반환한다.
export function recordLoginFailure(loginId, now = Date.now()) {
  const key = normalizeLoginId(loginId)
  const state = readLockState()
  const count = (state[key]?.count ?? 0) + 1

  if (count >= LOGIN_FAIL_LIMIT) {
    state[key] = { count: 0, lockedUntil: now + LOGIN_LOCK_MS }
  } else {
    state[key] = { count, lockedUntil: 0 }
  }

  set(LOCK_STATE_KEY, state)
  return state[key].lockedUntil ? state[key].lockedUntil - now : 0
}

export function clearLoginFailures(loginId) {
  const key = normalizeLoginId(loginId)
  const state = readLockState()
  if (!(key in state)) return
  delete state[key]
  set(LOCK_STATE_KEY, state)
}

export function formatLockMessage(remainingMs) {
  const seconds = Math.max(1, Math.ceil(remainingMs / 1000))
  return `로그인 시도가 너무 많아요. ${seconds}초 후에 다시 시도해주세요.`
}
