// 역기획서를 쓸 때 실제로 많이 고르는 게임 15종과, 그 안의 대표 시스템 카탈로그.
// 두 곳에서 쓴다.
//  1) 작성 시작 화면 — 게임 → 시스템을 고르면 템플릿과 태그가 정해진다(백지 공포 제거)
//  2) backend/scripts/generate-examples.mjs — 항목마다 AI 예시 역기획서를 미리 생성
//
// 분류 축이 셋이다.
//  - templateId : 어떤 틀로 쓰는가 (system / content / uiux / level)
//  - category   : 무엇을 분석하는가 (문서의 성질 — 둘러보기 필터용, DB 컬럼)
//  - genre      : 어떤 게임인가 (게임의 성질 — gameTag 로부터 계산, DB 컬럼 없음)
//
// systemTag(= name)는 "스타포스 강화"처럼 구체적인 이름을 유지한다. 검색과 제목에 필요하다.
// 필터는 문서 수만큼 늘어나면 안 되므로 category/genre 라는 고정 어휘로 건다.

// 문서가 무엇을 분석하는가. 새 문서도 이 안에서 고르게 해 필터가 무한히 늘지 않게 한다.
export const categories = [
  '콘셉트·피치', // 순기획(오리지널 기획안)용
  '성장·강화',
  '경제·재화',
  '메커닉·밸런스',
  '진행·레벨',
  '보상·리텐션',
  'BM·상점',
  '경쟁·매칭',
  '정보·UI',
  '연출·서사',
]

export const games = [
  { name: '리그 오브 레전드', genre: 'MOBA' },
  { name: '배틀그라운드', genre: '배틀로얄' },
  { name: '오버워치', genre: 'FPS·슈터' },
  { name: 'FC 온라인', genre: '스포츠' },
  { name: '메이플스토리', genre: 'MMORPG' },
  { name: '발로란트', genre: 'FPS·슈터' },
  { name: '클래시 로얄', genre: '실시간 전략' },
  { name: '포트나이트', genre: '배틀로얄' },
  { name: '캔디 크러시 사가', genre: '퍼즐' },
  { name: '디아블로 2', genre: '핵앤슬래시' },
  { name: '슬레이 더 스파이어', genre: '로그라이크' },
  { name: '하데스', genre: '로그라이크' },
  { name: '젤다의 전설: 브레스 오브 더 와일드', genre: '액션 어드벤처' },
  { name: '포탈', genre: '퍼즐' },
  { name: '슈퍼 마리오 월드', genre: '플랫포머' },
]

export const gameSystems = [
  // ── 리그 오브 레전드 ──────────────────────────────────────
  {
    id: 'lol-shop',
    game: '리그 오브 레전드',
    name: '아이템 상점 · 빌드',
    templateId: 'uiux',
    category: '정보·UI',
    blurb: '짧은 귀환 시간 안에 구매 결정을 끝내야 하는 화면',
  },
  {
    id: 'lol-runes',
    game: '리그 오브 레전드',
    name: '룬 · 특성',
    templateId: 'system',
    category: '메커닉·밸런스',
    blurb: '경기 전에 확정되는 빌드 선택과 그 트레이드오프',
  },
  {
    id: 'lol-champion-kit',
    game: '리그 오브 레전드',
    name: '챔피언 스킬 설계',
    templateId: 'system',
    category: '메커닉·밸런스',
    blurb: '스킬 4종의 역할 분담과 쿨다운·자원 설계',
  },
  {
    id: 'lol-gold',
    game: '리그 오브 레전드',
    name: '미니언 · 골드 수급',
    templateId: 'system',
    category: '경제·재화',
    blurb: '시간당 성장 속도를 결정하는 경제의 기본 축',
  },
  {
    id: 'lol-objectives',
    game: '리그 오브 레전드',
    name: '정글 · 오브젝트(드래곤/바론)',
    templateId: 'content',
    category: '진행·레벨',
    blurb: '팀을 한곳에 모으는 시간제 목표 설계',
  },
  {
    id: 'lol-rank',
    game: '리그 오브 레전드',
    name: '랭크 · MMR',
    templateId: 'system',
    category: '경쟁·매칭',
    blurb: '티어·승급과 내부 점수의 관계',
  },
  {
    id: 'lol-vision',
    game: '리그 오브 레전드',
    name: '시야 · 와드',
    templateId: 'system',
    category: '메커닉·밸런스',
    blurb: '정보를 자원으로 만든 설계',
  },
  {
    id: 'lol-skin-bm',
    game: '리그 오브 레전드',
    name: '스킨 · BM',
    templateId: 'content',
    category: 'BM·상점',
    blurb: '성능이 아닌 외형만 파는 수익 모델',
  },
  {
    id: 'lol-rotation',
    game: '리그 오브 레전드',
    name: '챔피언 로테이션 · 획득',
    templateId: 'content',
    category: '보상·리텐션',
    blurb: '무료 체험과 영구 해금을 잇는 온보딩 구조',
  },
  {
    id: 'lol-ui-hud',
    game: '리그 오브 레전드',
    name: '인게임 HUD',
    templateId: 'uiux',
    category: '정보·UI',
    blurb: '전투 중 한눈에 읽어야 하는 정보 위계',
  },

  // ── 배틀그라운드 ──────────────────────────────────────────
  {
    id: 'pubg-bluezone',
    game: '배틀그라운드',
    name: '자기장(블루존)',
    templateId: 'system',
    category: '진행·레벨',
    blurb: '매치 길이를 강제로 수렴시키는 핵심 장치',
  },
  {
    id: 'pubg-loot',
    game: '배틀그라운드',
    name: '루팅 · 인벤토리',
    templateId: 'uiux',
    category: '정보·UI',
    blurb: '교전 중에도 빠르게 조작해야 하는 화면',
  },
  {
    id: 'pubg-recoil',
    game: '배틀그라운드',
    name: '총기 반동 · 탄도',
    templateId: 'system',
    category: '메커닉·밸런스',
    blurb: '숙련도 곡선을 만드는 수치 설계',
  },
  {
    id: 'pubg-rank',
    game: '배틀그라운드',
    name: '랭크 · 티어',
    templateId: 'system',
    category: '경쟁·매칭',
    blurb: '생존과 킬 중 무엇에 점수를 줄 것인가',
  },
  {
    id: 'pubg-pass',
    game: '배틀그라운드',
    name: '배틀패스 · 생존자패스',
    templateId: 'content',
    category: '보상·리텐션',
    blurb: '시즌 단위 접속 동기 설계',
  },
  {
    id: 'pubg-knock',
    game: '배틀그라운드',
    name: '기절 · 부활',
    templateId: 'system',
    category: '메커닉·밸런스',
    blurb: '스쿼드 플레이를 만드는 유예 시간 설계',
  },
  {
    id: 'pubg-vehicle',
    game: '배틀그라운드',
    name: '차량 · 이동',
    templateId: 'system',
    category: '진행·레벨',
    blurb: '넓은 맵과 자기장을 잇는 이동 수단',
  },
  {
    id: 'pubg-carepackage',
    game: '배틀그라운드',
    name: '레드존 · 보급',
    templateId: 'content',
    category: '보상·리텐션',
    blurb: '위험을 걸고 얻는 고가치 보상',
  },
  {
    id: 'pubg-matchmaking',
    game: '배틀그라운드',
    name: '매치메이킹 · 대기열',
    templateId: 'system',
    category: '경쟁·매칭',
    blurb: '100인을 모으는 대기 시간과 실력 분포',
  },
  {
    id: 'pubg-store',
    game: '배틀그라운드',
    name: '상점 · 크레이트',
    templateId: 'content',
    category: 'BM·상점',
    blurb: '확률형 아이템과 직접 구매의 공존',
  },

  // ── 오버워치 ──────────────────────────────────────────────
  {
    id: 'ow-roles',
    game: '오버워치',
    name: '영웅 역할군(탱/딜/힐)',
    templateId: 'system',
    category: '메커닉·밸런스',
    blurb: '역할 구분이 팀 구성에 거는 제약',
  },
  {
    id: 'ow-ultimate',
    game: '오버워치',
    name: '궁극기 게이지',
    templateId: 'system',
    category: '메커닉·밸런스',
    blurb: '팀파이트 타이밍을 만드는 축적형 자원',
  },
  {
    id: 'ow-role-queue',
    game: '오버워치',
    name: '역할 대기열',
    templateId: 'system',
    category: '경쟁·매칭',
    blurb: '대기 시간과 팀 밸런스의 교환',
  },
  {
    id: 'ow-rank',
    game: '오버워치',
    name: '경쟁전 랭크 · 배치',
    templateId: 'system',
    category: '경쟁·매칭',
    blurb: '배치 경기와 갱신 주기 설계',
  },
  {
    id: 'ow-counter',
    game: '오버워치',
    name: '영웅 카운터 설계',
    templateId: 'system',
    category: '메커닉·밸런스',
    blurb: '교체(스위칭)를 전략으로 만든 구조',
  },
  {
    id: 'ow-respawn',
    game: '오버워치',
    name: '리스폰 · 팀파이트 페이싱',
    templateId: 'system',
    category: '진행·레벨',
    blurb: '죽음의 대가를 시간으로 지불시키는 설계',
  },
  {
    id: 'ow-objective',
    game: '오버워치',
    name: '목표(점령 · 호위)',
    templateId: 'content',
    category: '진행·레벨',
    blurb: '지역을 두고 싸우게 만드는 모드 규칙',
  },
  {
    id: 'ow-pass',
    game: '오버워치',
    name: '배틀패스',
    templateId: 'content',
    category: '보상·리텐션',
    blurb: '시즌 보상 트랙과 영웅 해금',
  },
  {
    id: 'ow-shop',
    game: '오버워치',
    name: '상점 · 스킨',
    templateId: 'uiux',
    category: 'BM·상점',
    blurb: '주간 로테이션 상점의 구성과 노출',
  },
  {
    id: 'ow-ping',
    game: '오버워치',
    name: '핑 · 커뮤니케이션',
    templateId: 'uiux',
    category: '정보·UI',
    blurb: '음성 없이도 협동하게 만드는 최소 신호',
  },

  // ── FC 온라인 ─────────────────────────────────────────────
  {
    id: 'fc-upgrade',
    game: 'FC 온라인',
    name: '선수 강화(승급)',
    templateId: 'system',
    category: '성장·강화',
    blurb: '실패 리스크가 있는 카드 성장 시스템',
  },
  {
    id: 'fc-pack',
    game: 'FC 온라인',
    name: '팩(가챠) 확률',
    templateId: 'system',
    category: 'BM·상점',
    blurb: '등급별 확률과 기대값 설계',
  },
  {
    id: 'fc-market',
    game: 'FC 온라인',
    name: '이적시장 경제',
    templateId: 'system',
    category: '경제·재화',
    blurb: '유저 간 거래가 만드는 가격과 수수료',
  },
  {
    id: 'fc-chemistry',
    game: 'FC 온라인',
    name: '스쿼드 케미스트리',
    templateId: 'system',
    category: '메커닉·밸런스',
    blurb: '조합에 제약을 걸어 다양성을 만드는 장치',
  },
  {
    id: 'fc-rank',
    game: 'FC 온라인',
    name: '랭크 · 디비전',
    templateId: 'system',
    category: '경쟁·매칭',
    blurb: '승강 구조와 시즌 리셋',
  },
  {
    id: 'fc-season-class',
    game: 'FC 온라인',
    name: '시즌 클래스(카드 등급)',
    templateId: 'content',
    category: '보상·리텐션',
    blurb: '신규 시즌 카드가 기존 자산을 대체하는 방식',
  },
  {
    id: 'fc-currency',
    game: 'FC 온라인',
    name: 'BP · 캐시 이중 재화',
    templateId: 'system',
    category: '경제·재화',
    blurb: '무과금 재화와 과금 재화의 경계 설계',
  },
  {
    id: 'fc-tactics',
    game: 'FC 온라인',
    name: '감독 · 전술',
    templateId: 'system',
    category: '메커닉·밸런스',
    blurb: '경기 전 선택이 경기력에 걸리는 방식',
  },
  {
    id: 'fc-rewards',
    game: 'FC 온라인',
    name: '리그 · 보상 구조',
    templateId: 'content',
    category: '보상·리텐션',
    blurb: '반복 플레이를 유도하는 주간 보상',
  },
  {
    id: 'fc-matchmaking',
    game: 'FC 온라인',
    name: '매치메이킹',
    templateId: 'system',
    category: '경쟁·매칭',
    blurb: '스쿼드 전력과 실력을 함께 고려하는 매칭',
  },

  // ── 메이플스토리 ──────────────────────────────────────────
  {
    id: 'ms-starforce',
    game: '메이플스토리',
    name: '스타포스 강화',
    templateId: 'system',
    category: '성장·강화',
    blurb: '파괴 리스크가 있는 장비 성장의 최종 단계',
  },
  {
    id: 'ms-cube',
    game: '메이플스토리',
    name: '큐브 · 잠재능력',
    templateId: 'system',
    category: '성장·강화',
    blurb: '재화를 넣어 옵션을 굴리는 확률형 성장',
  },
  {
    id: 'ms-boss',
    game: '메이플스토리',
    name: '보스(일일 · 주간)',
    templateId: 'content',
    category: '보상·리텐션',
    blurb: '주기 제한이 걸린 핵심 재화 공급처',
  },
  {
    id: 'ms-exp',
    game: '메이플스토리',
    name: '사냥 · 경험치 곡선',
    templateId: 'system',
    category: '진행·레벨',
    blurb: '레벨 구간별 성장 속도 설계',
  },
  {
    id: 'ms-economy',
    game: '메이플스토리',
    name: '메소 경제 · 거래소',
    templateId: 'system',
    category: '경제·재화',
    blurb: '재화의 공급(소스)과 소모(싱크) 균형',
  },
  {
    id: 'ms-cashshop',
    game: '메이플스토리',
    name: '캐시샵 BM',
    templateId: 'content',
    category: 'BM·상점',
    blurb: '성장 가속과 외형을 파는 수익 모델',
  },
  {
    id: 'ms-symbol',
    game: '메이플스토리',
    name: '심볼 · 아케인포스',
    templateId: 'system',
    category: '성장·강화',
    blurb: '지역 입장을 게이팅하는 별도 성장 축',
  },
  {
    id: 'ms-skill-tree',
    game: '메이플스토리',
    name: '직업 스킬 트리',
    templateId: 'system',
    category: '성장·강화',
    blurb: '차수별 해금과 직업 정체성',
  },
  {
    id: 'ms-event',
    game: '메이플스토리',
    name: '이벤트 구조',
    templateId: 'content',
    category: '보상·리텐션',
    blurb: '기간제 재화와 출석 보상의 설계',
  },
  {
    id: 'ms-union',
    game: '메이플스토리',
    name: '유니온 · 링크 스킬',
    templateId: 'system',
    category: '성장·강화',
    blurb: '부캐 육성을 본캐 성능으로 환산하는 장치',
  },

  // ── 발로란트 ──────────────────────────────────────────────
  {
    id: 'val-agent',
    game: '발로란트',
    name: '요원 스킬 설계',
    templateId: 'system',
    category: '메커닉·밸런스',
    blurb: '총기 실력 위에 얹은 유틸리티 층',
  },
  {
    id: 'val-economy',
    game: '발로란트',
    name: '라운드 경제(구매 페이즈)',
    templateId: 'system',
    category: '경제·재화',
    blurb: '라운드 승패가 다음 라운드 전력에 걸리는 구조',
  },
  {
    id: 'val-spike',
    game: '발로란트',
    name: '스파이크 설치 · 해제',
    templateId: 'system',
    category: '진행·레벨',
    blurb: '공수 목표를 만드는 타이머 규칙',
  },
  {
    id: 'val-rank',
    game: '발로란트',
    name: '경쟁전 랭크',
    templateId: 'system',
    category: '경쟁·매칭',
    blurb: '티어와 랭크 레이팅(RR) 설계',
  },
  {
    id: 'val-gunplay',
    game: '발로란트',
    name: '총기 반동 · 정확도',
    templateId: 'system',
    category: '메커닉·밸런스',
    blurb: '이동·사격 상태에 따른 명중 페널티',
  },
  {
    id: 'val-map',
    game: '발로란트',
    name: '맵 구조 · 사이트',
    templateId: 'level',
    category: '진행·레벨',
    blurb: '공수 유불리를 만드는 공간 설계',
  },
  {
    id: 'val-halftime',
    game: '발로란트',
    name: '하프 전환 · 페이싱',
    templateId: 'content',
    category: '진행·레벨',
    blurb: '공수 교대가 만드는 경기 리듬',
  },
  {
    id: 'val-pass',
    game: '발로란트',
    name: '배틀패스 · 번들',
    templateId: 'content',
    category: '보상·리텐션',
    blurb: '시즌 보상과 한정 판매의 결합',
  },
  {
    id: 'val-nightmarket',
    game: '발로란트',
    name: '야시장(할인 상점)',
    templateId: 'content',
    category: 'BM·상점',
    blurb: '개인화된 랜덤 할인의 구매 유도',
  },
  {
    id: 'val-ping',
    game: '발로란트',
    name: '핑 · 커뮤니케이션',
    templateId: 'uiux',
    category: '정보·UI',
    blurb: '적 위치를 공유하는 최소 신호 체계',
  },

  // ── 클래시 로얄 ───────────────────────────────────────────
  {
    id: 'cr-elixir',
    game: '클래시 로얄',
    name: '엘릭서 경제',
    templateId: 'system',
    category: '경제·재화',
    blurb: '초당 회복되는 단일 자원이 만드는 공방 리듬',
  },
  {
    id: 'cr-card-level',
    game: '클래시 로얄',
    name: '카드 레벨 업그레이드',
    templateId: 'system',
    category: '성장·강화',
    blurb: '같은 카드도 레벨로 성능이 갈리는 성장 축',
  },
  {
    id: 'cr-tower',
    game: '클래시 로얄',
    name: '타워 · 승리 조건',
    templateId: 'system',
    category: '메커닉·밸런스',
    blurb: '3분 안에 결판나게 만드는 목표 구조',
  },
  {
    id: 'cr-counter',
    game: '클래시 로얄',
    name: '카드 상성 · 카운터',
    templateId: 'system',
    category: '메커닉·밸런스',
    blurb: '엘릭서 손익으로 표현되는 가위바위보',
  },
  {
    id: 'cr-arena',
    game: '클래시 로얄',
    name: '아레나 · 트로피',
    templateId: 'system',
    category: '경쟁·매칭',
    blurb: '트로피 하나로 매칭과 해금을 동시에 거는 구조',
  },
  {
    id: 'cr-chest',
    game: '클래시 로얄',
    name: '상자 · 보상 주기',
    templateId: 'content',
    category: '보상·리텐션',
    blurb: '해제 대기 시간이 접속 주기를 만드는 장치',
  },
  {
    id: 'cr-shop',
    game: '클래시 로얄',
    name: '상점 · 패스 로얄',
    templateId: 'content',
    category: 'BM·상점',
    blurb: '시간 단축과 카드 직접 구매를 파는 모델',
  },
  {
    id: 'cr-deck',
    game: '클래시 로얄',
    name: '덱 구성 화면',
    templateId: 'uiux',
    category: '정보·UI',
    blurb: '8장 제한 안에서 역할 균형을 읽게 하는 화면',
  },

  // ── 포트나이트 ────────────────────────────────────────────
  {
    id: 'fn-build',
    game: '포트나이트',
    name: '건축 시스템',
    templateId: 'system',
    category: '메커닉·밸런스',
    blurb: '슈터에 실시간 지형 생성을 얹은 차별화 축',
  },
  {
    id: 'fn-storm',
    game: '포트나이트',
    name: '스톰(자기장) 페이징',
    templateId: 'system',
    category: '진행·레벨',
    blurb: '단계별 대기·축소 시간이 만드는 매치 곡선',
  },
  {
    id: 'fn-rarity',
    game: '포트나이트',
    name: '아이템 등급 체계',
    templateId: 'system',
    category: '메커닉·밸런스',
    blurb: '색으로 즉시 읽히는 성능 위계',
  },
  {
    id: 'fn-poi',
    game: '포트나이트',
    name: '랜드마크(POI) 배치',
    templateId: 'level',
    category: '진행·레벨',
    blurb: '초반 교전 밀도를 결정하는 거점 분포',
  },
  {
    id: 'fn-loadout',
    game: '포트나이트',
    name: '인벤토리 · 무기 교체',
    templateId: 'uiux',
    category: '정보·UI',
    blurb: '건축과 사격을 오가며 써야 하는 슬롯 설계',
  },
  {
    id: 'fn-pass',
    game: '포트나이트',
    name: '배틀패스',
    templateId: 'content',
    category: '보상·리텐션',
    blurb: '이 장르의 표준이 된 시즌 보상 트랙의 원형',
  },
  {
    id: 'fn-shop',
    game: '포트나이트',
    name: '아이템 상점 · 스킨',
    templateId: 'content',
    category: 'BM·상점',
    blurb: '매일 바뀌는 한정 진열이 만드는 구매 압박',
  },
  {
    id: 'fn-season',
    game: '포트나이트',
    name: '시즌 서사 · 맵 변화',
    templateId: 'content',
    category: '연출·서사',
    blurb: '맵 자체를 바꿔 이야기를 전달하는 라이브 이벤트',
  },
  {
    id: 'fn-rank',
    game: '포트나이트',
    name: '랭크 모드',
    templateId: 'system',
    category: '경쟁·매칭',
    blurb: '캐주얼 유입과 경쟁 욕구를 분리한 이중 트랙',
  },

  // ── 캔디 크러시 사가 ──────────────────────────────────────
  {
    id: 'cc-lives',
    game: '캔디 크러시 사가',
    name: '하트(생명) 시스템',
    templateId: 'system',
    category: '경제·재화',
    blurb: '시간으로 회복되는 플레이 횟수 제한',
  },
  {
    id: 'cc-difficulty',
    game: '캔디 크러시 사가',
    name: '레벨 난이도 곡선',
    templateId: 'level',
    category: '진행·레벨',
    blurb: '수천 개 레벨에 걸쳐 조절되는 좌절과 성취의 리듬',
  },
  {
    id: 'cc-objective',
    game: '캔디 크러시 사가',
    name: '레벨 목표 유형',
    templateId: 'level',
    category: '진행·레벨',
    blurb: '같은 규칙 위에 목표만 바꿔 만드는 변주',
  },
  {
    id: 'cc-combo',
    game: '캔디 크러시 사가',
    name: '특수 캔디 · 콤보',
    templateId: 'system',
    category: '메커닉·밸런스',
    blurb: '조합이 조합을 부르는 연쇄 보상 설계',
  },
  {
    id: 'cc-booster',
    game: '캔디 크러시 사가',
    name: '부스터 · 추가 이동 BM',
    templateId: 'content',
    category: 'BM·상점',
    blurb: '실패 직전에 결제를 제안하는 타이밍 설계',
  },
  {
    id: 'cc-event',
    game: '캔디 크러시 사가',
    name: '이벤트 · 연속 접속',
    templateId: 'content',
    category: '보상·리텐션',
    blurb: '기간 한정 트랙으로 이탈을 막는 장치',
  },
  {
    id: 'cc-map',
    game: '캔디 크러시 사가',
    name: '월드맵 진행 UI',
    templateId: 'uiux',
    category: '정보·UI',
    blurb: '길 위의 점으로 진척을 보여주는 시각 장치',
  },

  // ── 디아블로 2 ────────────────────────────────────────────
  {
    id: 'd2-item-tier',
    game: '디아블로 2',
    name: '아이템 등급 체계',
    templateId: 'system',
    category: '성장·강화',
    blurb: '노멀~유니크로 이어지는 희소성 사다리',
  },
  {
    id: 'd2-runeword',
    game: '디아블로 2',
    name: '룬워드',
    templateId: 'system',
    category: '성장·강화',
    blurb: '레시피를 알아야 만들 수 있는 조합형 최상위 장비',
  },
  {
    id: 'd2-skill-tree',
    game: '디아블로 2',
    name: '스킬 트리 · 시너지',
    templateId: 'system',
    category: '성장·강화',
    blurb: '되돌릴 수 없는 투자로 빌드 정체성을 만드는 구조',
  },
  {
    id: 'd2-difficulty',
    game: '디아블로 2',
    name: '난이도 3단계(노말/나이트메어/헬)',
    templateId: 'content',
    category: '진행·레벨',
    blurb: '같은 콘텐츠를 세 번 돌게 만드는 반복 구조',
  },
  {
    id: 'd2-act',
    game: '디아블로 2',
    name: '액트 · 지역 구조',
    templateId: 'level',
    category: '진행·레벨',
    blurb: '마을과 사냥터, 웨이포인트가 짜는 진행 동선',
  },
  {
    id: 'd2-farming',
    game: '디아블로 2',
    name: '파밍 루프 · 매직 파인드',
    templateId: 'system',
    category: '경제·재화',
    blurb: '드랍 확률에 스탯을 걸어 반복을 정당화한 설계',
  },
  {
    id: 'd2-economy',
    game: '디아블로 2',
    name: '물물교환 경제',
    templateId: 'system',
    category: '경제·재화',
    blurb: '통화가 무너진 자리에 룬이 화폐가 된 현상',
  },
  {
    id: 'd2-death',
    game: '디아블로 2',
    name: '사망 페널티 · 시체 회수',
    templateId: 'system',
    category: '진행·레벨',
    blurb: '죽음에 실질 비용을 매겨 긴장을 유지하는 장치',
  },
  {
    id: 'd2-inventory',
    game: '디아블로 2',
    name: '인벤토리 · 그리드',
    templateId: 'uiux',
    category: '정보·UI',
    blurb: '칸 크기 자체가 자원이 되는 공간 관리',
  },

  // ── 슬레이 더 스파이어 ────────────────────────────────────
  {
    id: 'sts-deck',
    game: '슬레이 더 스파이어',
    name: '덱빌딩 · 카드 획득',
    templateId: 'system',
    category: '성장·강화',
    blurb: '카드를 더하는 것이 곧 덱을 흐리는 트레이드오프',
  },
  {
    id: 'sts-reward',
    game: '슬레이 더 스파이어',
    name: '전투 후 3선택 보상',
    templateId: 'system',
    category: '보상·리텐션',
    blurb: '제한된 선택지가 만드는 빌드 방향성',
  },
  {
    id: 'sts-relic',
    game: '슬레이 더 스파이어',
    name: '유물(패시브)',
    templateId: 'system',
    category: '성장·강화',
    blurb: '규칙 자체를 바꾸는 영구 효과 설계',
  },
  {
    id: 'sts-energy',
    game: '슬레이 더 스파이어',
    name: '에너지 · 턴 구조',
    templateId: 'system',
    category: '메커닉·밸런스',
    blurb: '턴당 3에너지라는 제약이 만드는 판단',
  },
  {
    id: 'sts-map',
    game: '슬레이 더 스파이어',
    name: '맵 분기 경로',
    templateId: 'level',
    category: '진행·레벨',
    blurb: '전투·상점·이벤트를 미리 보고 고르게 하는 설계',
  },
  {
    id: 'sts-elite',
    game: '슬레이 더 스파이어',
    name: '엘리트 · 보스 페이싱',
    templateId: 'level',
    category: '진행·레벨',
    blurb: '위험을 자발적으로 선택하게 만드는 배치',
  },
  {
    id: 'sts-shop',
    game: '슬레이 더 스파이어',
    name: '상점 · 화톳불 선택',
    templateId: 'system',
    category: '경제·재화',
    blurb: '회복과 강화 중 하나만 고르게 하는 자원 압박',
  },
  {
    id: 'sts-ascension',
    game: '슬레이 더 스파이어',
    name: '승천(어센션) 난이도',
    templateId: 'content',
    category: '진행·레벨',
    blurb: '클리어 이후를 20단계로 늘린 장기 목표',
  },

  // ── 하데스 ────────────────────────────────────────────────
  {
    id: 'hd-boon',
    game: '하데스',
    name: '신의 은총(빌드)',
    templateId: 'system',
    category: '성장·강화',
    blurb: '매 시도마다 다시 조립되는 일회성 빌드',
  },
  {
    id: 'hd-mirror',
    game: '하데스',
    name: '어둠의 거울(영구 성장)',
    templateId: 'system',
    category: '성장·강화',
    blurb: '실패해도 앞으로 나아가게 만드는 누적 축',
  },
  {
    id: 'hd-weapon',
    game: '하데스',
    name: '무기 · 각성 형태',
    templateId: 'system',
    category: '메커닉·밸런스',
    blurb: '무기 하나에 네 갈래 변형을 얹은 다양성 설계',
  },
  {
    id: 'hd-heat',
    game: '하데스',
    name: '열(각오) 시스템',
    templateId: 'content',
    category: '진행·레벨',
    blurb: '난이도를 유저가 직접 조립하게 한 구조',
  },
  {
    id: 'hd-room',
    game: '하데스',
    name: '방 구성 · 페이싱',
    templateId: 'level',
    category: '진행·레벨',
    blurb: '보상 미리보기로 다음 방을 고르게 하는 리듬',
  },
  {
    id: 'hd-death',
    game: '하데스',
    name: '사망과 재시작 동선',
    templateId: 'level',
    category: '진행·레벨',
    blurb: '죽음을 로딩이 아니라 장면으로 만든 설계',
  },
  {
    id: 'hd-currency',
    game: '하데스',
    name: '다중 재화 구조',
    templateId: 'system',
    category: '경제·재화',
    blurb: '시도 내 재화와 시도 밖 재화를 나눈 이유',
  },
  {
    id: 'hd-narrative',
    game: '하데스',
    name: '반복 위에 얹은 서사',
    templateId: 'content',
    category: '연출·서사',
    blurb: '죽을수록 이야기가 진행되는 구조',
  },

  // ── 젤다의 전설: 브레스 오브 더 와일드 ────────────────────
  {
    id: 'botw-shrine',
    game: '젤다의 전설: 브레스 오브 더 와일드',
    name: '사당 설계',
    templateId: 'level',
    category: '진행·레벨',
    blurb: '15분 내외로 완결되는 소형 퍼즐 단위',
  },
  {
    id: 'botw-exploration',
    game: '젤다의 전설: 브레스 오브 더 와일드',
    name: '탐험 유도 · 시선 설계',
    templateId: 'level',
    category: '진행·레벨',
    blurb: '"저기 가보고 싶다"를 지형으로 만드는 기술',
  },
  {
    id: 'botw-tower',
    game: '젤다의 전설: 브레스 오브 더 와일드',
    name: '타워 · 지역 해금',
    templateId: 'level',
    category: '진행·레벨',
    blurb: '지도를 스스로 채우게 만드는 거점 구조',
  },
  {
    id: 'botw-durability',
    game: '젤다의 전설: 브레스 오브 더 와일드',
    name: '무기 내구도',
    templateId: 'system',
    category: '메커닉·밸런스',
    blurb: '아끼지 말고 계속 바꿔 쓰게 만드는 소모 설계',
  },
  {
    id: 'botw-physics',
    game: '젤다의 전설: 브레스 오브 더 와일드',
    name: '물리 · 화학 규칙',
    templateId: 'system',
    category: '메커닉·밸런스',
    blurb: '예외 없는 일관된 규칙이 만드는 창발',
  },
  {
    id: 'botw-stamina',
    game: '젤다의 전설: 브레스 오브 더 와일드',
    name: '스태미나',
    templateId: 'system',
    category: '메커닉·밸런스',
    blurb: '어디든 오를 수 있게 하되 거리로 제한하는 자원',
  },
  {
    id: 'botw-cooking',
    game: '젤다의 전설: 브레스 오브 더 와일드',
    name: '요리 · 자원 순환',
    templateId: 'system',
    category: '경제·재화',
    blurb: '채집물을 회복·버프로 바꾸는 조합 규칙',
  },
  {
    id: 'botw-divine-beast',
    game: '젤다의 전설: 브레스 오브 더 와일드',
    name: '신수 · 최종 목표 구조',
    templateId: 'content',
    category: '진행·레벨',
    blurb: '순서를 강제하지 않는 네 개의 큰 목표',
  },
  {
    id: 'botw-map',
    game: '젤다의 전설: 브레스 오브 더 와일드',
    name: '지도 · 목적지 표시',
    templateId: 'uiux',
    category: '정보·UI',
    blurb: '유저가 직접 핀을 찍게 한 자율 내비게이션',
  },

  // ── 포탈 ──────────────────────────────────────────────────
  {
    id: 'portal-chamber',
    game: '포탈',
    name: '테스트 챔버 학습 곡선',
    templateId: 'level',
    category: '진행·레벨',
    blurb: '설명 없이 규칙을 가르치는 방의 연속',
  },
  {
    id: 'portal-gun',
    game: '포탈',
    name: '포탈건 메커닉 도입',
    templateId: 'level',
    category: '진행·레벨',
    blurb: '기능을 한 번에 하나씩만 쥐여주는 순서 설계',
  },
  {
    id: 'portal-momentum',
    game: '포탈',
    name: '관성 · 물리 퍼즐',
    templateId: 'system',
    category: '메커닉·밸런스',
    blurb: '단일 규칙에서 파생되는 해법의 폭',
  },
  {
    id: 'portal-signage',
    game: '포탈',
    name: '시각 언어(재질 · 표지)',
    templateId: 'uiux',
    category: '정보·UI',
    blurb: 'UI 없이 환경만으로 가능/불가능을 알리는 방식',
  },
  {
    id: 'portal-narrative',
    game: '포탈',
    name: '환경 스토리텔링',
    templateId: 'content',
    category: '연출·서사',
    blurb: '컷신 없이 공간과 목소리로 쌓는 이야기',
  },
  {
    id: 'portal-companion',
    game: '포탈',
    name: '컴패니언 큐브(감정 설계)',
    templateId: 'content',
    category: '연출·서사',
    blurb: '기능적 오브젝트에 애착을 붙이는 장치',
  },

  // ── 슈퍼 마리오 월드 ──────────────────────────────────────
  {
    id: 'smw-level-grammar',
    game: '슈퍼 마리오 월드',
    name: '레벨 문법(도입-발전-변주-결론)',
    templateId: 'level',
    category: '진행·레벨',
    blurb: '한 스테이지가 하나의 아이디어를 다루는 구성법',
  },
  {
    id: 'smw-enemy',
    game: '슈퍼 마리오 월드',
    name: '적 배치 리듬',
    templateId: 'level',
    category: '진행·레벨',
    blurb: '점프 타이밍을 학습시키는 간격 설계',
  },
  {
    id: 'smw-secret',
    game: '슈퍼 마리오 월드',
    name: '숨은 출구 · 분기',
    templateId: 'level',
    category: '진행·레벨',
    blurb: '한 번 더 들어가게 만드는 이중 목표',
  },
  {
    id: 'smw-powerup',
    game: '슈퍼 마리오 월드',
    name: '파워업(망토 · 깃털)',
    templateId: 'system',
    category: '성장·강화',
    blurb: '능력이 곧 레벨 공략법을 바꾸는 일시 성장',
  },
  {
    id: 'smw-yoshi',
    game: '슈퍼 마리오 월드',
    name: '요시(탈것)',
    templateId: 'system',
    category: '메커닉·밸런스',
    blurb: '보호막이자 이동 수단이자 소모품인 다중 역할',
  },
  {
    id: 'smw-life',
    game: '슈퍼 마리오 월드',
    name: '잔기 · 체크포인트',
    templateId: 'system',
    category: '진행·레벨',
    blurb: '실패 비용을 조절하는 고전적 장치',
  },
  {
    id: 'smw-worldmap',
    game: '슈퍼 마리오 월드',
    name: '월드맵 진행',
    templateId: 'uiux',
    category: '정보·UI',
    blurb: '지도 위에 진척과 선택지를 함께 보여주는 화면',
  },
]

// 게임별로 묶어서 반환 (작성 시작 화면용)
export function systemsByGame(game) {
  return gameSystems.filter((s) => s.game === game)
}

export function getGameSystem(id) {
  return gameSystems.find((s) => s.id === id)
}

// 장르는 문서가 아니라 게임의 성질이라 gameTag 하나로 정해진다(DB 컬럼을 두지 않는 이유).
// 카탈로그에 없는 게임(사람이 자유 입력한 것)은 '기타'로 묶는다.
export function genreOfGame(gameTag) {
  return games.find((g) => g.name === gameTag)?.genre ?? '기타'
}

// 장르 렌즈 — 같은 "역기획"이라도 장르마다 반드시 짚어야 할 것이 다르다.
// 작성 가이드(에디터)·챌린지 카드·AI 피드백 세 곳에서 같은 목록을 쓴다.
export const genreLenses = {
  MOBA: [
    '라인전과 성장 격차',
    '오브젝트가 만드는 집결 타이밍',
    '시야(정보)의 자원화',
    '챔피언 상성과 교체 여지',
  ],
  'FPS·슈터': [
    '반동·명중 페널티가 만드는 숙련 곡선',
    'TTK와 교전 길이',
    '맵 구조와 진입로 유불리',
    '유틸리티(스킬)와 총기 실력의 균형',
  ],
  배틀로얄: [
    '자기장이 강제하는 매치 페이싱',
    '루팅 편차와 초반 운',
    '생존 vs 교전의 보상 배분',
    '스쿼드 단위 부활·기절 설계',
  ],
  MMORPG: [
    '레벨·장비 성장 곡선의 변곡점',
    '재화의 공급(소스)과 소모(싱크)',
    '일일·주간 주기와 숙제 피로',
    '엔드컨텐츠 진입 게이팅',
  ],
  스포츠: [
    '조작감과 실력 반영도',
    '시즌·카드 등급이 만드는 자산 감가',
    '이적시장 등 유저 간 경제',
    '스쿼드 조합 제약(케미)',
  ],
  '실시간 전략': [
    '자원 수급과 소모의 템포',
    '유닛 상성과 카운터 여지',
    '전개 속도와 스노우볼 억제',
    '한 판의 길이와 결착 조건',
  ],
  퍼즐: [
    '새 규칙을 가르치는 순서(학습 곡선)',
    '난이도 곡선과 좌절 지점',
    '힌트·되돌리기 등 구제 장치',
    '해법의 폭(단일해 vs 다중해)',
  ],
  로그라이크: [
    '한 런의 길이와 페이싱',
    '빌드 다양성과 시드 편차',
    '영구 성장(메타 progression)의 역할',
    '실패가 재도전으로 이어지는 마찰',
  ],
  핵앤슬래시: [
    '파밍 루프와 드랍 확률',
    '아이템 등급·옵션의 희소성 사다리',
    '빌드 자유도와 되돌릴 수 없는 선택',
    '반복 사냥의 지루함 방지 장치',
  ],
  '액션 어드벤처': [
    '탐험을 유도하는 시선 설계',
    '월드 구조와 이동 자유도',
    '보상 밀도(가볼 이유)',
    '순서를 강제하지 않는 목표 구성',
  ],
  플랫포머: [
    '레벨 문법(도입-발전-변주-결론)',
    '조작 정밀도와 관용 프레임',
    '적·장애물 배치의 리듬',
    '체크포인트 간격과 실패 비용',
  ],
  기타: [
    '핵심 반복 행동(코어 루프)',
    '성장 또는 진행의 축',
    '보상과 리스크의 균형',
    '이탈 지점과 재방문 동기',
  ],
}

// gameTag → 그 장르에서 짚어야 할 체크포인트. 장르를 모르면 '기타' 렌즈.
export function lensOfGame(gameTag) {
  return genreLenses[genreOfGame(gameTag)] ?? genreLenses['기타']
}

// 우리 장르 키 → 렌즈. (RAWG로 판별한 장르에 직접 렌즈를 붙일 때 쓴다.)
export function lensOfGenre(genre) {
  return genreLenses[genre] ?? genreLenses['기타']
}

// RAWG 게임의 genres/tags(영문명) → 우리 11개 장르 중 하나.
// RAWG 장르와 우리 장르가 1:1이 아니라 근사 매핑이다. 구체적인 것부터(태그 포함) 검사한다.
export function mapRawgToGenre({ genres = [], tags = [] } = {}) {
  const g = genres.map((x) => x.toLowerCase())
  const t = tags.map((x) => x.toLowerCase())
  const has = (list, kw) => list.some((x) => x.includes(kw))

  // 태그가 더 구체적인 장르(로그라이크·배틀로얄·MOBA·핵앤슬래시)를 먼저 잡는다.
  if (has(t, 'roguelike') || has(t, 'rogue-like') || has(t, 'roguelite')) return '로그라이크'
  if (has(t, 'battle royale')) return '배틀로얄'
  if (has(t, 'moba')) return 'MOBA'
  if (has(t, 'hack and slash') || has(t, 'hack-and-slash') || has(t, 'dungeon crawler'))
    return '핵앤슬래시'

  // 그다음 RAWG 상위 장르.
  if (has(g, 'massively multiplayer')) return 'MMORPG'
  if (has(g, 'shooter')) return 'FPS·슈터'
  if (has(g, 'platformer')) return '플랫포머'
  if (has(g, 'puzzle')) return '퍼즐'
  if (has(g, 'sports')) return '스포츠'
  if (has(g, 'strategy')) return '실시간 전략'
  // 액션/어드벤처가 있으면 그쪽을 우선(젤다처럼 RPG 태그가 섞여도 액션 어드벤처로).
  if (has(g, 'adventure') || has(g, 'action')) return '액션 어드벤처'
  if (has(g, 'role-playing') || has(g, 'rpg')) return 'MMORPG' // 순수 RPG 근사: 성장·경제 렌즈
  return '기타'
}

// 필터 칩 순서용 — 실제로 카탈로그에 존재하는 장르만, 위 games 순서를 유지해 반환.
export const genres = [...new Set(games.map((g) => g.genre))]
