// 언코 — Gemini 프록시 (Vercel / Netlify Functions 호환 시그니처)
//
// 목적: API 키를 브라우저에 내려보내지 않는다. 키는 서버 환경변수에만 둔다.
// 배포:
//   1) 이 파일을 프로젝트 루트의 api/gemini.js 에 둔다 (Vercel은 api/ 를 자동으로 함수로 인식).
//   2) 배포 환경변수에 GEMINI_API_KEY 를 설정한다.
//   3) 프론트엔드는 아무 설정도 필요 없다 — /api/gemini 를 자동으로 찾아 쓴다.
//
// 이 파일이 없는 정적 호스팅(GitHub Pages 등)에서는 프론트엔드가 404를 보고
// "방문자가 자기 키를 입력하는 모드"로 자동 폴백한다.

const ALLOWED_MODELS = new Set(['gemini-2.5-flash', 'gemini-2.5-pro']);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: { message: 'POST만 허용됩니다.' } });
    return;
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    res.status(500).json({ error: { message: '서버에 GEMINI_API_KEY 환경변수가 설정되지 않았습니다.' } });
    return;
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  const { model, ...payload } = body;

  // 모델명을 그대로 URL에 넣으므로 화이트리스트로 제한한다(경로 조작·임의 모델 호출 방지).
  if (!ALLOWED_MODELS.has(model)) {
    res.status(400).json({ error: { message: `허용되지 않은 모델입니다: ${model}` } });
    return;
  }

  try {
    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify(payload),
      }
    );
    const text = await upstream.text();
    // 상태코드와 본문을 그대로 통과시킨다 — 프론트엔드가 429의 retryDelay를 읽어
    // 자동 재시도할 수 있어야 하기 때문이다.
    res.status(upstream.status);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.send(text);
  } catch (e) {
    res.status(502).json({ error: { message: `Gemini 연결 실패: ${e && e.message}` } });
  }
};
