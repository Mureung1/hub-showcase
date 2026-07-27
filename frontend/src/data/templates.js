// 기획서 템플릿.
// - kind: 'reverse'(기존 게임 분석) | 'forward'(오리지널 기획안)
// - 각 섹션은 짧은 필드 여러 개(fields)로 구성한다. 긴 문단 하나를 요구하지 않는다(피로도↓).
//   fields: [{ key, label, placeholder, long? }]  — long이면 여러 줄 textarea, 아니면 한 줄 input.
// - fields가 없는 섹션(자유 양식·사용자 추가 섹션)은 예전처럼 content 문자열 하나를 쓴다(하위호환).
// 스키마는 기획서 §5의 sections(heading, fields|content, guide_key)와 대응한다.

export const templates = [
  // ─────────────────────────────────────────────────────────
  // 역기획 — 이미 나온 게임의 시스템/화면/구간을 기획자의 눈으로 분해한다.
  // ─────────────────────────────────────────────────────────
  {
    id: 'system',
    kind: 'reverse',
    name: '시스템 역기획',
    tagline: '규칙과 수치가 있는 시스템을 분해한다',
    examples: '강화 · 가챠 · 스킬 트리',
    sections: [
      {
        key: 'overview',
        heading: '개요',
        guide: '무엇을 왜 골랐는지 한 줄씩.',
        fields: [
          { key: 'target', label: '대상 시스템', placeholder: '예: 메이플 스타포스 강화' },
          { key: 'role', label: '게임 내 역할', placeholder: '예: 상위 장비 공급·가치 조절' },
          {
            key: 'hypothesis',
            label: '설계 의도 가설',
            placeholder: '왜 이렇게 만들었을까 (한 줄)',
          },
        ],
      },
      {
        key: 'rules',
        heading: '시스템 규칙',
        guide: '모호한 말 대신 수치·조건으로.',
        fields: [
          { key: 'core', label: '핵심 규칙', placeholder: '유저가 체감하는 규칙', long: true },
          { key: 'numbers', label: '핵심 수치·확률', placeholder: '예: 15→16성 약 30%(실측 필요)' },
        ],
      },
      {
        key: 'flow',
        heading: '유저 플로우',
        guide: '진입 → 반복 → 이탈.',
        fields: [
          { key: 'steps', label: '흐름', placeholder: '진입 동선과 반복 지점', long: true },
          { key: 'exit', label: '이탈 지점', placeholder: '유저가 어디서 멈추나' },
        ],
      },
      {
        key: 'data',
        heading: '데이터 구조',
        guide: '필요한 테이블·컬럼을 추정.',
        fields: [
          {
            key: 'tables',
            label: '테이블 · 컬럼',
            placeholder: '예: starforce_rate(stage, success, fail_destroy)',
            long: true,
          },
        ],
      },
      {
        key: 'balance',
        heading: '밸런스 · 수치',
        guide: '곡선과 그 뒤의 의도.',
        fields: [
          {
            key: 'curve',
            label: '난이도·비용 곡선',
            placeholder: '어디서 완만하고 어디서 급격한가',
          },
          { key: 'intent', label: '밸런싱 의도', placeholder: '그 변곡점이 노리는 유저 행동' },
        ],
      },
      {
        key: 'exceptions',
        heading: '예외 처리',
        guide: '경계 상황에서의 동작.',
        fields: [
          {
            key: 'edge',
            label: '경계 상황과 처리',
            placeholder: '재화 부족 / 연출 중 종료 / 최대치 등',
            long: true,
          },
        ],
      },
      {
        key: 'analysis',
        heading: '분석 · 개선',
        guide: '의도 추론 + 근거 있는 개선안.',
        fields: [
          { key: 'intent2', label: '설계 의도 추론', placeholder: '왜 이렇게 설계했나' },
          {
            key: 'improve',
            label: '개선 제안 + 근거',
            placeholder: '의도를 해치지 않는 개선',
            long: true,
          },
        ],
      },
    ],
  },
  {
    id: 'content',
    kind: 'reverse',
    name: '컨텐츠 역기획',
    tagline: '이벤트·던전 같은 컨텐츠의 구조와 보상을 해부한다',
    examples: '기간제 이벤트 · 던전/레이드 · 시즌 패스',
    sections: [
      {
        key: 'overview',
        heading: '개요',
        guide: '무엇을·어디에·누구를 위해.',
        fields: [
          { key: 'target', label: '대상 컨텐츠', placeholder: '예: 로스트아크 카오스 던전' },
          {
            key: 'position',
            label: '게임 내 위치',
            placeholder: '엔드컨텐츠 / 일일 숙제 / 이벤트',
          },
          { key: 'audience', label: '대상 유저층', placeholder: '예: 만렙 이후 성장 유저' },
        ],
      },
      {
        key: 'structure',
        heading: '컨텐츠 구조',
        guide: '입장·단계·제한.',
        fields: [
          { key: 'entry', label: '입장 조건', placeholder: '레벨·아이템·티켓 등' },
          { key: 'stages', label: '단계 구성', placeholder: '어떤 단위로 쪼개져 있나' },
          { key: 'limits', label: '제한', placeholder: '횟수 / 시간 / 주기' },
        ],
      },
      {
        key: 'flow',
        heading: '진행 플로우',
        guide: '흐름과 소요 시간·반복 주기.',
        fields: [
          {
            key: 'steps',
            label: '흐름',
            placeholder: '입장 → 진행 → 정산 → 재입장/종료',
            long: true,
          },
        ],
      },
      {
        key: 'reward',
        heading: '보상 설계',
        guide: '무엇을 얼마나, 성장 곡선 어디에.',
        fields: [
          {
            key: 'table',
            label: '보상 종류·수량·조건',
            placeholder: '표로 정리해도 좋음',
            long: true,
          },
          {
            key: 'hit',
            label: '성장 곡선 어디에 꽂히나',
            placeholder: '예: 주 성장재화의 약 40% 공급',
          },
        ],
      },
      {
        key: 'economy',
        heading: '경제 · BM 연결',
        guide: '푸는 재화 / 빨아들이는 재화 / 과금 접점.',
        fields: [
          {
            key: 'source_sink',
            label: '재화 공급 · 소모',
            placeholder: '무엇을 풀고 무엇을 빨아들이나',
          },
          { key: 'bm', label: '과금(BM) 접점', placeholder: '유료 상품과 만나는 지점' },
        ],
      },
      {
        key: 'retention',
        heading: '리텐션 훅',
        guide: '내일 다시 오게 하는 장치와 주기.',
        fields: [
          {
            key: 'hooks',
            label: '리텐션 장치',
            placeholder: '일일 초기화 / 연속 보상 / 시즌 마감',
            long: true,
          },
        ],
      },
      {
        key: 'exceptions',
        heading: '예외 처리',
        guide: '중도 이탈·종료 시 처리.',
        fields: [
          {
            key: 'edge',
            label: '경계 상황과 처리',
            placeholder: '중도 이탈 / 파티원 종료 / 보상 전 종료',
            long: true,
          },
        ],
      },
      {
        key: 'analysis',
        heading: '분석 · 개선',
        guide: '의도 추론 + 근거 있는 개선안.',
        fields: [
          { key: 'intent', label: '설계 의도 추론', placeholder: '왜 이 구조·보상인가' },
          { key: 'improve', label: '개선 제안 + 근거', placeholder: '', long: true },
        ],
      },
    ],
  },
  {
    id: 'uiux',
    kind: 'reverse',
    name: 'UI/UX 역기획',
    tagline: '화면 하나를 명세 수준으로 다시 그린다',
    examples: '상점 화면 · 인벤토리 · 강화 UI',
    sections: [
      {
        key: 'overview',
        heading: '개요',
        guide: '어떤 화면을, 언제 만나나.',
        fields: [
          { key: 'screen', label: '대상 화면', placeholder: '예: LoL 아이템 상점' },
          { key: 'when', label: '등장 시점', placeholder: '유저 여정에서 언제 나오나' },
        ],
      },
      {
        key: 'structure',
        heading: '화면 구조',
        guide: '영역으로 분해하고 요소 나열.',
        fields: [
          {
            key: 'areas',
            label: '영역 · 요소',
            placeholder: '좌: 카테고리 / 중앙: 그리드 / 우: 상세 …',
            long: true,
          },
        ],
      },
      {
        key: 'hierarchy',
        heading: '정보 위계',
        guide: '무엇을 먼저 보게 했나.',
        fields: [
          { key: 'first', label: '가장 먼저 보이는 것', placeholder: '크기·색·위치·대비로' },
          { key: 'flow', label: '시선 흐름', placeholder: '유저 시선이 흐르는 순서' },
        ],
      },
      {
        key: 'interaction',
        heading: '인터랙션',
        guide: '클릭·호버·드래그·단축키 반응.',
        fields: [
          {
            key: 'inputs',
            label: '입력별 반응',
            placeholder: '보조 동선(검색·정렬)도 포함',
            long: true,
          },
        ],
      },
      {
        key: 'feedback',
        heading: '피드백 · 모션',
        guide: '성공/실패/로딩/비활성 반응.',
        fields: [
          {
            key: 'states',
            label: '상태별 시청각 피드백',
            placeholder: '정보 전달인지 장식인지 구분',
            long: true,
          },
        ],
      },
      {
        key: 'states',
        heading: '상태 · 예외',
        guide: '부족/불가/빈 목록 등.',
        fields: [
          {
            key: 'edge',
            label: '상태별 UI 변화',
            placeholder: '골드 부족 / 판매 불가 / 인벤 가득 참',
            long: true,
          },
        ],
      },
      {
        key: 'analysis',
        heading: '개선 제안',
        guide: '의도 추론 + 사용성 개선안.',
        fields: [
          { key: 'intent', label: '설계 의도 추론', placeholder: '' },
          { key: 'improve', label: '개선 제안 + 근거', placeholder: '', long: true },
        ],
      },
    ],
  },
  {
    id: 'level',
    kind: 'reverse',
    name: '레벨 · 경험 설계 역기획',
    tagline: '플레이어가 겪는 순서와 리듬을 분해한다',
    examples: '테스트 챔버 · 스테이지 · 사당/던전 · 로그라이크 방 배치',
    sections: [
      {
        key: 'overview',
        heading: '개요',
        guide: '어떤 구간을, 전체에서 어디쯤.',
        fields: [
          { key: 'segment', label: '대상 구간', placeholder: '예: 포탈 테스트 챔버 6~10' },
          { key: 'position', label: '전체에서의 위치', placeholder: '몇 번째쯤, 어떤 역할' },
        ],
      },
      {
        key: 'structure',
        heading: '공간 · 구간 구조',
        guide: '구역으로 나누고 역할 붙이기.',
        fields: [
          {
            key: 'zones',
            label: '구역 · 역할',
            placeholder: '도입 / 연습 / 응용 / 시험',
            long: true,
          },
        ],
      },
      {
        key: 'teaching',
        heading: '메커닉 도입 · 학습',
        guide: '텍스트 없이 어떻게 가르치나.',
        fields: [
          {
            key: 'order',
            label: '가르치는 순서',
            placeholder: '안전한 연습 → 위험한 응용',
            long: true,
          },
        ],
      },
      {
        key: 'pacing',
        heading: '난이도 · 페이싱',
        guide: '긴장과 이완의 리듬.',
        fields: [
          {
            key: 'rhythm',
            label: '난이도 리듬',
            placeholder: '오르는 지점과 쉬어가는 지점',
            long: true,
          },
        ],
      },
      {
        key: 'guidance',
        heading: '유도 · 시선',
        guide: '다음 목적지를 무엇으로 알리나.',
        fields: [{ key: 'cues', label: '유도 장치', placeholder: '조명·색·구도·소리', long: true }],
      },
      {
        key: 'failure',
        heading: '실패와 재도전',
        guide: '실패 비용과 재시도 마찰.',
        fields: [
          { key: 'cost', label: '실패 비용', placeholder: '무엇을 잃나' },
          { key: 'checkpoint', label: '체크포인트 간격', placeholder: '어디서 다시 시작하나' },
        ],
      },
      {
        key: 'analysis',
        heading: '분석 · 개선',
        guide: '의도 추론 + 근거 있는 개선안.',
        fields: [
          { key: 'intent', label: '설계 의도 추론', placeholder: '' },
          { key: 'improve', label: '개선 제안 + 근거', placeholder: '', long: true },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────
  // 순기획 — 아직 없는 게임을 직접 설계한다(오리지널 기획안).
  // ─────────────────────────────────────────────────────────
  {
    id: 'pitch',
    kind: 'forward',
    name: '원페이지 피치',
    tagline: '한 장으로 끝내는 게임 소개 — 가장 가벼운 시작',
    examples: '아이디어 발표 · 콘셉트 검증 · 챌린지 제출',
    sections: [
      {
        key: 'identity',
        heading: '정체성',
        guide: '한 문장과 기본 정보.',
        fields: [
          {
            key: 'pitch',
            label: '한 줄 소개',
            placeholder: '이 게임을 한 문장으로 (엘리베이터 피치)',
          },
          { key: 'genre', label: '장르', placeholder: '예: 로그라이크 덱빌더' },
          { key: 'platform', label: '플랫폼', placeholder: 'PC / 모바일 / 콘솔' },
          { key: 'target', label: '타깃', placeholder: '예: 짧게 즐기는 코어 전략 게이머' },
        ],
      },
      {
        key: 'appeal',
        heading: '재미와 차별점',
        guide: '왜 재밌고 무엇이 다른가.',
        fields: [
          {
            key: 'pillars',
            label: '디자인 필러 (2~3)',
            placeholder: '주고 싶은 핵심 경험 2~3개',
            long: true,
          },
          { key: 'fun', label: '핵심 재미', placeholder: '가장 큰 한 방' },
          { key: 'usp', label: '차별점', placeholder: '기존 게임과 다른 점' },
          { key: 'nongoals', label: '안 할 것', placeholder: '일부러 넣지 않는 것(스코프 방어)' },
        ],
      },
    ],
  },
  {
    id: 'concept',
    kind: 'forward',
    name: '콘셉트 · 핵심 특징',
    tagline: '게임의 정체성과 차별화를 정리한다',
    examples: '콘셉트 문서 · 핵심 재미 정의',
    sections: [
      {
        key: 'summary',
        heading: '콘셉트',
        guide: '한 줄 콘셉트와 디자인 필러.',
        fields: [
          { key: 'logline', label: '한 줄 콘셉트', placeholder: '설계 판단의 기준이 될 한 문장' },
          {
            key: 'pillars',
            label: '디자인 필러',
            placeholder: '지켜야 할 핵심 경험 2~3개',
            long: true,
          },
        ],
      },
      {
        key: 'features',
        heading: '핵심 특징',
        guide: '핵심 재미와 차별화 포인트.',
        fields: [
          {
            key: 'core_fun',
            label: '핵심 재미 요소',
            placeholder: '무엇이 이 게임을 재밌게 하나',
            long: true,
          },
          { key: 'usp', label: '차별화 포인트', placeholder: '기존 게임과의 결정적 차이' },
        ],
      },
      {
        key: 'reference',
        heading: '레퍼런스',
        guide: '참고 게임과 그와의 차이.',
        fields: [
          { key: 'refs', label: '참고 게임', placeholder: '비슷한 게임 1~3개' },
          { key: 'diff', label: '그와의 차이', placeholder: '레퍼런스를 어떻게 비트나' },
        ],
      },
    ],
  },
  {
    id: 'world',
    kind: 'forward',
    name: '세계관 · 스토리',
    tagline: '배경·이야기·인물을 설계한다',
    examples: '세계관 설정 · 시나리오 개요',
    sections: [
      {
        key: 'setting',
        heading: '배경 설정',
        guide: '시대·장소·분위기.',
        fields: [
          { key: 'era_place', label: '배경', placeholder: '언제·어디서, 어떤 톤인가', long: true },
        ],
      },
      {
        key: 'story',
        heading: '주요 스토리',
        guide: '전체적인 흐름.',
        fields: [
          { key: 'arc', label: '이야기 흐름', placeholder: '시작 → 전개 → 목표', long: true },
        ],
      },
      {
        key: 'characters',
        heading: '주요 캐릭터',
        guide: '주인공·적대 세력·NPC.',
        fields: [
          { key: 'cast', label: '핵심 인물', placeholder: '역할과 동기 중심으로', long: true },
        ],
      },
    ],
  },
  {
    id: 'gameplay',
    kind: 'forward',
    name: '게임플레이 · 시스템',
    tagline: '무엇을 반복하고 어떻게 성장하나',
    examples: '핵심 루프 · 전투/성장 시스템',
    sections: [
      {
        key: 'loop',
        heading: '핵심 루프',
        guide: '반복되는 핵심 행동.',
        fields: [
          {
            key: 'core_loop',
            label: '코어 루프',
            placeholder: '몇 초~몇 분 단위로 반복되는 행동',
            long: true,
          },
        ],
      },
      {
        key: 'systems',
        heading: '주요 시스템',
        guide: '전투·탐험·성장 등.',
        fields: [
          {
            key: 'systems',
            label: '핵심 시스템',
            placeholder: '무엇으로 깊이를 만드나',
            long: true,
          },
        ],
      },
      {
        key: 'controls',
        heading: '조작 · 모드',
        guide: '조작 방식과 플레이 형태.',
        fields: [
          { key: 'controls', label: '조작 방식', placeholder: '터치 / 키보드+마우스 / 컨트롤러' },
          { key: 'mode', label: '싱글 / 멀티', placeholder: '싱글 / 협력 / PVP' },
        ],
      },
      {
        key: 'quests',
        heading: '미션 · 퀘스트',
        guide: '스토리 기반인가 자유 플레이인가.',
        fields: [
          { key: 'structure', label: '진행 구조', placeholder: '선형 스토리 / 오픈 자유도' },
        ],
      },
    ],
  },
  {
    id: 'bizmodel',
    kind: 'forward',
    name: '수익화 (BM)',
    tagline: '어떻게 벌고, 어떻게 공정함을 지키나',
    examples: '과금 구조 · 상품 설계',
    sections: [
      {
        key: 'model',
        heading: '과금 구조',
        guide: '유료/무료와 주요 상품.',
        fields: [
          { key: 'type', label: '판매 방식', placeholder: '유료 / 무료+IAP / 무료+광고' },
          {
            key: 'products',
            label: '주요 상품',
            placeholder: '스킨 / 배틀패스 / DLC …',
            long: true,
          },
        ],
      },
      {
        key: 'fairness',
        heading: '공정성',
        guide: '페이 투 윈 경계와 가치 제안.',
        fields: [
          { key: 'balance', label: 'P2W 경계', placeholder: '성능을 파는가, 편의·외형을 파는가' },
          { key: 'value', label: '과금 가치', placeholder: '돈을 낼 이유를 한 줄로' },
        ],
      },
    ],
  },

  // 자유 양식 — 백지에서 시작. 섹션을 직접 설계한다(예전처럼 content 하나).
  {
    id: 'free',
    kind: 'forward',
    name: '자유 양식',
    tagline: '백지에서 시작한다 — 섹션을 직접 설계한다',
    examples: '혼합형 문서 · 나만의 포맷',
    sections: [
      {
        key: 'overview',
        heading: '개요',
        guide: '무엇을 다루는 문서인지 먼저 밝히고, 아래 + 버튼으로 섹션을 자유롭게 추가하세요.',
        // fields 없음 → content 문자열 하나(큰 textarea).
      },
    ],
  },
]

export function getTemplate(id) {
  return templates.find((t) => t.id === id)
}

// 작성 시작 화면에서 kind별로 묶어 보여주기 위한 헬퍼.
export const reverseTemplates = templates.filter((t) => t.kind === 'reverse')
export const forwardTemplates = templates.filter((t) => t.kind === 'forward')
