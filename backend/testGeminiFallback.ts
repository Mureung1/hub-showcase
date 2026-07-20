import 'dotenv/config';
import { Type } from '@google/genai';
import { generateStructuredJson } from './src/lib/geminiClient';

// 폴백 로직 수동 검증: 현재 .env의 GEMINI_MODEL(쿼터가 거의 소진된 모델)로 호출했을 때
// 429/503이 나면 GEMINI_FALLBACK_MODELS로 자동 전환되어 결국 성공하는지 확인한다.

async function main() {
  const result = await generateStructuredJson<{ ok: boolean }>({
    systemInstruction: '입력과 무관하게 항상 { "ok": true }만 반환하세요.',
    prompt: 'ping',
    responseSchema: {
      type: Type.OBJECT,
      properties: { ok: { type: Type.BOOLEAN } },
      required: ['ok'],
    } as never,
  });
  console.log('✅ 최종 응답:', result);
}

main().catch((err) => {
  console.error('❌ ERROR:', err.message);
  process.exit(1);
});
