// server/src/controllers/chatController.js
const { GoogleGenAI } = require('@google/genai');
const { toolDeclarations } = require('../chat/toolDeclarations');
const { executeTool } = require('../chat/toolHandlers');
const { SYSTEM_PROMPT } = require('../chat/systemPrompt');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
// gemini-3.5-flash는 free tier RPD가 20으로 너무 낮아서 금방 소진됨.
// gemini-2.5-flash-lite는 이 API 키 기준 "신규 사용자에게 더 이상 제공되지 않음"(404)
// 이라 대신 같은 3.5 세대의 lite 버전(gemini-3.5-flash-lite)으로 전환 — 실제 이 키로
// generateContent 호출 성공 확인함. lite 계열은 같은 세대 flash보다 무료 할당량이 넉넉하다.
const MODEL = 'gemini-3.5-flash-lite';
const MAX_TOOL_LOOPS = 5; // 모델이 tool 호출을 무한 반복하는 걸 막는 안전장치

exports.postChat = async (req, res) => {
  const {
    message,
    targets,
    progressSubmitted,
    basketCourses = [],
    track,
    currentSemester,
  } = req.body;

  if (!message || !targets) {
    return res.status(400).json({ error: 'message와 targets는 필수입니다.' });
  }

  // 이번 요청의 상태 스냅샷. 서버는 이걸 저장하지 않고 응답 후 그대로 버린다(stateless) —
  // client가 매 요청마다 localStorage에 있는 값을 그대로 실어 보내는 방식으로 가기로 했다.
  // completedCourses는 과목별 리스트로 넘어오지 않는다 — 이미 이수한 학점은
  // progressSubmitted(총점/전공/교양 숫자 합계)로만 받는다.
  const ctx = { targets, progressSubmitted, basketCourses, track, currentSemester };

  const contents = [{ role: 'user', parts: [{ text: message }] }];

  try {
    for (let i = 0; i < MAX_TOOL_LOOPS; i++) {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          tools: [{ functionDeclarations: toolDeclarations }],
        },
      });

      const calls = response.functionCalls;
      if (!calls || calls.length === 0) {
        return res.status(200).json({ reply: response.text ?? '' });
      }

      // 모델이 이번 턴에 요청한 함수 호출(들)을 히스토리에 그대로 남긴다
      contents.push(response.candidates[0].content);

      // 각 함수 호출을 실제 계산 엔진으로 실행하고, 결과를 다음 턴에 실어 보낸다
      const responseParts = calls.map((call) => {
        try {
          const result = executeTool(call.name, call.args, ctx);
          return { functionResponse: { name: call.name, response: { output: result } } };
        } catch (err) {
          return { functionResponse: { name: call.name, response: { error: err.message } } };
        }
      });
      contents.push({ role: 'user', parts: responseParts });
    }

    return res.status(500).json({ error: 'tool 호출이 너무 많이 반복되었습니다.' });
  } catch (err) {
    console.error('chat 처리 실패:', err);
    return res.status(500).json({ error: err.message });
  }
};
