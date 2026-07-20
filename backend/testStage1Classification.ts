import 'dotenv/config';
import { randomUUID } from 'crypto';
import { Type } from '@google/genai';
import { generateStructuredJson } from './src/lib/geminiClient';

// Task 2 설계 문서(README/AI_Pipeline_Design.md)의 1단계 스키마를 그대로 옮겨 수동 검증한다.

const stage1SystemInstruction = `당신은 PM의 가설 검증 인터뷰 분석을 돕는 분류 보조자입니다.

역할: 주어진 인터뷰 전사문에서, 각 발언이 어떤 가설과 관련이 있는지 분류합니다.
당신은 분류만 수행하며, 가설이 맞는지 틀리는지 해석하거나 판단하지 않습니다.

규칙:
1. quote는 전사문에 실제로 존재하는 문장을 원문 그대로(글자 단위로 동일하게) 인용해야 합니다.
   요약하거나 표현을 바꾸지 마세요.
2. hypothesis_id는 반드시 입력으로 주어진 가설 목록의 id 중 하나를 그대로 사용해야 합니다.
   새로운 id를 만들거나 추측하지 마세요.
3. speaker는 전사문에 표기된 화자 라벨을 그대로 사용하세요. 화자 라벨이 없는 발언이면
   빈 문자열로 두세요. 화자를 추측해 만들어내지 마세요.
4. badge_label은 그 발언이 해당 가설에 대해 어떤 성격의 근거인지만 표시합니다
   ("지지 근거" / "반박 근거" / "참고 정보" 중 하나). 근거가 얼마나 강한지, 가설이
   맞는지는 판단하지 마세요 — 그것은 다음 단계의 몫입니다.
5. 어떤 가설과도 명확히 관련 없는 발언은 포함하지 마세요. 관련 발언이 하나도 없는
   가설이 있다면, 그 가설에 대해서는 아무 항목도 만들지 마세요(빈 배열 허용).
6. 한 발언이 여러 가설과 관련되면 각 가설마다 별도 항목으로 만드세요.`;

const stage1ResponseSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      hypothesis_id: { type: Type.STRING },
      quote: { type: Type.STRING },
      speaker: { type: Type.STRING },
      badge_label: { type: Type.STRING, enum: ['지지 근거', '반박 근거', '참고 정보'] },
    },
    required: ['hypothesis_id', 'quote', 'speaker', 'badge_label'],
  },
};

interface Stage1Item {
  hypothesis_id: string;
  quote: string;
  speaker: string;
  badge_label: string;
}

async function main() {
  const hypotheses = [
    { hypothesis_id: randomUUID(), cause: '랜딩페이지 메시지가 명확하지 않다.', effect: '사용자가 서비스 가치를 이해하지 못한다.' },
    { hypothesis_id: randomUUID(), cause: 'CTA 버튼이 눈에 잘 띄지 않는다.', effect: '가입 클릭률이 낮아진다.' },
  ];

  const transcript = `지연: 처음 페이지 들어왔을 때 이게 무슨 서비스인지 한번에 이해가 안 됐어요. 설명이 너무 추상적이었어요.
민수: 저는 오히려 버튼 색깔이 배경이랑 비슷해서 어디를 눌러야 할지 못 찾았어요.
지연: 맞아요, 저도 가입 버튼을 찾는 데 좀 헤맸어요.
민수: 그거 말고는 로딩 속도는 빠른 편이라 좋았어요.`;

  const prompt = `## 가설 목록\n${JSON.stringify(hypotheses, null, 2)}\n\n## 전사문\n${transcript}`;

  const result = await generateStructuredJson<Stage1Item[]>({
    systemInstruction: stage1SystemInstruction,
    prompt,
    responseSchema: stage1ResponseSchema as any,
    temperature: 0.1,
  });

  console.log('--- Gemini 1단계 응답 ---');
  console.log(JSON.stringify(result, null, 2));

  const validHypothesisIds = new Set(hypotheses.map((h) => h.hypothesis_id));
  let allPass = true;

  for (const item of result) {
    const idOk = validHypothesisIds.has(item.hypothesis_id);
    const quoteOk = transcript.includes(item.quote);
    if (!idOk) {
      allPass = false;
      console.log(`❌ hypothesis_id 불일치: ${item.hypothesis_id}`);
    }
    if (!quoteOk) {
      allPass = false;
      console.log(`❌ quote가 원문에 없음: "${item.quote}"`);
    }
  }

  console.log(allPass ? '\n✅ 모든 항목이 hypothesis_id 매칭 및 원문 대조를 통과했습니다.' : '\n❌ 일부 항목이 검증에 실패했습니다.');
}

main().catch((err) => {
  console.error('❌ ERROR:', err.message);
  process.exit(1);
});
