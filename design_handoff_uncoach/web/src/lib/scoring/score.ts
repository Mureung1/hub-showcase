// 채점 — 프로토타입 evaluate()를 서버(Claude structured outputs)로 이식.
// per-situation 루브릭 + 프로필 배경 + 대화 맥락을 프롬프트에 반영, 1~3 척도로 판정.
import Anthropic from '@anthropic-ai/sdk';
import { RUBRIC_SYSTEM } from './rubric-system';
import { AXES, totalOf } from '../domain/situations';
import type { Situation, ThreadItem, Attempt, AxisKey, Scores, Profile } from '../domain/types';

export const DEFAULT_MODEL = process.env.SCORING_MODEL || 'claude-opus-4-8';

export interface ScoreInput {
  situation: Situation;
  draft: string;
  thread?: ThreadItem[];
  profile?: Profile | null;
  emailSubject?: string;
}

const axisScore = { type: 'integer', enum: [1, 2, 3] } as const;

// Claude structured outputs 스키마 (프로토타입 evaluate 결과 구조와 동일)
export const SCORE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['scores', 'reasons', 'deductions', 'coach', 'fix', 'bestSentence', 'counterpartReply'],
  properties: {
    scores: {
      type: 'object',
      additionalProperties: false,
      required: ['context', 'register', 'strategy'],
      properties: { context: axisScore, register: axisScore, strategy: axisScore },
    },
    reasons: {
      type: 'object',
      additionalProperties: false,
      required: ['context', 'register', 'strategy'],
      properties: { context: { type: 'string' }, register: { type: 'string' }, strategy: { type: 'string' } },
    },
    deductions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['axis', 'quote', 'why'],
        properties: {
          axis: { type: 'string', enum: ['context', 'register', 'strategy'] },
          quote: { type: 'string' },
          why: { type: 'string' },
        },
      },
    },
    coach: { type: 'string' },
    fix: { type: 'string' },
    bestSentence: { type: ['string', 'null'] },
    counterpartReply: { type: 'string' },
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

let client: Anthropic | null = null;
function anthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('NO_KEY');
  if (!client) client = new Anthropic();
  return client;
}

/** Claude로 채점 (structured outputs). 반환은 프로토타입 Attempt 구조 + total. */
export async function scoreDraft(input: ScoreInput): Promise<Attempt & { total: number }> {
  const user = buildUserMessage(input);
  const stream = anthropic().messages.stream({
    model: DEFAULT_MODEL,
    max_tokens: 4096,
    thinking: { type: 'adaptive' }, // 화용 판단은 미묘하므로 적응형 사고
    system: RUBRIC_SYSTEM,
    messages: [{ role: 'user', content: user }],
    output_config: { format: { type: 'json_schema', schema: SCORE_SCHEMA } },
  });
  const msg = await stream.finalMessage();
  const textBlock = msg.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
  if (!textBlock) throw new Error('빈 응답: ' + (msg.stop_reason || '알 수 없음'));
  const out = JSON.parse(textBlock.text);

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
