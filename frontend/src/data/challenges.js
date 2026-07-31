// 챌린지 시드. 운영자가 큐레이션하므로 별도 DB 테이블 없이 프론트 시드로 둔다(기획서 §3.3).
// - kind: 'reverse'(기존 게임 역기획) | 'forward'(오리지널 순기획)
// - criteria: AI 자동 채점 기준(rubric). [{ label, weight, hint }] — weight 합 100.
//   배점을 공개해야 참가자가 어디에 힘을 줄지 알 수 있고, 같은 배점이 AI 채점에도 그대로 쓰인다.
// - exampleTopics: 이 챌린지에서 다룰 만한 소재(막막함 해소)
// - exampleDocId: "예시 확인하기"가 여는 완성 예시 문서 id
// - gameTag: 역기획 챌린지의 대상 게임 — 장르 렌즈 도출 + 참가 시 에디터 프리필에 쓴다
// - difficulty: 입문 | 중급 | 심화
// 문서는 documents.challenge_id 로 챌린지에 연결된다.

export const challenges = [
  // ── 진행 중(동시 개최 4개) ────────────────────────────────
  {
    id: 'ch-zelda',
    status: 'ongoing',
    kind: 'reverse',
    difficulty: '중급',
    title: '젤다의 전설 BotW — 사당(Shrine) 설계를 역기획하라',
    description:
      '텍스트 튜토리얼 없이 퍼즐 하나를 가르치는 소형 레벨, 사당. 한 사당을 골라 공간 구조·메커닉 도입 순서·유도 설계를 분해하고, "왜 이 순서로 가르치는가"를 추론해 보세요.',
    templateId: 'level',
    gameTag: '젤다의 전설: 브레스 오브 더 와일드',
    systemTag: '사당 설계',
    category: '진행·레벨',
    criteria: [
      {
        label: '구조 분해의 명료성',
        weight: 30,
        hint: '사당을 구역(도입·연습·응용·시험)으로 나누고 각 구역의 역할을 붙이면 만점에 가깝습니다.',
      },
      {
        label: '학습 곡선 설계 파악',
        weight: 30,
        hint: '"무엇을 먼저 안전하게 보여주고, 언제 위험을 얹는가"를 순서대로 쓰세요.',
      },
      {
        label: '유도·시선 분석',
        weight: 20,
        hint: '조명·색·구도 중 무엇이 시선을 끌었는지 근거를 대면 점수가 올라갑니다.',
      },
      {
        label: '개선 제안의 근거',
        weight: 20,
        hint: '"불편하다"가 아니라 "의도는 A로 보이는데 그걸 해치지 않고 B를 고칠 수 있다" 구조로.',
      },
    ],
    exampleTopics: [
      '초반 사당 3곳을 나란히 놓고 가르치는 순서 비교',
      '전투 사당 vs 퍼즐 사당 — 같은 틀로 다른 경험을 만드는 법',
      '구슬 옮기기 계열 사당의 난이도 상승 방식',
      '"시련 없는 축복" 사당이 존재하는 이유',
    ],
    exampleDocId: '862768b7-8137-4018-b933-00b6b71282dd',
    startAt: '2026-07-14',
    submitDeadline: '2026-08-14',
    feedbackDeadline: '2026-08-21',
  },
  {
    id: 'ch-hades',
    status: 'ongoing',
    kind: 'reverse',
    difficulty: '심화',
    title: '하데스 — 신의 은총(빌드) 시스템을 역기획하라',
    description:
      '매 시도마다 다시 조립되는 일회성 빌드가 어떻게 반복을 지루하지 않게 만드는가. 은총의 획득·조합·시너지 규칙을 정리하고, 리플레이를 지탱하는 설계 의도를 추론해 보세요.',
    templateId: 'system',
    gameTag: '하데스',
    systemTag: '신의 은총(빌드)',
    category: '성장·강화',
    criteria: [
      {
        label: '규칙·수치 구체성',
        weight: 30,
        hint: '은총 등급·중첩·희귀도를 조건과 함께. 모르면 "체감상 약 N%(실측 필요)"로 추정임을 밝히세요.',
      },
      {
        label: '빌드 다양성 분석',
        weight: 25,
        hint: '어떤 조합이 강해지고 왜 그런지, 선택이 실제로 갈리는 지점을 짚으세요.',
      },
      {
        label: '반복성(리플레이) 관점',
        weight: 25,
        hint: '매 런이 달라지게 만드는 장치와, 그럼에도 지루해지는 구간을 함께 다루면 좋습니다.',
      },
      {
        label: '설계 의도 추론',
        weight: 20,
        hint: '관찰에서 멈추지 말고 "왜 이렇게 만들었을까"를 한 문단 이상.',
      },
    ],
    exampleTopics: [
      '신 4명의 은총을 놓고 "역할 겹침"을 어떻게 피했는지',
      '듀오 은총이 빌드 목표를 만드는 방식',
      '희귀도(일반~전설) 승급이 기대값에 미치는 영향',
      '거울(영구 성장)과 은총(일회성)의 역할 분담',
    ],
    exampleDocId: '2ef03572-104b-4dc9-b48a-4a52a46e035e',
    startAt: '2026-07-14',
    submitDeadline: '2026-08-14',
    feedbackDeadline: '2026-08-21',
  },
  {
    id: 'ch-pitch',
    status: 'ongoing',
    kind: 'forward',
    difficulty: '입문',
    title: '원페이지 피치 — "10분 만에 이해되는 게임"을 제안하라',
    description:
      '한 문장으로 설명되고, 처음 10분 안에 핵심 재미가 전달되는 오리지널 게임을 제안해 보세요. 길게 쓰지 말고, 한 줄 소개·디자인 필러·차별점·안 할 것으로 승부하세요.',
    templateId: 'pitch',
    category: '콘셉트·피치',
    criteria: [
      {
        label: '피치 명확성',
        weight: 30,
        hint: '한 줄 소개만 읽고도 무슨 게임인지 그려져야 합니다. 장르+핵심 행동을 한 문장에.',
      },
      {
        label: '차별성(USP)',
        weight: 30,
        hint: '"레퍼런스 나열"이 아니라 그와 결정적으로 다른 한 가지를 콕 집으세요.',
      },
      {
        label: '실현가능성·스코프',
        weight: 20,
        hint: '"안 할 것"을 구체적으로 적을수록 점수가 올라갑니다. 스코프 방어가 곧 실력입니다.',
      },
      {
        label: '재미 가설',
        weight: 20,
        hint: '"왜 재밌는가"를 한 장면으로 묘사하세요 — 가장 신나는 30초를 적으면 좋습니다.',
      },
    ],
    exampleTopics: [
      '일상 소재(낚시·요리·청소)를 한 판 20분 구조로 바꾸기',
      '기존 장르 하나에 규칙 한 줄만 더해 비틀기',
      '"안 할 것"부터 정하고 거꾸로 설계하기',
      '혼자가 아니라 둘이어야만 되는 이유 만들기',
    ],
    exampleDocId: 'doc-pitch-tidefisher',
    startAt: '2026-07-14',
    submitDeadline: '2026-08-07',
    feedbackDeadline: '2026-08-14',
  },
  {
    id: 'ch-loop',
    status: 'ongoing',
    kind: 'forward',
    difficulty: '중급',
    title: '핵심 루프 설계 — "한 가지 행동으로 30분 붙잡기"',
    description:
      '단 하나의 반복 행동으로 30분을 몰입시킬 수 있는 코어 루프를 설계하세요. 무엇을 반복하고, 어떤 보상·성장이 그 반복을 정당화하는지 한 방향으로 엮어 보세요.',
    templateId: 'gameplay',
    category: '메커닉·밸런스',
    criteria: [
      {
        label: '코어 루프 명료성',
        weight: 35,
        hint: '한 사이클이 몇 초/분인지, 무엇으로 시작해 무엇으로 끝나는지 단계로 쓰세요.',
      },
      {
        label: '성장·보상 연결',
        weight: 25,
        hint: '반복이 무엇을 남기는지(영구 성장·해금) 루프와 이어 붙이면 점수가 올라갑니다.',
      },
      {
        label: '반복 동기',
        weight: 20,
        hint: '"한 번 더" 하게 만드는 장치를 이름 붙여 설명하세요.',
      },
      {
        label: '내적 일관성',
        weight: 20,
        hint: '조작·시스템·목표가 서로 모순 없이 한 방향을 보는지 점검하세요.',
      },
    ],
    exampleTopics: [
      '단일 버튼 조작으로 깊이를 만드는 루프',
      '자원 하나(시간·기름·체력)로 모든 판단을 강제하기',
      '실패해도 전진하는 구조(영구 진행) 설계',
      '30분 세션을 3분 사이클 10회로 쪼개기',
    ],
    exampleDocId: 'doc-loop-lanternkeeper',
    startAt: '2026-07-14',
    submitDeadline: '2026-08-07',
    feedbackDeadline: '2026-08-14',
  },
  {
    id: 'ch-objective',
    status: 'ongoing',
    kind: 'reverse',
    difficulty: '중급',
    title: '리그 오브 레전드 — 드래곤·바론 오브젝트를 역기획하라',
    description:
      '라인전을 하다가도 특정 시각이 되면 다섯 명이 한곳으로 모인다. 시간표(스폰·리젠)와 보상(누적 스택·글로벌 버프)이 어떻게 팀 전체의 동선을 지휘하는지 분해하고, "왜 이 주기와 이 보상인가"를 추론해 보세요.',
    templateId: 'content',
    gameTag: '리그 오브 레전드',
    systemTag: '정글 · 오브젝트(드래곤/바론)',
    category: '진행·레벨',
    criteria: [
      {
        label: '타이머 · 리스폰 구조 파악',
        weight: 30,
        hint: '첫 스폰과 리젠 주기를 분 단위로 적고, 그 간격이 경기 흐름을 어떻게 끊고 잇는지 연결하세요.',
      },
      {
        label: '보상 설계와 누적 구조',
        weight: 30,
        hint: '드래곤 스택→영혼처럼 "쌓여야 커지는" 보상과, 바론처럼 "한 번에 크게 주고 사라지는" 보상을 구분해 다루면 만점에 가깝습니다.',
      },
      {
        label: '팀 행동 유도 분석',
        weight: 20,
        hint: '왜 다섯 명이 모이는지를 위험–보상 교환으로 설명하세요. 시야·소환사 주문 같은 준비 행동까지 짚으면 좋습니다.',
      },
      {
        label: '개선 제안의 근거',
        weight: 20,
        hint: '"기울어진 판이 답답하다"가 아니라 "의도는 A로 보이는데 그걸 해치지 않고 B를 고칠 수 있다" 구조로.',
      },
    ],
    exampleTopics: [
      '드래곤 4스택(영혼)이 만드는 "지금 아니면 안 되는" 순간',
      '바론 버프의 지속 시간과 미니언 강화가 굳히기에 기여하는 방식',
      '오브젝트 스폰 1분 전에 벌어지는 준비 행동(시야·귀환·소환사 주문)',
      '전령·아타칸처럼 초반 오브젝트가 라인전 밀도를 바꾸는 방식',
    ],
    startAt: '2026-07-31',
    submitDeadline: '2026-08-21',
    feedbackDeadline: '2026-08-28',
  },

  // ── 종료(리더보드·베스트 시연) ────────────────────────────
  {
    id: 'ch-1',
    status: 'ended',
    kind: 'reverse',
    difficulty: '입문',
    title: '내가 플레이하는 게임의 가챠 시스템을 역기획하라',
    description:
      '첫 번째 챌린지. 확률·천장·재화 흐름을 분해하고 "왜 이렇게 설계했는가"를 추론합니다. 같은 주제를 다룬 서로 다른 접근을 AI 점수와 함께 비교해 보세요.',
    templateId: 'system',
    criteria: [
      { label: '규칙·수치 구체성', weight: 30, hint: '확률·천장·비용을 조건과 함께.' },
      {
        label: '설계 의도 추론',
        weight: 30,
        hint: '관찰에서 멈추지 말고 왜 그렇게 만들었는지까지.',
      },
      { label: '예외 처리 질문', weight: 20, hint: '재화 부족·중단 등 경계 상황을 따져보세요.' },
      { label: '개선 제안의 근거', weight: 20, hint: '의도를 해치지 않는 개선안으로.' },
    ],
    exampleDocId: 'doc-genshin-gacha',
    startAt: '2026-06-15',
    submitDeadline: '2026-06-27',
    feedbackDeadline: '2026-07-04',
    submissionIds: ['doc-genshin-gacha', 'doc-bluearchive-gacha'],
    bestDocId: 'doc-genshin-gacha',
  },
]

export function getOngoingChallenge() {
  return challenges.find((c) => c.status === 'ongoing')
}

export function getChallenge(id) {
  return challenges.find((c) => c.id === id)
}

// D-day 계산. 시드 마감일은 고정이라 today는 실제 현재로 둔다(발표 시점에도 양수가 되게).
export function daysLeft(dateString, today = new Date()) {
  const diff = new Date(dateString).getTime() - today.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}
