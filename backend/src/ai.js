const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'exaone3.5:2.4b';

// CPU 추론이라 응답이 느리다. 넉넉하게 잡는다.
const TIMEOUT_MS = 120000;

const SYSTEM_PROMPT = `당신은 학생을 가르치는 친절한 수학 선생님입니다.
학생의 답변을 채점하고 피드백을 작성하세요.

규칙:
- 답이 틀렸다면 정답을 절대 알려주지 마세요. 학생이 스스로 답을 찾도록 힌트나 되짚어볼 질문만 주세요.
- 답이 맞았다면 칭찬하고, 왜 그 답이 맞는지 짚어주세요.
- 피드백은 한국어로 2~3문장으로 짧게 씁니다.

반드시 아래 형식의 JSON으로만 답하세요:
{"is_correct": true 또는 false, "feedback": "학생에게 줄 피드백"}`;

/**
 * 학생 답변을 Ollama로 채점한다.
 * Ollama가 없거나 응답이 이상해도 예외를 던지지 않고
 * error 플래그가 담긴 객체를 돌려준다.
 */
export async function gradeAnswer(questionText, modelAnswer, studentAnswer) {
  const reference = modelAnswer
    ? `모범답안: ${modelAnswer}`
    : '모범답안: (없음. 질문만 보고 판단하세요.)';
  const userPrompt = `질문: ${questionText}\n${reference}\n학생 답변: ${studentAnswer}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        stream: false,
        format: 'json'
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Ollama HTTP ${response.status}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.message.content);

    return {
      is_correct: Boolean(result.is_correct),
      feedback: result.feedback || '피드백을 생성하지 못했습니다.',
      error: false
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      return {
        is_correct: false,
        feedback: `AI 채점이 ${TIMEOUT_MS / 1000}초 안에 끝나지 않았습니다. 다시 시도해주세요.`,
        error: true
      };
    }
    if (err instanceof SyntaxError) {
      console.error('[ai] 응답 파싱 실패:', err.message);
      return {
        is_correct: false,
        feedback: 'AI 채점 결과를 읽지 못했습니다. 다시 시도해주세요.',
        error: true
      };
    }
    // fetch 연결 실패(Ollama 미실행 등) 포함
    console.error('[ai] 채점 요청 실패:', err.message);
    return {
      is_correct: false,
      feedback: 'AI 채점 서버에 연결할 수 없습니다. Ollama가 실행 중인지 확인해주세요.',
      error: true
    };
  } finally {
    clearTimeout(timer);
  }
}

const CHAT_SYSTEM_PROMPT = `당신은 학생과 함께 수학을 공부하는 친절한 선생님입니다.
학생이 스스로 개념을 이해하도록 소크라테스식으로 도와주세요.

규칙:
- 정답을 절대 직접 알려주지 마세요. 학생이 "답이 뭐야?"라고 물어도 바로 답을 말하지 말고, 되짚어볼 질문이나 힌트를 주세요.
- 학생의 생각을 물어보고, 한 걸음씩 스스로 도달하도록 유도하세요.
- 격려하는 따뜻한 말투로, 한국어로 2~4문장 정도로 짧게 답하세요.
- 모범답안은 당신만 아는 참고용입니다. 학생에게 그대로 노출하지 마세요.`;

/**
 * 질문 맥락 위에서 학생과 소크라테스식으로 대화한다.
 * gradeAnswer 와 달리 JSON이 아닌 자유 서술형 답변을 받는다.
 * 실패해도 예외를 던지지 않고 {reply, error} 를 반환한다.
 */
export async function chatTutor(questionText, modelAnswer, history, studentMessage) {
  const reference = modelAnswer
    ? `참고 - 이 질문의 모범답안(학생에게 노출 금지): ${modelAnswer}`
    : '참고 - 모범답안은 제공되지 않았습니다.';
  const contextPrompt = `${CHAT_SYSTEM_PROMPT}\n\n현재 다루는 질문: ${questionText}\n${reference}`;

  const messages = [
    { role: 'system', content: contextPrompt },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: studentMessage }
  ];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages,
        stream: false
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Ollama HTTP ${response.status}`);
    }

    const data = await response.json();
    return { reply: data.message.content.trim(), error: false };
  } catch (err) {
    if (err.name === 'AbortError') {
      return {
        reply: `AI 응답이 ${TIMEOUT_MS / 1000}초 안에 오지 않았습니다. 다시 시도해주세요.`,
        error: true
      };
    }
    console.error('[ai] 대화 요청 실패:', err.message);
    return {
      reply: 'AI 선생님에 연결할 수 없습니다. Ollama가 실행 중인지 확인해주세요.',
      error: true
    };
  } finally {
    clearTimeout(timer);
  }
}
