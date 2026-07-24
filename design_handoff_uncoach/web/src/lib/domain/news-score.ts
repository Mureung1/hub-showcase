// 뉴스 요약 훈련 루브릭 — 대화·메일과 별개의 자체 채점표
//
// 대화·메일은 '상대에게 맞는 말'을 재는 3축(맥락·의도 / 관계·격식 / 전략·표현)을 쓴다. 뉴스 요약엔
// 상대가 없어서 그 축이 성립하지 않는다. 대신 요약이라는 과제 자체의 축을 쓴다:
//
//   ① 핵심 포착 40 — 가장 중요한 한 가지를 짚었는가
//   ② 사실 정확성 30 — 옮긴 내용이 기사와 맞는가
//   ③ 압축·표현 30 — 한눈에 읽히게 줄였는가
//
// 가중치를 40/30/30으로 맞춘 건 우연이 아니다. 저장은 기존 SessionRecord.scores(3칸)를 그대로 쓰고
// 총점 계산(totalOf)도 공유한다 — 궤적·통계·레벨이 전부 그 형식을 전제하기 때문. 슬롯 대응은
// toScores()에 있고, 화면에 보이는 축 이름은 항상 아래 NEWS_AXES를 쓴다.

import type { Scores } from './types';

export type NewsAxisKey = 'grasp' | 'accuracy' | 'concision';

/** 저장 슬롯 대응 — 가중치가 같은 축끼리 짝지었다(40↔40, 30↔30). */
const SLOT: Record<NewsAxisKey, keyof Scores> = {
  grasp: 'context',
  accuracy: 'register',
  concision: 'strategy',
};

export interface NewsAxis {
  key: NewsAxisKey;
  num: string;
  name: string;
  desc: string;
  weight: number;
  /** [1점, 2점, 3점] 채점 기준 */
  levels: [string, string, string];
}

export const NEWS_AXES: NewsAxis[] = [
  {
    key: 'grasp',
    num: '①',
    name: '핵심 포착',
    desc: '이 기사에서 가장 중요한 한 가지를 짚었는가',
    weight: 40,
    levels: [
      '곁가지를 핵심으로 잡았거나 사실만 나열했다',
      '방향은 맞지만 두루뭉술해 무엇이 중요한지 흐릿하다',
      '무슨 일이고 왜 중요한지를 정확히 짚었다',
    ],
  },
  {
    key: 'accuracy',
    num: '②',
    name: '사실 정확성',
    desc: '수치·주체·인과를 기사와 다르지 않게 옮겼는가',
    weight: 30,
    levels: [
      '기사에 없는 내용이거나 사실이 어긋난다',
      '큰 틀은 맞지만 수치·주체가 부정확하다',
      '옮긴 내용이 기사와 정확히 일치한다',
    ],
  },
  {
    key: 'concision',
    num: '③',
    name: '압축·표현',
    desc: '군더더기 없이 한눈에 읽히는 문장인가',
    weight: 30,
    levels: [
      '길게 늘어놓았거나 문장이 엉켜 읽히지 않는다',
      '뜻은 통하지만 군더더기가 남아 있다',
      '짧고 명료해 한 번에 읽힌다',
    ],
  },
];

export type NewsScores = Record<NewsAxisKey, number>;

/** 요약 가이드 기준: 3문장 이내 · 150자 이내 */
export const SUMMARY_MAX_LEN = 150;

/** 1~3 → 라벨. 대화·메일 피드백(위험/무난/적절)과 같은 3단계를 쓴다. */
export const NEWS_LEVEL_LABEL = ['-', '아쉬움', '무난', '적절'] as const;

/** 루브릭 점수를 저장용 3축 Scores로 (총점은 totalOf가 계산) */
export function toScores(n: NewsScores): Scores {
  return {
    [SLOT.grasp]: n.grasp,
    [SLOT.accuracy]: n.accuracy,
    [SLOT.concision]: n.concision,
  } as Scores;
}

/** 저장된 기록을 다시 뉴스 축으로 (기록 화면에서 축별로 되짚을 때) */
export function fromScores(s: Scores): NewsScores {
  return { grasp: s[SLOT.grasp], accuracy: s[SLOT.accuracy], concision: s[SLOT.concision] };
}

/**
 * 1~3 범위로 자른다. 모델이 0이나 5를 뱉어도 채점표가 깨지지 않게.
 * 값이 아예 없으면(null·"") 1점으로 깎지 말고 중간 2점 — Number(null)이 0이라 그냥 두면 최저점이 된다.
 */
export function clampLevel(v: unknown): number {
  if (v === null || v === undefined || v === "") return 2;
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(3, Math.max(1, n)) : 2;
}
