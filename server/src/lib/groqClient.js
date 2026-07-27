const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'llama-3.3-70b-versatile'
const TIMEOUT_MS = 10000
const MAX_RETRIES = 1 // 언어 검증 실패 시 재시도 횟수(총 시도는 이 값 + 1)

// 이 프로젝트는 항상 한국어 응답만 허용한다. 허용 문자(전부 \u 이스케이프로 명시해 오타 위험을 없앰):
// 한글 음절(가-힣), 한글 자모(ᄀ-ᇿ, ㄰-㆏), 기본 ASCII(영문·숫자·기호·공백,
// \x20-\x7E), 프로젝트 전반에서 이미 쓰는 문장부호(가운뎃점 ·, 대시 –—,
// 곡선 따옴표 ‘’“”, 줄임표 …).
const ALLOWED_TEXT_PATTERN =
  /^[\s\x20-\x7E·–—‘’“”…가-힣ᄀ-ᇿ㄰-㆏]*$/

function collectStrings(value, acc = []) {
  if (typeof value === 'string') acc.push(value)
  else if (Array.isArray(value)) value.forEach((v) => collectStrings(v, acc))
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => collectStrings(v, acc))
  return acc
}

// 응답 JSON의 모든 문자열 값에 한자·키릴 문자·일본어 가나 등 허용되지 않은 문자가 섞였는지 검사.
function hasForeignChars(parsed) {
  return collectStrings(parsed).some((s) => !ALLOWED_TEXT_PATTERN.test(s))
}

async function callGroqOnce(messages) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  let res
  try {
    res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }

  if (!res.ok) {
    throw new Error(`Groq API 오류: ${res.status}`)
  }

  const body = await res.json()
  const content = body.choices?.[0]?.message?.content
  if (!content) throw new Error('Groq 응답에 content가 없어요')

  return JSON.parse(content)
}

// Groq(OpenAI 호환) chat completions 호출 — JSON 객체 응답을 강제하고 파싱까지 해서 반환.
// 응답 문자열에 한글·기본 ASCII 외의 문자(한자, 키릴 문자, 가나 등)가 섞여 있으면 한 번 재시도하고,
// 재시도 응답도 섞여 있으면 예외를 던진다 — 실패(타임아웃·네트워크·형식 오류·언어 혼입)는 모두
// 호출부에서 동일하게 폴백 처리한다.
export async function chatJSON(messages) {
  let lastResult
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    lastResult = await callGroqOnce(messages)
    if (!hasForeignChars(lastResult)) return lastResult
  }
  throw new Error('Groq 응답에 허용되지 않은 문자가 섞여 있어요')
}
