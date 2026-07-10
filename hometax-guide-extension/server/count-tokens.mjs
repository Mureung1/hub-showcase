// 공식 Anthropic count_tokens API로 /api/next-step 프롬프트의 실제 토큰 수를 재는 스크립트.
// buildPrompt()를 server.mjs에서 그대로 가져다 쓰므로, 실제 서버가 보내는 프롬프트와 100% 동일하다.
// 실행: npm run count-tokens  (hometax-guide-extension/server/.env에 ANTHROPIC_API_KEY 필요)
import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';
import { buildPrompt } from './server.mjs';

const MODEL = 'claude-sonnet-5';
// 2026-08-31까지 적용되는 도입가 (docs: Claude API 가격표 기준)
const INPUT_PRICE_PER_M = 2.0;
const OUTPUT_PRICE_PER_M = 10.0;
const ASSUMED_OUTPUT_TOKENS = 80; // JSON 응답 실측 관찰 기준 평균치

const scenarios = [
  {
    label: '평이한 경우 (환급금 조회 흐름, 요소 6개)',
    callsPerSession: 5,
    payload: {
      goal: '환급금 조회하고 싶어',
      currentUrl: 'https://www.hometax.go.kr/websquare/websquare.wq?w2xPath=/ui/pp/index_pp.xml',
      resultRowCount: 0,
      history: ['전체메뉴', '납부·고지·환급'],
      elements: [
        { index: 0, text: '전체메뉴', role: 'button' },
        { index: 1, text: '납부·고지·환급', role: 'tab' },
        { index: 2, text: '환급금 조회', role: 'link' },
        { index: 3, text: '조회', role: 'button' },
        { index: 4, text: '로그아웃', role: 'button' },
        { index: 5, text: '즐겨찾기', role: 'button' },
      ],
    },
  },
  {
    label: '최악의 경우 (전체메뉴 화면, 요소 70개 + 긴 이력)',
    callsPerSession: 12,
    payload: {
      goal: '환급금 조회하고 싶어',
      currentUrl: 'https://www.hometax.go.kr/websquare/websquare.wq?w2xPath=/ui/pp/index_pp.xml',
      resultRowCount: 0,
      history: ['전체메뉴', '납부·고지·환급', '환급금 조회', '조회', '전체메뉴', '현금영수증'],
      elements: Array.from({ length: 70 }, (_, i) => ({
        index: i,
        text: `메뉴 항목 ${i} 예시 텍스트`,
        role: i % 5 === 0 ? 'tab' : 'link',
      })),
    },
  },
];

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

for (const scenario of scenarios) {
  const prompt = buildPrompt(scenario.payload);

  // 이 프로젝트가 고정한 SDK 버전(0.32.x)에서는 count_tokens가 아직 beta 네임스페이스에 있음
  const { input_tokens } = await anthropic.beta.messages.countTokens({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
  });

  const inputCostPerCall = (input_tokens / 1_000_000) * INPUT_PRICE_PER_M;
  const outputCostPerCall = (ASSUMED_OUTPUT_TOKENS / 1_000_000) * OUTPUT_PRICE_PER_M;
  const costPerCall = inputCostPerCall + outputCostPerCall;
  const costPerSession = costPerCall * scenario.callsPerSession;

  console.log(`\n=== ${scenario.label} ===`);
  console.log(`실측 입력 토큰(콜당): ${input_tokens}`);
  console.log(`가정 출력 토큰(콜당): ${ASSUMED_OUTPUT_TOKENS}`);
  console.log(`콜당 비용: $${costPerCall.toFixed(6)}`);
  console.log(`세션당 비용 (${scenario.callsPerSession}콜 가정): $${costPerSession.toFixed(6)}`);
}
