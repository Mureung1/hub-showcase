require('dotenv').config();
const { GoogleGenAI, Type } = require('@google/genai');

const geminiApiKey = process.env.GEMINI_API_KEY;

if (!geminiApiKey) {
  console.error('❌ ERROR: .env 파일에 GEMINI_API_KEY를 설정해주세요.');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: geminiApiKey });

async function testGemini() {
  console.log('🔄 Gemini API 연결 및 responseSchema 테스트 중...');

  try {
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-flash-latest',
      contents: '문장: "이 서비스는 너무 느려서 답답해요." 이 문장의 감정을 분류해줘.',
      config: {
        temperature: 0.1,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sentiment: { type: Type.STRING, enum: ['positive', 'negative', 'neutral'] },
            reason: { type: Type.STRING },
          },
          required: ['sentiment', 'reason'],
        },
      },
    });

    const text = response.text;
    const parsed = JSON.parse(text);
    console.log('✅ 성공! 스키마에 맞는 JSON 응답:', parsed);
  } catch (err) {
    console.error('❌ ERROR: Gemini 호출 실패', err.message);
  }
}

testGemini();
