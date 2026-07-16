// 언코 도메인 타입 — 커스텀 DSL 프로토타입에서 이식한 데이터 모델

export type Medium = 'chat' | 'post' | 'email';
export type AxisKey = 'context' | 'register' | 'strategy';

/** 3축 점수 (각 1~3: 1 위험 · 2 무난 · 3 적절) */
export type Scores = Record<AxisKey, number>;

/** 상황별 채점 기준. 각 축 [1점 위험, 2점 무난, 3점 적절] */
export interface Rubric {
  context: string[];
  register: string[];
  strategy: string[];
}

export interface Situation {
  id: string;
  roles?: string[];
  rel: string;
  title: string;
  counterpart: string;
  goal: string;
  tension: string;
  direction?: string;
  axis: string;
  sample?: string;
  opener?: string | null;
  medium?: Medium;
  ctx?: boolean;
  background?: string;
  rubric?: Rubric;
  who?: string;
}

export interface Persona {
  name: string;
  emoji: string;
  color: string;
}

/** 대화 스레드 한 항목 */
export interface ThreadItem {
  from: 'me' | 'them';
  text: string;
  subject?: string;
}

/** 감점 근거 */
export interface Deduction {
  axis: AxisKey;
  quote: string;
  why: string;
}

/** 한 번의 채점 결과 */
export interface Attempt {
  text: string;
  scores: Scores;
  reasons: Partial<Record<AxisKey, string>>;
  deductions: Deduction[];
  coach: string;
  fix: string;
  best: string | null;
  counterpartReply: string;
}

/** 궤적 세션 기록 */
export interface SessionRecord {
  d: string;          // 'M.D' 표시 문자열
  sid: string;        // situation id
  scores: Scores;
}

/** 표현 자산 (잘 쓴 순간) */
export interface AssetRecord {
  id: string;
  text: string;
  sid: string;
  date: string;
}

export interface Profile {
  role: string;
  age?: string;
  gender?: string;
  goal?: string;
}

/** 앱 상태 blob (Postgres app_state.data / 클라이언트 저장 단위) */
export interface AppStateBlob {
  profile: Profile | null;
  history: SessionRecord[];
  assets: AssetRecord[];
  customSits: Situation[];
}
