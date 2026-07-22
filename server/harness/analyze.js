// ─────────────────────────────────────────────────────────────
//  하네스 본체 — 공고 + 프로필 → LLM → 파싱 → 검증 → 결과.
//  최소 형태(YAGNI): 엔진은 claude -p 하나, 재생성 루프는 아직 없음(필요할 때 추가).
// ─────────────────────────────────────────────────────────────
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { validate } from './validate.js'
import { JOB_SCHEMA } from './schema.js'

const run = promisify(execFile)

// 1) 프롬프트 조립 — 프로필 + 공고 + "이 스키마로만 답해" + 정직성 규칙
function buildPrompt(profile, jd) {
  return `너는 정직한 커리어 갭 분석가다. 아래 프로필과 공고를 비교해,
반드시 아래 JSON 스키마 모양의 JSON "하나만" 출력하라. 코드블록·설명·다른 말 금지.

[정직성 규칙]
- 근거 없으면 충족(strong/ok) 금지 → weak 또는 gap.
- AI가 작성한 코드는 구현 근거로 약하게 취급. aiBar는 코드 근거(repo)가 있는 항목에만.
- 개념(이해) ≫ 구현(직접코딩). impl%는 보수적으로.

[출력 JSON 스키마]
${JSON.stringify(JOB_SCHEMA)}

[내 프로필]
${profile}

[공고]
${jd}`
}

// 2) 엔진 호출 — claude -p 를 서브프로세스로 실행, stdout(답 텍스트) 반환
async function callClaude(prompt) {
  const { stdout } = await run('claude', ['-p', prompt], { maxBuffer: 20 * 1024 * 1024 })
  return stdout.trim()
}

// 3) 본체 — 생성 → JSON 파싱 → 검증 → 결과
export async function analyze(profile, jd) {
  const prompt = buildPrompt(profile, jd)
  const raw = await callClaude(prompt)

  let job
  try {
    job = JSON.parse(raw)
  } catch {
    return { ok: false, error: 'JSON 파싱 실패', raw } // 모양부터 깨졌으면 여기서 끝
  }

  const violations = validate(job) // 우리 정직성 검증기
  return { ok: violations.length === 0, job, violations }
}
