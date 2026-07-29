// 직무 카탈로그. 실제 목록의 단일 출처는 서버의 `GET /api/jobs` 이며(hooks/useJobs.js),
// 이 파일은 응답을 화면이 쓰는 형태로 정규화하는 규칙과, 서버를 못 부를 때의 대체 목록만 담는다.
//
// 화면이 쓰는 직무 한 건의 형태:
//   { job_role_id: 'backend', display_name: '백엔드 개발자' }
// job_role_id 는 API 요청에 실려 가는 식별자이고, display_name 은 사람에게 보이는 이름이다.

// 대체 목록 — 서버가 아직 안 떠 있거나 /api/jobs 가 실패했을 때만 쓴다.
// 값은 계약(CONTRACT 2장)과 마이그레이션 0011·0023 의 job_roles 아홉 종과 같다.
export const FALLBACK_JOBS = [
  { job_role_id: 'backend', display_name: '백엔드 개발자' },
  { job_role_id: 'frontend', display_name: '프론트엔드 개발자' },
  { job_role_id: 'ai_engineer', display_name: 'AI 엔지니어' },
  { job_role_id: 'data_engineer', display_name: '데이터 엔지니어' },
  { job_role_id: 'fullstack', display_name: '풀스택 개발자' },
  { job_role_id: 'devops', display_name: 'DevOps 엔지니어' },
  { job_role_id: 'mobile', display_name: '모바일 개발자' },
  { job_role_id: 'security', display_name: '정보보안' },
  { job_role_id: 'game_client', display_name: '게임 개발자' },
]

// 처음 화면에 올려 두는 직무. "이 직무만 지원한다"는 뜻이 아니라 선택 이전의 기본값이다.
export const DEFAULT_JOB = FALLBACK_JOBS[0]

// /api/jobs 응답을 화면 형태로 맞춘다.
// { jobs: [...] } 와 배열 응답을 모두 받아들이고, is_active 가 거짓인 직무는 뺀다.
export function normalizeJobs(payload) {
  const raw = Array.isArray(payload) ? payload : payload?.jobs
  if (!Array.isArray(raw)) return []
  return raw
    .filter((row) => row && row.job_role_id && row.is_active !== false)
    .map((row) => ({
      job_role_id: row.job_role_id,
      display_name: row.display_name || row.job_role_id,
    }))
}
