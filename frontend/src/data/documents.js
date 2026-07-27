// 시드 문서. 스키마는 기획서 §5의 documents/sections/comments 테이블과 대응한다.
// - 같은 systemTag('가챠 시스템') 문서 2편 → 비교 학습 동선
// - doc-genshin-gacha: 사람 코멘트 + AI 피드백 혼재, 지난 챌린지(ch-1) 베스트
// - doc-lol-shop: 피드백 요청 중 배지

export const seedDocuments = [
  {
    id: 'doc-genshin-gacha',
    author: '픽뚫린기원',
    type: '역기획',
    templateId: 'system',
    status: 'published',
    title: '원신 기원(가챠) 시스템 역기획 — 천장은 왜 90회인가',
    gameTag: '원신',
    jobTag: '시스템',
    systemTag: '가챠 시스템',
    challengeId: 'ch-1',
    feedbackWanted: false,
    likes: 24,
    bookmarks: 11,
    aiScore: 88,
    publishedAt: '2026-06-24',
    sections: [
      {
        id: 'gg-1',
        heading: '개요',
        content:
          '원신의 기원은 5성 캐릭터 획득의 사실상 유일한 경로다. 이 문서는 확률 상승(소프트 천장)과 90회 확정(하드 천장)이 결합된 구조를 분해하고, 왜 이 조합이 "과금 불만"을 줄이면서 매출을 유지하는지 추론한다.',
      },
      {
        id: 'gg-2',
        heading: '시스템 규칙',
        content:
          '기본 5성 확률 0.6%. 74회부터 회차당 약 6%p씩 상승(소프트 천장), 90회째 확정. 5성 획득 시 카운트 초기화. 픽업 대상이 아닌 5성이 나오면 다음 5성은 픽업 확정(이른바 반천장 → 확정 천장 구조).',
      },
      {
        id: 'gg-3',
        heading: '유저 플로우',
        content:
          '이벤트 배너 확인 → 재화(원석→기원) 환전 → 1회/10회 뽑기 선택 → 연출 → 결과 → 잔여 재화 확인 후 반복 또는 이탈. 연출 스킵이 가능해지는 지점과, 10연 연출의 색(파랑/보라/금) 예고가 반복 동기를 만든다.',
      },
      {
        id: 'gg-4',
        heading: '데이터 구조',
        content:
          'banner(id, type, featured_char_id, start_at, end_at) / pull_history(user_id, banner_id, pity_count, is_featured_guaranteed) — 천장 카운트와 픽업 확정 플래그가 배너 유형별로 분리 저장되어야 한다는 점이 이 시스템 데이터 설계의 핵심이다.',
      },
      {
        id: 'gg-5',
        heading: '예외 처리',
        content:
          '재화 부족 시 부족분만큼 원석 자동 환전 팝업(이탈을 끊지 않는 설계). 뽑기 연출 중 강제 종료해도 결과는 서버 확정. 배너 종료 직전 구매→뽑기 시퀀스의 시간 경계 처리는 서버 타임스탬프 기준.',
      },
      {
        id: 'gg-6',
        heading: '분석/개선 제안',
        content:
          '천장 카운트가 배너를 넘어 이월되는 것이 핵심 리텐션 장치다. "이번에 못 먹어도 쌓인 카운트가 아깝다"는 매몰 비용이 다음 배너 참여를 강제한다. 개선안: 천장 진행도를 UI에 명시적으로 노출하면 불만은 줄겠지만 흥분도 같이 줄 것이다 — 미표기는 의도된 선택으로 보인다.',
      },
    ],
    comments: [
      {
        id: 'gg-c1',
        sectionId: 'gg-2',
        author: '현직3년차',
        isAi: false,
        content:
          '소프트 천장 수치를 실측 데이터 출처와 함께 적어주면 신뢰도가 확 올라가요. 커뮤니티 통계인지 공식 공지인지에 따라 문서의 성격이 달라집니다.',
        createdAt: '2026-06-26',
      },
      {
        id: 'gg-c2',
        sectionId: 'gg-6',
        author: '현직3년차',
        isAi: false,
        content:
          '"미표기는 의도된 선택"이라는 해석에 동의해요. 여기에 반례(명시적으로 천장 게이지를 보여주는 게임)를 하나 붙여 비교하면 분석 섹션이 훨씬 강해질 겁니다.',
        createdAt: '2026-06-26',
      },
      {
        id: 'gg-c3',
        sectionId: 'gg-4',
        author: null,
        isAi: true,
        content:
          '[구조 완결성] 데이터 구조에 확률 테이블 자체(pity 구간별 확률)가 빠져 있어요. pull_history와 별개로 rate_table(pity:int, prob:float)이 있어야 규칙 섹션의 수치와 연결됩니다.',
        createdAt: '2026-06-24',
      },
      {
        id: 'gg-c4',
        sectionId: 'gg-5',
        author: null,
        isAi: true,
        content:
          '[예외 질문] 이런 경우는 어떻게 되나요? ① 10연 도중 천장(90회)에 도달하면 나머지 뽑기의 확률은? ② 픽업 확정 상태에서 배너가 교체되면 확정 플래그는 유지되나요?',
        createdAt: '2026-06-24',
      },
    ],
  },
  {
    id: 'doc-bluearchive-gacha',
    author: '청휘석파산자',
    type: '역기획',
    templateId: 'system',
    status: 'published',
    title: '블루 아카이브 모집 시스템 역기획 — 천장 이월 없는 가챠의 보상 설계',
    gameTag: '블루 아카이브',
    jobTag: '시스템',
    systemTag: '가챠 시스템',
    challengeId: 'ch-1',
    feedbackWanted: false,
    likes: 15,
    bookmarks: 6,
    aiScore: 81,
    publishedAt: '2026-06-25',
    sections: [
      {
        id: 'ba-1',
        heading: '개요',
        content:
          '블루 아카이브의 모집은 천장(200회 교환)이 배너 간 이월되지 않는 구조다. 원신형 이월 천장과 정반대 선택을 한 이유를 재화 수급 곡선과 함께 분석한다.',
      },
      {
        id: 'ba-2',
        heading: '시스템 규칙',
        content:
          '3성 기본 확률 3%(픽업 0.7%). 10연마다 2성 이상 1회 보장. 모집 1회당 포인트 1 적립, 200포인트로 픽업 캐릭터 교환 가능. 포인트는 배너 종료 시 소멸.',
      },
      {
        id: 'ba-3',
        heading: '유저 플로우',
        content:
          '배너 확인 → 청휘석 환전 → 10연 반복 → 포인트 확인 → 교환 또는 포기. "교환까지 몇 연 남았는가"가 항상 화면에 노출되어, 원신과 달리 천장이 명시적 목표로 기능한다.',
      },
      {
        id: 'ba-4',
        heading: '예외 처리',
        content:
          '배너 종료 시점에 포인트가 남아 있으면 소멸 경고 팝업이 뜬다. 미수령 교환권이 있는 상태로 배너가 끝나는 경우는 우편으로 전환된다.',
      },
      {
        id: 'ba-5',
        heading: '분석/개선 제안',
        content:
          '이월 없는 천장은 "이번 배너 안에서 끝내라"는 압박으로 단기 결제를 유도한다. 대신 무·소과금이 천장에 닿을 수 있도록 재화 배포량이 크다. 천장의 이월 여부는 매출 곡선을 단기형/장기형으로 가르는 스위치라는 것이 이 문서의 결론이다.',
      },
    ],
    comments: [
      {
        id: 'ba-c1',
        sectionId: 'ba-5',
        author: '픽뚫린기원',
        isAi: false,
        content:
          '원신 쪽 문서를 쓴 사람입니다. 결론 문단의 "천장 이월 = 매출 곡선 스위치" 프레임이 좋네요. 두 문서를 나란히 읽으니 같은 가챠라도 설계 의도가 완전히 다른 게 보여요.',
        createdAt: '2026-06-28',
      },
    ],
  },
  {
    id: 'doc-lostark-chaos',
    author: '숙제하는기획러',
    type: '역기획',
    templateId: 'content',
    status: 'published',
    title: '로스트아크 카오스 던전 역기획 — 일일 숙제는 왜 6분인가',
    gameTag: '로스트아크',
    jobTag: '컨텐츠',
    systemTag: '반복 컨텐츠',
    challengeId: null,
    feedbackWanted: false,
    likes: 9,
    bookmarks: 4,
    publishedAt: '2026-07-02',
    sections: [
      {
        id: 'lc-1',
        heading: '개요',
        content:
          '카오스 던전은 로스트아크의 대표 일일 반복 컨텐츠다. 하루 플레이의 시작점을 고정해 접속 습관을 만드는 역할을 하며, 세션 길이가 약 6분으로 짧게 설계된 이유를 분석한다.',
      },
      {
        id: 'lc-2',
        heading: '컨텐츠 구조',
        content:
          '아이템 레벨 구간별로 입장 단계가 나뉘고, 보상은 하루 2회로 제한된다(휴식 게이지로 미접속 보상 보전). 1회는 3개 스테이지 연속 전투로 구성된다.',
      },
      {
        id: 'lc-3',
        heading: '보상 설계',
        content:
          '주 성장 재화(파편·수호석·돌파석)의 상당 부분이 여기서 공급된다. 성장에 필수인 재화를 짧은 반복에 묶어, "숙제"라는 말이 붙을 만큼 참여를 강제한다. 휴식 게이지는 미접속 페널티를 보상 보전으로 뒤집은 영리한 장치다.',
      },
      {
        id: 'lc-4',
        heading: '분석/개선 제안',
        content:
          '6분이라는 길이는 다중 캐릭터(원정대) 운영을 전제로 한 선택으로 보인다 — 6분 × 6캐릭터 = 36분, 이것이 실제 설계 단위다. 개선안: 반복 자체의 재미 장치(무작위 변수)가 부족해, 주간 단위 변형 룰을 제안한다.',
      },
    ],
    comments: [
      {
        id: 'lc-c1',
        sectionId: 'lc-4',
        author: '현직3년차',
        isAi: false,
        content:
          '"세션 길이 × 캐릭터 수가 실제 설계 단위"라는 관점이 정확해요. 원정대 시스템 문서와 묶어서 보면 좋은 포트폴리오 세트가 되겠네요.',
        createdAt: '2026-07-04',
      },
    ],
  },
  {
    id: 'doc-lol-shop',
    author: '미드긴급호출',
    type: '역기획',
    templateId: 'uiux',
    status: 'published',
    title: 'LoL 인게임 상점 UI 역기획 — 8초 안에 끝나는 구매 결정',
    gameTag: '리그 오브 레전드',
    jobTag: 'UI/UX',
    systemTag: '상점 UI',
    challengeId: null,
    feedbackWanted: true,
    likes: 4,
    bookmarks: 2,
    publishedAt: '2026-07-09',
    sections: [
      {
        id: 'ls-1',
        heading: '개요',
        content:
          'LoL의 인게임 상점은 귀환~부활 사이의 짧은 시간 안에 구매를 끝내야 하는, 시간 압박이 특수한 화면이다. 이 문서는 "빠른 결정"을 위해 화면이 어떤 정보를 버렸는지에 주목한다.',
      },
      {
        id: 'ls-2',
        heading: '화면 구조',
        content:
          '좌측 카테고리/검색, 중앙 아이템 그리드, 우측 선택 아이템 상세와 하위 조합 트리, 상단 추천 빌드 탭. 추천 탭이 기본 선택이라 신규 유저는 트리를 이해하지 않고도 구매할 수 있다.',
      },
      {
        id: 'ls-3',
        heading: '인터랙션 명세',
        content:
          '우클릭 즉시 구매(확인 팝업 없음), 검색은 초성·영문 부분일치 지원, 골드 부족 아이템은 가격이 붉게 표시되고 구매 불가. 실수 구매는 판매가 아니라 "되돌리기(undo)"로 처리해 전액 환불된다.',
      },
      {
        id: 'ls-4',
        heading: '개선 제안',
        content:
          '확인 팝업 대신 undo를 둔 것은 "빠른 결정 + 실수 복구"를 동시에 잡는 설계다. 다만 undo 가능 조건(전투 개입 시 무효)이 UI에 드러나지 않아, 첫 실수에서 학습 비용이 발생한다.',
      },
    ],
    comments: [],
  },
  {
    id: 'doc-clash-upgrade',
    author: '타워러시금지',
    type: '역기획',
    templateId: 'system',
    status: 'published',
    title: '클래시 로얄 카드 강화 역기획 — 중복 카드가 화폐가 되는 구조',
    gameTag: '클래시 로얄',
    jobTag: '시스템',
    systemTag: '강화 시스템',
    challengeId: null,
    feedbackWanted: false,
    likes: 7,
    bookmarks: 3,
    publishedAt: '2026-07-06',
    sections: [
      {
        id: 'cu-1',
        heading: '개요',
        content:
          '클래시 로얄의 카드 강화는 "중복 획득"을 실패가 아니라 성장 재화로 바꾼 구조다. 가챠형 게임의 중복 문제를 강화 시스템이 어떻게 흡수하는지 분석한다.',
      },
      {
        id: 'cu-2',
        heading: '시스템 규칙',
        content:
          '같은 카드를 N장 모으면 골드를 지불해 레벨업. 레벨업 필요 장수는 2→4→10→20…으로 지수 증가하며, 골드 비용도 함께 증가한다. 카드 획득처(상자)는 등급별 배출 비중이 다르다.',
      },
      {
        id: 'cu-3',
        heading: '데이터 구조',
        content:
          'card_upgrade(rarity:enum, level:int, cards_required:int, gold_cost:int) — 등급×레벨 2차원 테이블 하나로 성장 곡선 전체가 통제된다. 카드 수와 골드라는 이중 재화 요구가 과금 포인트를 두 개로 만든다.',
      },
      {
        id: 'cu-4',
        heading: '예외 처리',
        content:
          '최고 레벨 도달 후 중복 카드는 별도 재화(엘리트 와일드카드 등)로 전환된다. "쓸모없는 획득"이 생기지 않도록 전환 경로를 끝까지 설계해 둔 점이 인상적이다.',
      },
      {
        id: 'cu-5',
        heading: '분석/개선 제안',
        content:
          '중복을 재화로 흡수하면 가챠 불만이 줄지만, 특정 카드만 모이는 편중 문제가 남는다. 와일드카드(범용 대체재)가 그 보정 장치다. 강화 시스템을 설계할 때는 "실패·중복이 어디로 흐르는가"를 먼저 그려야 한다는 것이 이 문서의 결론이다.',
      },
    ],
    comments: [
      {
        id: 'cu-c1',
        sectionId: 'cu-3',
        author: null,
        isAi: true,
        content:
          '[구체성] "지수 증가"라고 쓴 부분에 실제 수열(2, 4, 10, 20, 50…)을 표로 넣으면 데이터 구조 섹션의 설득력이 올라가요. 등급별로 다른 수열인지도 확인해 주세요.',
        createdAt: '2026-07-06',
      },
    ],
  },
  // ── 순기획 예시(직접 작성) ────────────────────────────────
  // 챌린지 "예시 확인하기"가 여는 문서. 새 fields 양식을 그대로 보여준다.
  // exampleSource: 'editorial' — AI가 쓴 것이 아니므로 배지·문구를 구분한다.
  {
    id: 'doc-pitch-tidefisher',
    author: 'respec 예시',
    type: '순기획',
    templateId: 'pitch',
    status: 'published',
    isExample: true,
    exampleSource: 'editorial',
    title: '폭풍낚시 — 바다가 매번 새로 그려지는 협동 낚시',
    gameTag: '폭풍낚시(가제)',
    jobTag: '피치',
    systemTag: '역할 분담 협동 낚시',
    category: '콘셉트·피치',
    challengeId: null,
    feedbackWanted: false,
    likes: 12,
    bookmarks: 7,
    publishedAt: '2026-07-20',
    sections: [
      {
        id: 'tf-1',
        guideKey: 'identity',
        heading: '정체성',
        fields: [
          {
            key: 'pitch',
            label: '한 줄 소개',
            value: '한 판마다 바다 지형과 날씨가 새로 그려지는, 2~4인 협동 낚시 게임.',
          },
          { key: 'genre', label: '장르', value: '협동 로그라이크 · 캐주얼 시뮬레이션' },
          { key: 'platform', label: '플랫폼', value: 'PC · 콘솔 (게임패드 우선)' },
          {
            key: 'target',
            label: '타깃',
            value:
              '친구와 20~30분 짧게 즐기는 라이트 코어. 스타듀밸리·레이드는 좋아하나 하드 액션은 부담스러운 층.',
          },
        ],
      },
      {
        id: 'tf-2',
        guideKey: 'appeal',
        heading: '재미와 차별점',
        fields: [
          {
            key: 'pillars',
            label: '디자인 필러 (2~3)',
            value:
              '1) 예측 불가한 바다 — 매 판 지형·조류·날씨가 재구성된다\n2) 역할이 나뉘어야 잡힌다 — 조타·미끼·릴링을 혼자 다 못 한다\n3) 한 판 20분 — 실패해도 부담 없이 다시',
          },
          {
            key: 'fun',
            label: '핵심 재미',
            value: '폭풍이 몰아치는 30초 동안 서로 소리치며 역할을 바꿔 대물을 끌어올리는 순간.',
          },
          {
            key: 'usp',
            label: '차별점',
            value:
              '기존 낚시 게임은 "혼자, 잔잔하게, 무한히"인데 이 게임은 "함께, 위험하게, 한 판으로" 끝난다. 낚시를 협동 로그라이크의 코어 루프로 옮긴 사례가 아직 없다.',
          },
          {
            key: 'nongoals',
            label: '안 할 것',
            value:
              'PvP, 성능을 파는 과금, 무한 오픈월드. 스코프를 "한 척의 배 + 한 판"으로 묶어 지킨다.',
          },
        ],
      },
    ],
    comments: [],
  },
  {
    id: 'doc-loop-lanternkeeper',
    author: 'respec 예시',
    type: '순기획',
    templateId: 'gameplay',
    status: 'published',
    isExample: true,
    exampleSource: 'editorial',
    title: '등대지기 — "불을 켠다" 하나로 30분을 붙잡는 루프',
    gameTag: '등대지기(가제)',
    jobTag: '게임플레이',
    systemTag: '단일 행동 코어 루프',
    category: '메커닉·밸런스',
    challengeId: null,
    feedbackWanted: false,
    likes: 9,
    bookmarks: 5,
    publishedAt: '2026-07-21',
    sections: [
      {
        id: 'lk-1',
        guideKey: 'loop',
        heading: '핵심 루프',
        fields: [
          {
            key: 'core_loop',
            label: '코어 루프',
            value:
              '어둠 속을 걸어 등불을 하나 켠다(약 40초) → 밝아진 범위만큼 다음 등불과 자원이 보인다 → 기름이 줄어 되돌아갈지 더 갈지 정한다 → 귀환해 기름을 보충하고 범위를 영구 확장한다.\n한 사이클 약 3분, 10사이클이면 30분.',
          },
        ],
      },
      {
        id: 'lk-2',
        guideKey: 'systems',
        heading: '주요 시스템',
        fields: [
          {
            key: 'systems',
            label: '핵심 시스템',
            value:
              '기름(시간 자원): 이동·점등에 소모되며 남은 양이 곧 남은 탐험 거리다.\n등불 네트워크: 켠 등불은 영구히 남아 다음 판의 출발선을 앞당긴다 — 실패해도 전진한다.\n어둠의 압력: 오래 머물수록 시야가 좁아져 "욕심"에 비용을 매긴다.',
          },
        ],
      },
      {
        id: 'lk-3',
        guideKey: 'controls',
        heading: '조작 · 모드',
        fields: [
          {
            key: 'controls',
            label: '조작 방식',
            value: '이동 + 상호작용 1버튼. 조작을 의도적으로 최소화했다.',
          },
          {
            key: 'mode',
            label: '싱글 / 멀티',
            value: '싱글 중심. 비동기 협동(남이 켠 등불이 내 맵에 희미하게 보임).',
          },
        ],
      },
      {
        id: 'lk-4',
        guideKey: 'quests',
        heading: '미션 · 퀘스트',
        fields: [
          {
            key: 'structure',
            label: '진행 구조',
            value:
              '명시적 퀘스트 없음. "다음 등불"이 유일한 목표이고, 지도가 밝아지는 것 자체가 진행도다.',
          },
        ],
      },
    ],
    comments: [],
  },
]

export function getSeedDocument(id) {
  return seedDocuments.find((d) => d.id === id)
}
