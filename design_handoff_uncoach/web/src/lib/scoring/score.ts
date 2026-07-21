// 채점 — 프로토타입 evaluate()를 서버(Gemini structured outputs)로 이식.
// per-situation 루브릭 + 프로필 배경 + 대화 맥락을 프롬프트에 반영, 1~3 척도로 판정.
// 예전 루트 프로토타입의 api/gemini.mjs 프록시와 동일한 모델을 이 서버에서 직접 호출한다(별도 프록시 불필요 — 여기가 이미 서버).
import { callGemini, extractText } from './gemini';
import { RUBRIC_SYSTEM } from './rubric-system';
import { AXES, totalOf } from '../domain/situations';
import type { Situation, ThreadItem, Attempt, AxisKey, Scores, Profile } from '../domain/types';

export const DEFAULT_MODEL = process.env.SCORING_MODEL || 'gemini-2.5-flash';

export interface ScoreInput {
  situation: Situation;
  draft: string;
  thread?: ThreadItem[];
  profile?: Profile | null;
  emailSubject?: string;
}

// Gemini REST generateContent의 responseSchema(OpenAPI 서브셋 — type은 대문자, additionalProperties 없음)
export const SCORE_SCHEMA = {
  type: 'OBJECT',
  required: ['scores', 'reasons', 'deductions', 'coach', 'fix', 'bestSentence', 'counterpartReply'],
  properties: {
    scores: {
      type: 'OBJECT',
      required: ['context', 'register', 'strategy'],
      properties: { context: { type: 'INTEGER' }, register: { type: 'INTEGER' }, strategy: { type: 'INTEGER' } },
    },
    reasons: {
      type: 'OBJECT',
      required: ['context', 'register', 'strategy'],
      properties: { context: { type: 'STRING' }, register: { type: 'STRING' }, strategy: { type: 'STRING' } },
    },
    deductions: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        required: ['axis', 'quote', 'why'],
        properties: {
          axis: { type: 'STRING', enum: ['context', 'register', 'strategy'] },
          quote: { type: 'STRING' },
          why: { type: 'STRING' },
        },
      },
    },
    coach: { type: 'STRING' },
    fix: { type: 'STRING' },
    bestSentence: { type: 'STRING', nullable: true },
    counterpartReply: { type: 'STRING' },
  },
} as const;

/** 채점용 user 메시지 조립 (프로토타입 evaluate 이식) */
export function buildUserMessage({ situation: sit, draft, thread = [], profile, emailSubject }: ScoreInput): string {
  const isEmail = sit.medium === 'email';
  let m = `[상황] ${sit.title}\n[상대(관계)] ${sit.rel} — ${sit.counterpart}\n[목적] ${sit.goal}\n[긴장 포인트] ${sit.tension}\n`;
  if (sit.direction) m += `[이 관계에서 '적절'의 방향] ${sit.direction}\n`;
  if (sit.rubric) {
    m += `[이 상황의 축별 채점 기준 — 이 기준을 최우선으로 적용하세요]\n`;
    for (const ax of AXES) {
      const r = sit.rubric[ax.key];
      if (r) m += `${ax.num} ${ax.name} — 1(위험): ${r[0]} / 2(무난): ${r[1]} / 3(적절): ${r[2]}\n`;
    }
  }
  if (profile && (profile.age || profile.role)) {
    m += `[작성자 배경 — 코칭의 눈높이·예시·말투를 이 사람에 맞추세요. 단, 채점 기준 자체는 동일] ${[profile.age, profile.role].filter(Boolean).join(' · ')}\n`;
  }
  if (sit.background) m += `[사건 배경 — 이 맥락에서 아래 글이 왜 문제였는지, 당신이 채점할 새 글이 적절한지 판단하세요] ${sit.background}\n`;
  if (thread.length) {
    m += `[지금까지의 대화]\n` + thread.map((t) => `${t.from === 'them' ? '상대' : '나'}: ${t.text}`).join('\n') + '\n';
  }
  if (isEmail) m += `[메일 제목 — 제목도 화용의 일부입니다] ${(emailSubject || '').trim() || '(제목 비어있음)'}\n`;
  m += `[채점할 내 ${isEmail ? '메일 본문' : '메시지'} — 위 대화의 다음 차례]\n"""\n${draft}\n"""\nJSON만 출력하세요.`;
  return m;
}

const clamp = (v: unknown) => Math.max(1, Math.min(3, Math.round(Number(v) || 1)));

/** Gemini로 채점 (structured outputs). 반환은 프로토타입 Attempt 구조 + total. */
export async function scoreDraft(input: ScoreInput): Promise<Attempt & { total: number }> {
  const user = buildUserMessage(input);
  const data = await callGemini(DEFAULT_MODEL, {
    system_instruction: { parts: [{ text: RUBRIC_SYSTEM }] },
    contents: [{ role: 'user', parts: [{ text: user }] }],
    generationConfig: { maxOutputTokens: 4096, responseMimeType: 'application/json', responseSchema: SCORE_SCHEMA },
  });
  const out = JSON.parse(extractText(data));

  const scores: Scores = {
    context: clamp(out.scores?.context),
    register: clamp(out.scores?.register),
    strategy: clamp(out.scores?.strategy),
  };
  const validAxis = (a: string): a is AxisKey => a === 'context' || a === 'register' || a === 'strategy';
  const deductions = (Array.isArray(out.deductions) ? out.deductions : [])
    .filter((d: { axis?: string; quote?: string }) => d && d.axis && validAxis(d.axis) && d.quote)
    .map((d: { axis: AxisKey; quote: string; why?: string }) => ({
      axis: d.axis,
      quote: String(d.quote).slice(0, 90),
      why: String(d.why || '').slice(0, 160),
    }));

  return {
    text: input.draft,
    scores,
    reasons: out.reasons || {},
    deductions,
    coach: out.coach || '',
    fix: out.fix || '',
    best: out.bestSentence && out.bestSentence !== 'null' ? out.bestSentence : null,
    counterpartReply: out.counterpartReply || '',
    total: totalOf(scores),
  };
}
