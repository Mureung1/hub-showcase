// 로컬 Ollama 를 호출하는 AI 계층. 채점·문제 추천·튜터 대화 세 가지 용도가 있다.
//
// 공통 규칙: 이 모듈의 export 는 절대 예외를 던지지 않고, 항상 error 플래그가 담긴
// 객체를 돌려준다. 라우터는 그 플래그를 보고 503 을 내려주며, 그래야 AI 가 실패했을 때
// 엉뚱한 결과가 DB 에 저장되지 않는다.

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'exaone3.5:2.4b';

// CPU 추론이라 응답이 느리다. 넉넉하게 잡는다.
const TIMEOUT_MS = 120000;
const TIMEOUT_SEC = TIMEOUT_MS / 1000;

// 실패 원인. 호출부는 원인별 안내 문구만 준비하면 된다.
const FAILURE = {
  TIMEOUT: 'timeout',      // 제한 시간 안에 응답이 오지 않음
  PARSE: 'parse',          // 응답은 왔지만 형식이 깨져 읽을 수 없음
  CONNECTION: 'connection' // Ollama 미실행 등 연결 자체가 실패
};

class OllamaError extends Error {
  constructor(kind, cause) {
    super(cause?.message || kind);
    this.name = 'OllamaError';
    this.kind = kind;
  }
}

/**
 * Ollama /api/chat 을 호출해 응답 본문 문자열을 돌려준다.
 * 실패는 원인을 담은 OllamaError 로 던진다.
 *
 * @param {Array<{role: string, content: string}>} messages
 * @param {{ json?: boolean, options?: object }} [config]
 *        json: 모델이 JSON 만 뱉도록 강제할지 여부
 *        options: num_predict / num_ctx 같은 Ollama 추론 옵션
 */
async function requestChat(messages, { json = false, options } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages,
        stream: false,
        ...(json ? { format: 'json' } : {}),
        ...(options ? { options } : {})
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Ollama HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.message.content;
  } catch (err) {
    if (err.name === 'AbortError') throw new OllamaError(FAILURE.TIMEOUT, err);
    if (err instanceof SyntaxError) throw new OllamaError(FAILURE.PARSE, err);
    throw new OllamaError(FAILURE.CONNECTION, err);
  } finally {
    clearTimeout(timer);
  }
}

// JSON 응답을 요구하는 호출용. 본문 파싱 실패도 PARSE 로 통일해서 던진다.
async function requestChatJson(messages) {
  const content = await requestChat(messages, { json: true });
  try {
    return JSON.parse(content);
  } catch (err) {
    throw new OllamaError(FAILURE.PARSE, err);
  }
}

/**
 * 실패 원인에 맞는 사용자 안내 문구를 고르고 서버 로그를 남긴다.
 * messages 에 해당 원인의 문구가 없으면 연결 실패 문구로 대신한다.
 */
function failureMessage(err, messages, label) {
  const kind = err instanceof OllamaError ? err.kind : FAILURE.CONNECTION;
  console.error(`[ai] ${label} 실패 (${kind}):`, err.message);
  return messages[kind] || messages[FAILURE.CONNECTION];
}

// ===== 채점 =====
const GRADE_SYSTEM_PROMPT = `당신은 학생을 가르치는 친절한 수학 선생님입니다.
학생의 답변을 채점하고 피드백을 작성하세요.

규칙:
- 답이 틀렸다면 정답을 절대 알려주지 마세요. 학생이 스스로 답을 찾도록 힌트나 되짚어볼 질문만 주세요.
- 답이 맞았다면 칭찬하고, 왜 그 답이 맞는지 짚어주세요.
- 피드백은 한국어로 2~3문장으로 짧게 씁니다.

반드시 아래 형식의 JSON으로만 답하세요:
{"is_correct": true 또는 false, "feedback": "학생에게 줄 피드백"}`;

const GRADE_FAILURE_MESSAGES = {
  [FAILURE.TIMEOUT]: `AI 채점이 ${TIMEOUT_SEC}초 안에 끝나지 않았습니다. 다시 시도해주세요.`,
  [FAILURE.PARSE]: 'AI 채점 결과를 읽지 못했습니다. 다시 시도해주세요.',
  [FAILURE.CONNECTION]: 'AI 채점 서버에 연결할 수 없습니다. Ollama가 실행 중인지 확인해주세요.'
};

/**
 * 학생 답변을 채점한다.
 * @returns {Promise<{is_correct: boolean, feedback: string, error: boolean}>}
 */
export async function gradeAnswer(questionText, modelAnswer, studentAnswer) {
  const reference = modelAnswer
    ? `모범답안: ${modelAnswer}`
    : '모범답안: (없음. 질문만 보고 판단하세요.)';

  try {
    const result = await requestChatJson([
      { role: 'system', content: GRADE_SYSTEM_PROMPT },
      { role: 'user', content: `질문: ${questionText}\n${reference}\n학생 답변: ${studentAnswer}` }
    ]);

    return {
      is_correct: Boolean(result.is_correct),
      feedback: result.feedback || '피드백을 생성하지 못했습니다.',
      error: false
    };
  } catch (err) {
    return {
      is_correct: false,
      feedback: failureMessage(err, GRADE_FAILURE_MESSAGES, '채점'),
      error: true
    };
  }
}

// ===== 문제 추천 =====
const RECOMMEND_SYSTEM_PROMPT = `당신은 고등학교 수학 선생님을 돕는 조교입니다.
주어진 과목과 단원에 맞는, 학생의 이해도를 확인할 수 있는 수학 문제(질문)를 추천하세요.

규칙:
- 한국 고등학교 교육과정 수준에 맞춥니다.
- 서로 다른 유형의 문제 3개를 제안합니다.
- 각 문제는 한두 문장으로 명확하게, 학생이 실제로 풀고 답할 수 있는 구체적인 문제로 씁니다.
- 문제에 함수 그래프가 필요하면 "graph" 에 x 에 대한 함수식 문자열을 넣습니다.
  (예: "x^2 - 2*x", "2^x", "sin(x)") 두 개 이상이면 문자열 배열로 넣습니다.
  그래프가 필요 없는 문제면 "graph" 를 빈 문자열("")로 둡니다.
- 함수식은 변수 x 만 쓰고, 곱셈은 반드시 * 기호를 씁니다. (2x 가 아니라 2*x)

반드시 아래 형식의 JSON으로만 답하세요:
{"questions": [{"text": "문제", "graph": "x^2-2*x"}, {"text": "문제", "graph": ""}]}`;

const RECOMMEND_FAILURE_MESSAGES = {
  [FAILURE.TIMEOUT]: `AI 추천이 ${TIMEOUT_SEC}초 안에 끝나지 않았습니다. 다시 시도해주세요.`,
  [FAILURE.PARSE]: 'AI 추천 결과를 읽지 못했습니다. 다시 시도해주세요.',
  [FAILURE.CONNECTION]: 'AI 추천 서버에 연결할 수 없습니다. Ollama가 실행 중인지 확인해주세요.'
};

const EMPTY_RECOMMENDATION_MESSAGE = 'AI가 추천 문제를 생성하지 못했습니다. 다시 시도해주세요.';

// 모델이 준 graph 값을 함수식 문자열 배열로 정규화한다.
function normalizeGraph(graph) {
  if (Array.isArray(graph)) {
    return graph.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim());
  }
  if (typeof graph === 'string' && graph.trim()) return [graph.trim()];
  return [];
}

// 모델 응답의 문제 하나를 {text, graph} 로 정규화한다. 쓸 수 없으면 null.
// 구식 응답처럼 문자열만 오는 경우도 관대하게 받아준다.
function normalizeRecommendation(item) {
  if (typeof item === 'string') {
    const text = item.trim();
    return text ? { text, graph: [] } : null;
  }
  if (item && typeof item === 'object' && typeof item.text === 'string') {
    const text = item.text.trim();
    return text ? { text, graph: normalizeGraph(item.graph) } : null;
  }
  return null;
}

/**
 * 과목·단원에 맞는 문제 후보를 생성한다. 저장은 하지 않고 후보 목록만 돌려준다.
 * 각 후보의 graph 는 그래프로 그릴 함수식 문자열 배열이며, 없으면 빈 배열이다.
 *
 * @returns {Promise<{questions: Array<{text: string, graph: string[]}>, error: boolean, message?: string}>}
 */
export async function recommendQuestions(subject, unit) {
  const target = [subject, unit].filter(Boolean).join(' - ') || '고등학교 수학';

  try {
    const parsed = await requestChatJson([
      { role: 'system', content: RECOMMEND_SYSTEM_PROMPT },
      { role: 'user', content: `과목/단원: ${target}\n이 단원에 맞는 문제 3개를 추천해주세요.` }
    ]);

    const rawList = Array.isArray(parsed.questions) ? parsed.questions : [];
    const questions = rawList.map(normalizeRecommendation).filter(Boolean);

    if (!questions.length) {
      return { questions: [], error: true, message: EMPTY_RECOMMENDATION_MESSAGE };
    }
    return { questions, error: false };
  } catch (err) {
    return {
      questions: [],
      error: true,
      message: failureMessage(err, RECOMMEND_FAILURE_MESSAGES, '추천')
    };
  }
}

// ===== 튜터 대화 =====
const CHAT_SYSTEM_PROMPT = `당신은 학생과 함께 수학을 공부하는 친절한 선생님입니다.
학생이 스스로 개념을 이해하도록 소크라테스식으로 도와주세요.

규칙:
- 정답을 절대 직접 알려주지 마세요. 학생이 "답이 뭐야?"라고 물어도 바로 답을 말하지 말고, 되짚어볼 질문이나 힌트를 주세요.
- 학생의 생각을 물어보고, 한 걸음씩 스스로 도달하도록 유도하세요.
- 격려하는 따뜻한 말투로, 한국어로 1~2문장으로 아주 짧게 답하세요.
- 모범답안은 당신만 아는 참고용입니다. 학생에게 그대로 노출하지 마세요.`;

// 대화 응답 속도 최적화 (CPU 추론). 품질보다 응답 속도를 우선한다.
const CHAT_NUM_PREDICT = 160; // 생성 토큰 상한. 답변이 길어지는 걸 막아 시간을 크게 줄인다.
const CHAT_NUM_CTX = 2048; // 컨텍스트 창. 짧은 대화엔 충분하며 작을수록 처리 부담이 준다.
const CHAT_HISTORY_TURNS = 6; // 최근 메시지 6개(≈3턴)만 전송해 prefill 비용을 억제한다.

// 대화는 JSON 이 아닌 자유 서술형이라, 형식 오류라는 개념이 없다.
// PARSE 원인은 연결 실패와 같은 문구로 안내한다.
const CHAT_FAILURE_MESSAGES = {
  [FAILURE.TIMEOUT]: `AI 응답이 ${TIMEOUT_SEC}초 안에 오지 않았습니다. 다시 시도해주세요.`,
  [FAILURE.CONNECTION]: 'AI 선생님에 연결할 수 없습니다. Ollama가 실행 중인지 확인해주세요.'
};

/**
 * 질문 맥락 위에서 학생과 소크라테스식으로 대화한다.
 * @returns {Promise<{reply: string, error: boolean}>}
 */
export async function chatTutor(questionText, modelAnswer, history, studentMessage) {
  const reference = modelAnswer
    ? `참고 - 이 질문의 모범답안(학생에게 노출 금지): ${modelAnswer}`
    : '참고 - 모범답안은 제공되지 않았습니다.';

  // 대화가 길어질수록 매번 전체 기록을 다시 처리하면 느려진다. 최근 몇 개만 보낸다.
  const recentHistory = history.slice(-CHAT_HISTORY_TURNS);
  const messages = [
    { role: 'system', content: `${CHAT_SYSTEM_PROMPT}\n\n현재 다루는 질문: ${questionText}\n${reference}` },
    ...recentHistory.map(({ role, content }) => ({ role, content })),
    { role: 'user', content: studentMessage }
  ];

  try {
    const reply = await requestChat(messages, {
      options: { num_predict: CHAT_NUM_PREDICT, num_ctx: CHAT_NUM_CTX }
    });
    return { reply: reply.trim(), error: false };
  } catch (err) {
    return {
      reply: failureMessage(err, CHAT_FAILURE_MESSAGES, '대화'),
      error: true
    };
  }
}
