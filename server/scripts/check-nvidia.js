// NVIDIA NIM API 연결 확인용 스모크 테스트.
// 실행: node scripts/check-nvidia.js
require('dotenv').config();

const BASE_URL = 'https://integrate.api.nvidia.com/v1';
const MODEL = process.env.NVIDIA_MODEL || 'meta/llama-3.3-70b-instruct';

async function main() {
  const key = process.env.NVIDIA_API_KEY;

  if (!key) {
    console.error('X NVIDIA_API_KEY 가 .env 에 없습니다.');
    process.exit(1);
  }
  if (!key.startsWith('nvapi-')) {
    console.error('X 키 형식이 이상합니다. nvapi- 로 시작해야 합니다.');
    process.exit(1);
  }
  console.log(`키 확인 OK (${key.slice(0, 10)}...)`);

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: '한 문장으로 자기소개 해줘.' }],
      max_tokens: 64,
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`X 요청 실패 (HTTP ${res.status})`);
    console.error(body.slice(0, 500));
    if (res.status === 401) console.error('-> 키가 잘못됐거나 만료됐습니다.');
    if (res.status === 404) console.error(`-> 모델명 확인 필요: ${MODEL}`);
    if (res.status === 429) console.error('-> rate limit 또는 크레딧 소진.');
    process.exit(1);
  }

  const data = await res.json();
  console.log(`모델: ${MODEL}`);
  console.log(`응답: ${data.choices?.[0]?.message?.content?.trim()}`);
  console.log(`토큰: ${JSON.stringify(data.usage)}`);
  console.log('OK - 연결 정상');
}

main().catch((err) => {
  console.error('X 예외 발생:', err.message);
  process.exit(1);
});
