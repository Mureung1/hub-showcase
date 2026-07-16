// 언코 도메인 데이터 + 헬퍼 — 커스텀 DSL 프로토타입에서 이식
import rawSits from './situations.json';
import meta from './meta.json';
import type { Situation, AxisKey, Scores, Persona } from './types';

export const SITUATIONS = rawSits as Situation[];

export interface Axis {
  key: AxisKey;
  num: string;
  name: string;
  desc: string;
  weight: number;
}

// 3축 (가중치: 맥락 40 / 격식 30 / 전략 30 — context가 최상위 축)
export const AXES: Axis[] = (meta.AXES as Omit<Axis, 'weight'>[]).map((a) => ({
  ...a,
  weight: (meta.AXIS_WEIGHT as Record<string, number>)[a.key],
}));

export const LEVELS: Record<number, { label: string }> = {
  1: { label: '위험' },
  2: { label: '무난' },
  3: { label: '적절' },
};

export const REL_HINTS: Record<string, string> = meta.REL_HINTS as Record<string, string>;

/** 온보딩 직업/역할 (title, 한 줄 설명) */
export const ROLES: [string, string][] = [
  ['대학생', '교수·조교·조원 사이의 격식 혼선'],
  ['대학원생', '지도교수·학회·행정 메일의 부담'],
  ['취준생', '처음 겪는 사회 격식 글이 두렵다'],
  ['사회초년생', '상사·거래처 메신저의 매 순간'],
  ['프리랜서·자영업', '클라이언트와의 거리 조절이 어렵다'],
  ['경력·이직', '새 조직의 말결이 낯설다'],
  ['간호사·의료직', '환자·보호자·의료진 사이의 감정과 정확성'],
  ['교사·강사', '학부모·학생·관리자 사이의 줄타기'],
  ['개발자·IT', '기획·비개발자에게 기술을 옮기는 말'],
  ['영업·세일즈', '고객·상사·거래처를 동시에 상대'],
  ['공무원·공공', '민원인과 상급기관 사이의 공적 언어'],
  ['디자이너·크리에이터', '모호한 피드백과 무리한 요구의 조율'],
];

export const AGES = ['10대', '20대', '30대', '40대', '50대 이상'];
export const GENDERS = ['여성', '남성', '밝히지 않음'];

export function getSituation(id: string, custom: Situation[] = []): Situation | undefined {
  return SITUATIONS.find((s) => s.id === id) || custom.find((s) => s.id === id);
}

/** 총점 0~100 (각 축 1~3을 가중 합산) */
export function totalOf(scores: Scores): number {
  return Math.round(AXES.reduce((t, ax) => t + (scores[ax.key] / 3) * ax.weight, 0));
}

/** 상대 페르소나(아바타 이모지·이름·색) — rel/counterpart 키워드로 결정 */
export function personaOf(sit: { rel?: string; counterpart?: string }): Persona {
  const rel = sit?.rel || '';
  const cp = sit?.counterpart || '';
  const s = rel + ' ' + cp;
  let emoji = '👤';
  let color = '#5b6b7a';
  if (/교수|지도|학회/.test(s)) { emoji = '🎓'; color = '#2e6da8'; }
  else if (/상사|팀장|상급|대표|사장|점장/.test(s)) { emoji = '💼'; color = '#3d5a80'; }
  else if (/거래처|파트너|바이어|협력사|클라이언트/.test(s)) { emoji = '🤝'; color = '#3d7d5f'; }
  else if (/고객|불만|컴플|구매자|손님|구독|팬/.test(s)) { emoji = '🙎'; color = '#b98a2f'; }
  else if (/인사|채용|면접|담당자/.test(s)) { emoji = '🧑‍💼'; color = '#2c3e50'; }
  else if (/의사|환자|보호자|간호/.test(s)) { emoji = '🩺'; color = '#2e8b62'; }
  else if (/조교|행정|공무|민원|주민/.test(s)) { emoji = '📋'; color = '#6b6a64'; }
  else if (/부서|팀 채널|채널/.test(s)) { emoji = '👥'; color = '#5b6b7a'; }
  else if (/후배|신입|조원|동료|학생|친구|또래/.test(s)) { emoji = '🧑'; color = '#4a86c5'; }
  const name = (rel || cp.split('(')[0].split('—')[0].trim() || '상대').slice(0, 22);
  return { name, emoji, color };
}

/** 상대 답장을 사람처럼 여러 말풍선으로 분할 (최대 3개) */
export function splitBubbles(text: string): string[] {
  const parts = String(text)
    .split(/(?<=[.!?~…])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const merged: string[] = [];
  for (const p of parts) {
    if (merged.length && p.length < 4) merged[merged.length - 1] += ' ' + p;
    else merged.push(p);
  }
  return merged.slice(0, 3);
}
