// 라이브 사이트를 "커뮤니티처럼" 보이게 하는 목데이터 시더. AI 호출 0.
//
// 사용법 (backend 디렉터리에서):
//   node scripts/seed-mock-data.mjs           # 목데이터 삽입/갱신(멱등)
//   node scripts/seed-mock-data.mjs --clean    # 목데이터 전량 제거(원상복구)
//   node scripts/seed-mock-data.mjs --fix-orphans  # 존재하지 않는 챌린지에 묶인 문서의 링크 해제
//
// 되돌리기 설계(스키마 변경 없음):
//  - 목 문서 id는 slug에서 파생한 결정적 UUID → 재실행 upsert, --clean 시 그 id만 삭제
//  - 추가 코멘트 id는 'mock-' 접두사 → 어느 문서든 골라 넣고/지운다
//  - 좋아요/북마크/ai_score는 목 문서 + 예시(is_example) 문서에만 세팅(실제값 0이라 clean=0 복원)
import 'dotenv/config'
import crypto from 'node:crypto'
import { supabase } from '../src/lib/supabase.js'

function unwrap({ data, error }) {
  if (error) throw new Error(error.message)
  return data
}

// slug → 결정적 UUID(버전 비트 무관, Postgres uuid가 허용하는 hex 포맷).
function mockId(slug) {
  const h = crypto
    .createHash('md5')
    .update('respec-mock:' + slug)
    .digest('hex')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`
}

// slug 해시로 3~45 사이의 결정적 좋아요 수(편차 있게).
function pseudoLikes(slug, base = 3, span = 43) {
  const n = parseInt(crypto.createHash('md5').update(slug).digest('hex').slice(0, 4), 16)
  return base + (n % span)
}

const now = Date.now()
const day = 86400000
const daysAgo = (d) => new Date(now - d * day).toISOString()

function section(slug, i, heading, content) {
  return { id: `${slug}-${i}`, heading, content }
}
function fieldSection(slug, i, heading, guideKey, fields) {
  return { id: `${slug}-${i}`, heading, guideKey, fields }
}
function comment(slug, n, sectionId, author, content, d) {
  return {
    id: `mock-${slug}-c${n}`,
    section_id: sectionId,
    author,
    is_ai: false,
    content,
    created_at: daysAgo(d),
  }
}

// ── 사람 작성 문서(둘러보기용) + 챌린지 제출작 ────────────────────────────
// 각 doc: { slug, author, type, templateId, gameTag, jobTag, systemTag, category,
//           title, likes, bookmarks, challengeId?, aiScore?, publishedDaysAgo, sections, comments? }
const DOCS = [
  // ── 역기획 (content 양식) ──
  {
    slug: 'lol-jungle',
    author: '정글각',
    type: '역기획',
    templateId: 'system',
    gameTag: '리그 오브 레전드',
    jobTag: '시스템',
    systemTag: '정글 · 오브젝트',
    category: '진행·레벨',
    title: 'LoL 정글·오브젝트 역기획 — 팀을 한곳에 모으는 시간표',
    likes: 41,
    bookmarks: 17,
    publishedDaysAgo: 3,
    sections: [
      [
        '개요',
        '정글의 드래곤·바론은 "시간이 되면 팀을 한 지점으로 끌어모으는" 장치다. 라인전을 흩어놓았다가 오브젝트 타이밍에 다시 뭉치게 만드는 리듬을 분해한다.',
      ],
      [
        '핵심 규칙',
        '드래곤은 5분 주기, 바론은 20분 등장. 처치 시 팀 전체 버프 → 개인 성장이 아니라 "집결 보상"이라는 점이 핵심이다.',
      ],
      [
        '분석/개선',
        '오브젝트는 스노우볼 가속기이자 역전 장치다. 리스크(맵을 비우는 대가)와 보상(팀 버프)을 시간으로 묶어, 라인전만 반복되지 않게 판을 흔든다.',
      ],
    ],
    comments: [
      [
        2,
        '가챠해설가',
        '"집결 보상"이라는 프레임이 좋네요. 여기에 시야(와드) 자원과 엮으면 왜 오브젝트 앞 한타가 벌어지는지까지 설명됩니다.',
        2,
      ],
      [
        3,
        '밸런스노트',
        '역전 장치라는 해석에 동의. 바론 버프의 지속시간이 "한 번의 공성"에 맞춰진 것도 근거로 추가하면 좋아요.',
        1,
      ],
    ],
  },
  {
    slug: 'ow-ult',
    author: '궁각재기',
    type: '역기획',
    templateId: 'system',
    gameTag: '오버워치',
    jobTag: '시스템',
    systemTag: '궁극기 게이지',
    category: '메커닉·밸런스',
    title: '오버워치 궁극기 게이지 역기획 — 한타 타이밍은 누가 정하나',
    likes: 28,
    bookmarks: 11,
    publishedDaysAgo: 6,
    sections: [
      [
        '개요',
        '궁극기는 축적형 자원이라, "언제 싸울지"를 개인이 아니라 게이지가 정한다. 딜/힐량으로 차오르는 구조가 팀파이트 페이싱을 만든다.',
      ],
      [
        '시스템 규칙',
        '피해·치유·처치로 충전, 영웅별 필요량 상이. 죽어도 게이지는 유지 → "궁 있는 채로 죽지 마라"는 심리를 만든다.',
      ],
      [
        '분석/개선',
        '게이지 가시화(내 궁 %)는 명확하지만 상대 궁은 추정만 가능 — 이 비대칭이 "궁 교환" 심리전의 핵심이다.',
      ],
    ],
    comments: [
      [
        3,
        'UX관찰자',
        '상대 궁을 추정만 하게 둔 비대칭이 심리전을 만든다는 포인트가 정확해요. 킬로그로 역산하는 고수 플레이도 언급하면 깊어집니다.',
        3,
      ],
    ],
  },
  {
    slug: 'ms-cube',
    author: '큐브値',
    type: '역기획',
    templateId: 'system',
    gameTag: '메이플스토리',
    jobTag: '시스템',
    systemTag: '큐브 · 잠재능력',
    category: '성장·강화',
    title: '메이플 큐브 역기획 — 확률형 성장의 끝판왕',
    likes: 35,
    bookmarks: 22,
    publishedDaysAgo: 9,
    sections: [
      [
        '개요',
        '큐브는 재화를 넣어 잠재옵션을 굴리는 확률형 성장이다. 등급 상승과 옵션 조합이라는 이중 확률이 과금을 깊게 만든다.',
      ],
      [
        '시스템 규칙',
        '등급업 확률(레어→에픽→유니크→레전드리)과 옵션 3줄 조합이 곱해진다. 체감 확률이 매우 낮아 "터짐"이 커뮤니티 이벤트가 된다.',
      ],
      [
        '분석/개선',
        '이중 확률은 기대값을 흐려 지불 상한을 높인다. 천장(등급 보장)이 있으나 옵션 조합엔 없어, 여기가 불만의 핵심으로 보인다.',
      ],
    ],
    comments: [
      [
        3,
        '메타이론',
        '이중 확률로 기대값을 흐린다는 분석이 날카롭네요. 블랙큐브/에디셔널까지 표로 정리하면 결정판이 될 듯.',
        5,
      ],
      [
        2,
        '가챠해설가',
        '옵션 천장 부재가 불만의 핵심이라는 데 동의. 반례로 천장 있는 타 게임과 비교해도 좋겠어요.',
        4,
      ],
    ],
  },
  {
    slug: 'pubg-bluezone',
    author: '자기장예보',
    type: '역기획',
    templateId: 'system',
    gameTag: '배틀그라운드',
    jobTag: '시스템',
    systemTag: '자기장(블루존)',
    category: '진행·레벨',
    title: '배그 자기장 역기획 — 100명을 강제로 수렴시키는 법',
    likes: 19,
    bookmarks: 7,
    publishedDaysAgo: 12,
    sections: [
      [
        '개요',
        '자기장은 매치 길이를 강제로 수렴시키는 핵심 장치다. 시간이 갈수록 공간을 줄여 교전을 필연으로 만든다.',
      ],
      [
        '핵심 규칙',
        '단계별 대기→축소, 후반일수록 데미지 급증. 위치 운과 이동 판단을 동시에 시험한다.',
      ],
      [
        '분석/개선',
        '자기장은 "숨어서 이기는" 전략의 상한을 정한다. 축소 속도 곡선이 곧 매치의 긴장 곡선이다.',
      ],
    ],
  },
  {
    slug: 'val-economy',
    author: '라운드경제',
    type: '역기획',
    templateId: 'system',
    gameTag: '발로란트',
    jobTag: '시스템',
    systemTag: '라운드 경제',
    category: '경제·재화',
    title: '발로란트 라운드 경제 역기획 — 지난 라운드가 이번 라운드를 정한다',
    likes: 24,
    bookmarks: 13,
    publishedDaysAgo: 5,
    sections: [
      [
        '개요',
        '라운드 승패가 다음 라운드 구매력에 직결된다. "이코 라운드"라는 전략적 포기가 여기서 태어난다.',
      ],
      [
        '시스템 규칙',
        '승리/패배/연패 보정으로 크레딧 지급. 팀 단위 구매 조율이 개인 실력만큼 중요해진다.',
      ],
      [
        '분석/개선',
        '경제는 스노우볼을 만들되 연패 보정으로 완화한다 — 완전한 스노우볼과 완전한 리셋 사이의 절충이다.',
      ],
    ],
    comments: [
      [
        3,
        '코어루프연구',
        '연패 보정이 스노우볼과 리셋의 절충이라는 정리가 깔끔합니다. 하프 전환과 엮으면 완성도가 올라가요.',
        2,
      ],
    ],
  },
  {
    slug: 'fc-pack',
    author: '팩값장인',
    type: '역기획',
    templateId: 'system',
    gameTag: 'FC 온라인',
    jobTag: '시스템',
    systemTag: '팩(가챠) 확률',
    category: 'BM·상점',
    title: 'FC 온라인 팩 확률 역기획 — 기대값과 한정의 심리',
    likes: 16,
    bookmarks: 6,
    publishedDaysAgo: 15,
    sections: [
      [
        '개요',
        '팩은 등급별 확률과 기대값으로 설계된 가챠다. 이적시장과 맞물려 "뽑느냐 사느냐"의 판단이 생긴다.',
      ],
      [
        '시스템 규칙',
        '시즌 클래스별 등장 확률, 한정 팩의 기간 압박. 시장가와 팩 기대값의 괴리가 구매를 유도한다.',
      ],
      [
        '분석/개선',
        '팩과 시장의 공존이 핵심 — 팩은 공급을, 시장은 유동성을 담당해 서로의 가격을 정당화한다.',
      ],
    ],
  },
  // ── 순기획 (fields 양식) ──
  {
    slug: 'pitch-inkwell',
    author: '인디기획생',
    type: '순기획',
    templateId: 'pitch',
    gameTag: '잉크웰(가제)',
    jobTag: '피치',
    systemTag: '한 줄 콘셉트',
    category: '콘셉트·피치',
    title: '잉크웰 — 번지는 잉크로 길을 그리는 퍼즐 플랫포머',
    likes: 33,
    bookmarks: 19,
    publishedDaysAgo: 4,
    fieldsDoc: true,
    sections: [
      [
        '정체성',
        'identity',
        [
          [
            'pitch',
            '한 줄 소개',
            '붓으로 잉크를 뿌려 발판·다리·적을 그려 나아가는 손맛 퍼즐 플랫포머.',
          ],
          ['genre', '장르', '퍼즐 플랫포머'],
          ['platform', '플랫폼', 'PC · 콘솔 · 태블릿'],
          ['target', '타깃', '짧고 아름다운 인디를 좋아하는 라이트 코어'],
        ],
      ],
      [
        '재미와 차별점',
        'appeal',
        [
          [
            'pillars',
            '디자인 필러',
            '1) 잉크는 유한한 자원 2) 번짐은 예측 가능한 물리 3) 한 스테이지 = 한 아이디어',
          ],
          ['fun', '핵심 재미', '마지막 잉크 한 방울로 다리를 완성해 건너는 순간'],
          ['usp', '차별점', '"그리기"를 조작이 아니라 자원 관리로 바꿨다'],
          ['nongoals', '안 할 것', '전투 중심, 오픈월드, 수집 요소'],
        ],
      ],
    ],
    comments: [
      [
        '정체성',
        1,
        '레벨디자인러',
        '"그리기를 자원 관리로"라는 한 줄이 강력해요. 잉크 총량이 곧 난이도 레버가 되겠네요.',
        2,
      ],
    ],
  },
  {
    slug: 'loop-tidewatch',
    author: '코어루프연구',
    type: '순기획',
    templateId: 'gameplay',
    gameTag: '타이드워치(가제)',
    jobTag: '게임플레이',
    systemTag: '단일 행동 루프',
    category: '메커닉·밸런스',
    title: '타이드워치 — 밀물·썰물 한 번으로 30분을 짜는 루프',
    likes: 21,
    bookmarks: 9,
    publishedDaysAgo: 7,
    fieldsDoc: true,
    sections: [
      [
        '핵심 루프',
        'loop',
        [
          [
            'core_loop',
            '코어 루프',
            '썰물 때 갯벌을 탐사해 자원을 캐고(3분), 밀물이 밀려오기 전 귀환한다 → 얻은 자원으로 방파제를 넓혀 다음 썰물의 탐사 범위를 늘린다.',
          ],
        ],
      ],
      [
        '주요 시스템',
        'systems',
        [
          [
            'systems',
            '핵심 시스템',
            '물때 타이머(시간 압박) · 방파제(영구 확장) · 밀물 위험도(욕심의 비용). 실패해도 방파제는 남아 전진한다.',
          ],
        ],
      ],
    ],
  },
  {
    slug: 'pitch-signal',
    author: '시즌패스',
    type: '순기획',
    templateId: 'pitch',
    gameTag: '시그널(가제)',
    jobTag: '피치',
    systemTag: '한 줄 콘셉트',
    category: '콘셉트·피치',
    title: '시그널 — 전파를 맞춰 진실을 복원하는 1인칭 추리',
    likes: 14,
    bookmarks: 8,
    publishedDaysAgo: 11,
    fieldsDoc: true,
    sections: [
      [
        '정체성',
        'identity',
        [
          [
            'pitch',
            '한 줄 소개',
            '낡은 라디오의 주파수를 맞춰 끊긴 방송 조각을 이어 사건을 재구성하는 추리 게임.',
          ],
          ['genre', '장르', '내러티브 추리'],
          ['platform', '플랫폼', 'PC · 모바일'],
          ['target', '타깃', '오브라딘·페이퍼플리즈류를 좋아하는 층'],
        ],
      ],
      [
        '재미와 차별점',
        'appeal',
        [
          [
            'pillars',
            '디자인 필러',
            '1) 조작은 다이얼 하나 2) 단서는 소리로만 3) 오답도 이야기가 된다',
          ],
          ['fun', '핵심 재미', '잡음 속에서 목소리가 또렷해지는 순간'],
          ['usp', '차별점', '시각이 아니라 청각으로 수사한다'],
          ['nongoals', '안 할 것', '전투, 실패 패널티, 시간 제한'],
        ],
      ],
    ],
  },
  {
    slug: 'zelda-cook',
    author: '탐험로그',
    type: '역기획',
    templateId: 'system',
    gameTag: '젤다의 전설: 브레스 오브 더 와일드',
    jobTag: '시스템',
    systemTag: '요리 · 자원 순환',
    category: '경제·재화',
    title: '젤다 BotW 요리 역기획 — 채집을 회복·버프로 바꾸는 순환',
    likes: 30,
    bookmarks: 15,
    publishedDaysAgo: 8,
    sections: [
      [
        '개요',
        '요리는 세계 곳곳의 채집물을 회복·버프로 환산하는 순환의 중심이다. 탐험의 보상을 소비 가능한 힘으로 바꾼다.',
      ],
      [
        '시스템 규칙',
        '재료 조합으로 효과·지속시간 결정. 레시피를 강제하지 않고 실험을 허용해 "발견"의 재미를 준다.',
      ],
      [
        '분석/개선',
        '요리는 상점 경제 없이도 자원 순환을 완성한다 — 채집→요리→도전→더 먼 채집의 고리가 탐험을 지탱한다.',
      ],
    ],
    comments: [
      [
        3,
        '로그라이크러',
        '상점 없이 순환을 완성했다는 관점이 좋네요. 내구도 시스템과 묶으면 "왜 계속 움직이게 되는가"가 설명됩니다.',
        3,
      ],
    ],
  },

  // ── 종료 챌린지 ch-1 (가챠 역기획) 리더보드용 제출작 ──
  {
    slug: 'ch1-nikke',
    author: '메타이론',
    type: '역기획',
    templateId: 'system',
    gameTag: '승리의 여신: 니케',
    jobTag: '시스템',
    systemTag: '가챠 시스템',
    category: '성장·강화',
    title: '니케 가챠 역기획 — 중복을 성장 재화로 흡수하는 설계',
    likes: 27,
    bookmarks: 12,
    challengeId: 'ch-1',
    aiScore: 86,
    publishedDaysAgo: 30,
    sections: [
      [
        '개요',
        '니케의 모집은 중복 캐릭터를 조각으로 흡수해 "꽝 없는 가챠"에 가깝게 만든다. 중복 불만을 성장으로 치환한다.',
      ],
      [
        '시스템 규칙',
        '픽업 확률 + 중복 시 조각 지급 → 한계돌파. 천장 포인트가 이월되어 장기 목표가 된다.',
      ],
      [
        '분석/개선',
        '중복을 재화로 흡수하면 단기 불만은 줄지만 특정 캐릭터 편중이 남는다 — 범용 조각(와일드)이 그 보정 장치다.',
      ],
    ],
    comments: [
      [
        3,
        '가챠해설가',
        '중복→조각 흡수를 "불만의 치환"으로 본 게 핵심이에요. 원신 이월 천장과 비교하면 더 선명해집니다.',
        20,
      ],
    ],
  },
  {
    slug: 'ch1-uma',
    author: '픽셀도트',
    type: '역기획',
    templateId: 'system',
    gameTag: '우마무스메',
    jobTag: '시스템',
    systemTag: '가챠 시스템',
    category: '성장·강화',
    title: '우마무스메 가챠 역기획 — 캐릭터와 서포트 이중 가챠',
    likes: 18,
    bookmarks: 9,
    challengeId: 'ch-1',
    aiScore: 79,
    publishedDaysAgo: 29,
    sections: [
      [
        '개요',
        '캐릭터 가챠와 서포트카드 가챠가 분리되어, 육성 성능은 사실상 서포트에 달려 있다. 이 분리가 과금 포인트를 이원화한다.',
      ],
      ['시스템 규칙', '서포트 돌파(같은 카드 중첩)가 성능을 좌우 → "완돌"이 실질 천장이 된다.'],
      [
        '분석/개선',
        '성능을 서포트로 옮겨 캐릭터 가챠의 심리적 부담을 낮추되, 완돌 요구로 총지출은 오히려 높인 구조로 보인다.',
      ],
    ],
  },
  {
    slug: 'ch1-fgo',
    author: '클리어타임',
    type: '역기획',
    templateId: 'system',
    gameTag: 'Fate/Grand Order',
    jobTag: '시스템',
    systemTag: '가챠 시스템',
    category: '성장·강화',
    title: 'FGO 가챠 역기획 — 천장 없는 가챠는 어떻게 유지되나',
    likes: 12,
    bookmarks: 5,
    challengeId: 'ch-1',
    aiScore: 73,
    publishedDaysAgo: 31,
    sections: [
      [
        '개요',
        'FGO는 오랫동안 천장이 없던 대표적 가챠다. 스토리 몰입이 확률 불만을 상쇄하는 구조를 본다.',
      ],
      [
        '시스템 규칙',
        '픽업 확률이 낮고 이월도 제한적. 대신 스토리·캐릭터 IP가 지출 동기의 큰 축이다.',
      ],
      [
        '분석/개선',
        '"콘텐츠가 곧 천장"인 설계 — 확률 대신 서사로 리텐션을 잡는다. IP가 약하면 성립하기 어려운 모델이다.',
      ],
    ],
    comments: [
      [
        3,
        '밸런스노트',
        'IP로 확률 불만을 상쇄한다는 해석, 설득력 있어요. 후에 천장이 도입된 맥락까지 붙이면 완결됩니다.',
        25,
      ],
    ],
  },
  {
    slug: 'ch1-hsr',
    author: '별철기록',
    type: '역기획',
    templateId: 'system',
    gameTag: '붕괴: 스타레일',
    jobTag: '시스템',
    systemTag: '가챠 시스템',
    category: '성장·강화',
    title: '스타레일 가챠 역기획 — 원신 공식을 다듬은 이월 천장',
    likes: 22,
    bookmarks: 10,
    challengeId: 'ch-1',
    aiScore: 91,
    publishedDaysAgo: 28,
    sections: [
      [
        '개요',
        '스타레일은 원신의 이월 천장 공식을 계승하되, 광추(무기) 가챠를 분리해 파워 곡선을 조절한다.',
      ],
      [
        '시스템 규칙',
        '캐릭터·광추 배너 분리, 반천장→확정 천장 구조, 카운트 이월. 재화 배포가 원신보다 후한 편.',
      ],
      [
        '분석/개선',
        '이월 천장의 매몰 비용 심리는 그대로 쓰되, 재화 배포를 늘려 무·소과금 접근성을 높인 "완화형 원신"으로 읽힌다.',
      ],
    ],
    comments: [
      [
        3,
        '가챠해설가',
        '"완화형 원신"이라는 요약이 정확해요. 두 게임의 재화 수급을 표로 나란히 두면 결정적 근거가 됩니다.',
        26,
      ],
    ],
  },
]

// ── 진행 챌린지 참가자 수 채우기용(가벼운 제출작; 마감 전이라 카드엔 카운트로만 노출) ──
const ONGOING = [
  [
    'ch-zelda',
    'level',
    '젤다의 전설: 브레스 오브 더 와일드',
    '사당 설계',
    '진행·레벨',
    [
      ['사당순례자', '전투 사당의 학습 곡선', 84],
      ['레벨디자인러', '구슬 사당 3종 비교', 77],
    ],
  ],
  [
    'ch-hades',
    'system',
    '하데스',
    '신의 은총(빌드)',
    '성장·강화',
    [
      ['로그라이크러', '아프로디테×아레스 듀오 분석', 88],
      ['메타이론', '희귀도 승급의 기대값', 80],
    ],
  ],
  [
    'ch-pitch',
    'pitch',
    '노바(가제)',
    '한 줄 콘셉트',
    '콘셉트·피치',
    [
      ['인디기획생', '중력을 뒤집는 한 판 20분 게임', 82],
      ['시즌패스', '소리로만 길을 찾는 협동 게임', 75],
    ],
  ],
  [
    'ch-loop',
    'gameplay',
    '루프캐처(가제)',
    '단일 행동 루프',
    '메커닉·밸런스',
    [
      ['코어루프연구', '낚싯대 하나로 30분 붙잡기', 85],
      ['밸런스노트', '한 버튼 리듬 루프', 71],
    ],
  ],
]

const JOB_BY_TEMPLATE = {
  system: '시스템',
  content: '컨텐츠',
  uiux: 'UI/UX',
  level: '레벨',
  pitch: '피치',
  gameplay: '게임플레이',
  concept: '콘셉트',
  world: '세계관',
  bizmodel: 'BM',
  free: '자유',
}

function buildDocRow(d) {
  const id = mockId(d.slug)
  let sections
  if (d.fieldsDoc) {
    sections = d.sections.map(([heading, guideKey, fields], i) =>
      fieldSection(
        d.slug,
        i + 1,
        heading,
        guideKey,
        fields.map(([key, label, value]) => ({ key, label, value })),
      ),
    )
  } else {
    sections = d.sections.map(([heading, content], i) => section(d.slug, i + 1, heading, content))
  }
  const comments = (d.comments ?? []).map((c, idx) => {
    // fieldsDoc: [sectionHeadingIndex(1-based within), n, author, content, daysAgo] via section title match
    if (d.fieldsDoc) {
      const [heading, n, author, content, dd] = c
      const secIdx = d.sections.findIndex((s) => s[0] === heading) + 1
      return comment(d.slug, idx + 1, `${d.slug}-${secIdx}`, author, content, dd)
    }
    const [secN, author, content, dd] = c
    return comment(d.slug, idx + 1, `${d.slug}-${secN}`, author, content, dd)
  })
  return {
    id,
    author_id: null,
    author_name: d.author,
    type: d.type,
    template_id: d.templateId,
    status: 'published',
    is_example: false,
    title: d.title,
    game_tag: d.gameTag,
    job_tag: d.jobTag,
    system_tag: d.systemTag,
    category: d.category,
    challenge_id: d.challengeId ?? null,
    ai_score: d.aiScore ?? null,
    feedback_wanted: false,
    likes: d.likes ?? pseudoLikes(d.slug),
    bookmarks: d.bookmarks ?? 0,
    sections,
    comments,
    published_at: daysAgo(d.publishedDaysAgo ?? 10),
  }
}

function buildOngoingRow(
  challengeId,
  templateId,
  gameTag,
  systemTag,
  category,
  author,
  title,
  aiScore,
  idx,
) {
  const slug = `${challengeId}-sub${idx}`
  return {
    id: mockId(slug),
    author_id: null,
    author_name: author,
    type:
      templateId === 'system' ||
      templateId === 'level' ||
      templateId === 'content' ||
      templateId === 'uiux'
        ? '역기획'
        : '순기획',
    template_id: templateId,
    status: 'published',
    is_example: false,
    title,
    game_tag: gameTag,
    job_tag: JOB_BY_TEMPLATE[templateId],
    system_tag: systemTag,
    category,
    challenge_id: challengeId,
    ai_score: aiScore,
    feedback_wanted: false,
    likes: pseudoLikes(slug, 1, 20),
    bookmarks: 0,
    sections: [
      section(slug, 1, '개요', `${gameTag}의 ${systemTag}을(를) 주제로 한 챌린지 제출작입니다.`),
      section(slug, 2, '분석', '제출 마감 전이라 상세 내용은 공개되지 않습니다. (목데이터)'),
    ],
    comments: [],
    published_at: daysAgo(2),
  }
}

// 인기 예시(is_example) 문서에 좋아요·북마크·사람 코멘트를 얹는다.
const EXAMPLE_COMMENTS = [
  [
    '던전공방',
    '섹션을 구역으로 나눈 게 깔끔해요. 각 구역이 "무엇을 가르치는지" 한 줄씩 붙이면 학습 곡선이 더 또렷해집니다.',
  ],
  [
    'UX관찰자',
    '관찰에서 멈추지 않고 의도까지 추론한 점이 좋네요. 근거로 든 장면을 하나만 더 구체화해도 설득력이 올라갑니다.',
  ],
  [
    '밸런스노트',
    '수치를 조건과 함께 적은 부분이 인상적이에요. 변곡점이 어떤 유저 행동을 노렸는지까지 가면 완성도가 높아집니다.',
  ],
  [
    '코어루프연구',
    '반복을 지탱하는 장치를 잘 짚었어요. "그럼에도 지루해지는 구간"을 한 줄 더하면 균형 잡힌 분석이 됩니다.',
  ],
]

async function seed() {
  const rows = DOCS.map(buildDocRow)
  ONGOING.forEach(([cid, tpl, game, sys, cat, subs]) => {
    subs.forEach(([author, title, score], i) =>
      rows.push(buildOngoingRow(cid, tpl, game, sys, cat, author, title, score, i + 1)),
    )
  })

  unwrap(await supabase.from('documents').upsert(rows, { onConflict: 'id' }))
  console.log(`목 문서 ${rows.length}편 upsert 완료`)

  // 예시 문서: 좋아요·북마크 세팅 + 일부에 사람 코멘트 추가.
  const examples = unwrap(
    await supabase.from('documents').select('id, sections, comments').eq('is_example', true),
  )
  let touched = 0
  let commented = 0
  for (const [idx, ex] of examples.entries()) {
    const likes = pseudoLikes(ex.id, 2, 40)
    const bookmarks = pseudoLikes(ex.id, 0, 16)
    const update = { likes, bookmarks }
    // 4편에 1편 꼴로 사람 코멘트 1개 부착(중복 방지: 기존 mock- 코멘트 제거 후).
    let comments = (ex.comments ?? []).filter((c) => !String(c.id).startsWith('mock-'))
    if (idx % 4 === 0 && ex.sections?.length) {
      const [author, content] = EXAMPLE_COMMENTS[(idx / 4) % EXAMPLE_COMMENTS.length]
      const sec = ex.sections[Math.min(1, ex.sections.length - 1)]
      comments = [
        ...comments,
        {
          id: `mock-ex-${ex.id}`,
          section_id: sec.id,
          author,
          is_ai: false,
          content,
          created_at: daysAgo(3),
        },
      ]
      commented++
    }
    unwrap(
      await supabase
        .from('documents')
        .update({ ...update, comments })
        .eq('id', ex.id),
    )
    touched++
  }
  console.log(`예시 문서 ${touched}편 좋아요·북마크 세팅, ${commented}편에 사람 코멘트 추가`)

  await summarize()
}

async function clean() {
  const ids = [
    ...DOCS.map((d) => mockId(d.slug)),
    ...ONGOING.flatMap(([cid, , , , , subs]) => subs.map((_, i) => mockId(`${cid}-sub${i + 1}`))),
  ]
  unwrap(await supabase.from('documents').delete().in('id', ids))
  console.log(`목 문서 ${ids.length}편 삭제`)

  // 예시 문서: mock- 코멘트 제거 + 좋아요·북마크·ai_score 0/null 복원.
  const examples = unwrap(
    await supabase.from('documents').select('id, comments').eq('is_example', true),
  )
  let restored = 0
  for (const ex of examples) {
    const comments = (ex.comments ?? []).filter((c) => !String(c.id).startsWith('mock-'))
    unwrap(
      await supabase
        .from('documents')
        .update({ comments, likes: 0, bookmarks: 0, ai_score: null })
        .eq('id', ex.id),
    )
    restored++
  }
  console.log(`예시 문서 ${restored}편 원상복구(코멘트·카운트)`)
  await summarize()
}

async function fixOrphans() {
  // 프론트 challenges.js에 없는 challenge_id를 가진 문서의 링크 해제.
  const valid = ['ch-zelda', 'ch-hades', 'ch-pitch', 'ch-loop', 'ch-1']
  const rows = unwrap(
    await supabase.from('documents').select('id, challenge_id').not('challenge_id', 'is', null),
  )
  const orphans = rows.filter((r) => !valid.includes(r.challenge_id))
  for (const o of orphans)
    unwrap(await supabase.from('documents').update({ challenge_id: null }).eq('id', o.id))
  console.log(`고아 챌린지 링크 ${orphans.length}건 해제`)
}

async function summarize() {
  const { data } = await supabase
    .from('documents')
    .select('author_name,is_example,likes,ai_score,challenge_id,comments')
    .eq('status', 'published')
  const human = data.filter((d) => !d.is_example).length
  const liked = data.filter((d) => d.likes > 0).length
  const scored = data.filter((d) => d.ai_score != null).length
  const humanC = data.reduce((a, d) => a + (d.comments || []).filter((c) => !c.is_ai).length, 0)
  const byCh = {}
  data.forEach((d) => d.challenge_id && (byCh[d.challenge_id] = (byCh[d.challenge_id] || 0) + 1))
  console.log(
    `\n[집계] 발행 ${data.length} · 사람문서 ${human} · 좋아요>0 ${liked} · ai_score ${scored} · 사람코멘트 ${humanC}`,
  )
  console.log('[집계] 챌린지별 제출:', JSON.stringify(byCh))
}

const arg = process.argv[2]
const run = arg === '--clean' ? clean : arg === '--fix-orphans' ? fixOrphans : seed
run().catch((e) => {
  console.error(e)
  process.exit(1)
})
