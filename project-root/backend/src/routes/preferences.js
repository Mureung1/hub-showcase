const express = require('express');

// 자유 텍스트 → 카테고리 폼과 동일한 조건 객체(JSON) 추출.
// 조합 탐색/검증은 여전히 frontend/src/algo/recommendTimetable.js가 담당한다 —
// LLM은 "조건 해석"까지만, 실제 시간표 생성은 결정론적 알고리즘 (할루시네이션 방지).
// responseJsonSchema는 표준 JSON Schema(anyOf 포함)를 그대로 받는다.
const CONDITION_SCHEMA = {
  type: 'object',
  properties: {
    freeDays: {
      type: 'array',
      items: { type: 'string', enum: ['월', '화', '수', '목', '금'] },
    },
    avoidMorning: { anyOf: [{ type: 'boolean' }, { type: 'null' }] },
    targetCredit: { anyOf: [{ type: 'integer' }, { type: 'null' }] },
    teamPreferred: { anyOf: [{ type: 'boolean' }, { type: 'null' }] },
  },
  required: ['freeDays', 'avoidMorning', 'targetCredit', 'teamPreferred'],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `대학생 시간표 추천 서비스의 조건 입력을 돕는 도우미입니다.
사용자가 한국어로 자유롭게 쓴 시간표 조건 설명에서 다음 항목을 추출하세요:
- freeDays: 공강을 원하는 요일 목록 (월~금 중, 언급 없으면 빈 배열)
- avoidMorning: 오전 수업을 피하고 싶어하면 true, 명시적으로 원하면 false, 언급 없으면 null
- targetCredit: 목표 총 이수학점 숫자. 언급 없으면 null
- teamPreferred: 팀플 수업을 선호하면 true, 피하고 싶어하면 false, 언급 없으면 null
텍스트에 없는 정보는 추측하지 말고 null(또는 빈 배열)로 두세요.`;

// supabase 클라이언트와 같은 이유로 gemini 클라이언트를 인자로 받는다
// (테스트에서 mock 클라이언트를 그대로 주입할 수 있도록).
module.exports = function createPreferencesRouter(gemini) {
  const router = express.Router();

  router.post('/parse', async (req, res) => {
    const { freeText } = req.body;

    if (!freeText || typeof freeText !== 'string' || !freeText.trim()) {
      return res.status(400).json({ error: 'freeText는 필수입니다.' });
    }

    if (!gemini) {
      return res.status(503).json({ error: '자유 텍스트 조건 해석 기능이 아직 설정되지 않았습니다.' });
    }

    try {
      const response = await gemini.models.generateContent({
        model: 'gemini-flash-latest',
        contents: freeText,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          responseJsonSchema: CONDITION_SCHEMA,
        },
      });

      const conditions = JSON.parse(response.text);
      res.json(conditions);
    } catch (err) {
      console.error('자유 텍스트 조건 해석 실패:', err);
      res.status(502).json({ error: '조건을 해석하지 못했어요. 잠시 후 다시 시도해주세요.' });
    }
  });

  return router;
};
