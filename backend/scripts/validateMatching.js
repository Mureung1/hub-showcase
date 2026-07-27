// 시드된 목데이터로 매칭 품질(1단계 후보 축소)을 눈으로 확인하는 검증 스크립트.
// Claude/Gemini 호출 없이(candidateFinder는 AI를 안 쓴다) 순수하게 SQL+점수 로직만 검증한다.
//
// 실행: node scripts/validateMatching.js (backend 디렉터리에서, seedMockLetters.js를 먼저 실행해둘 것)
//
// 설정값을 코드 수정 없이 바꿔가며 재실행하려면 env로 오버라이드한다. 예:
//   EXPOSURE_CAP_N=10 WEIGHT_KEYWORD=3 node scripts/validateMatching.js
import 'dotenv/config'
import { prisma } from '../src/lib/prisma.js'
import { findCandidates } from '../src/services/candidateFinder.js'
import { SEED_PREFIX } from './seedConstants.js'
import {
  EXPOSURE_CAP_N,
  CANDIDATE_LIMIT,
  MIN_CANDIDATES_BEFORE_RELAX,
  CONTENT_SCORE_WEIGHTS,
} from '../src/config/matchingConfig.js'

// seedMockLetters.js가 만든 "의도적으로 설계된" 케이스들 — 결과를 눈으로 검토하기 좋은 대상.
const CASE_SUFFIXES = [
  'case-a-jobsearch', // 불안+취업준비
  'case-a-checkup', // 불안+건강검진 (위 편지와 주감정은 같지만 상황이 다름)
  'case-b-career-1', // 막막함+진로고민
  'case-b-career-2', // 무력감+진로고민 (위 편지와 인접감정+유사상황)
  'case-c-raw', // 지침+취업준비(원문)
  'case-c-abbrev', // 지침+취준(줄임말) → keywordsNorm이 취업준비로 수렴해야 함
  'case-c-synonym', // 지침+구직(동의어) → 마찬가지
  'case-d-isolated', // 안도 — 후보 0건이 나와야 정상
  'case-e-risk-0', // risk_flag=true — 위기 분기(CRISIS_SENTINEL)로 빠져야 정상
]

function shortId(id) {
  return id.slice(0, 8)
}

function buildRow(caseName, letter, result) {
  if (result.crisis) {
    return {
      케이스: caseName,
      기준편지: shortId(letter.id),
      '1단계후보수': '-',
      Tier분포: '-',
      완화발동: '-',
      최상위3개: 'CRISIS_SENTINEL',
      비고: '위기 편지 — 1단계 미실행(정상)',
    }
  }
  return {
    케이스: caseName,
    기준편지: shortId(letter.id),
    '1단계후보수': result.candidates.length,
    Tier분포: JSON.stringify(result.snapshot.tierCounts),
    완화발동: result.snapshot.relaxation.join(',') || '없음',
    최상위3개: result.candidates.slice(0, 3).map((c) => shortId(c.id)).join(', ') || '(없음)',
    비고: '',
  }
}

async function main() {
  console.log('=== 매칭 검증 스크립트 ===')
  console.log(
    `현재 설정: EXPOSURE_CAP_N=${EXPOSURE_CAP_N}, CANDIDATE_LIMIT=${CANDIDATE_LIMIT}, ` +
      `MIN_CANDIDATES_BEFORE_RELAX=${MIN_CANDIDATES_BEFORE_RELAX}, WEIGHTS=${JSON.stringify(CONTENT_SCORE_WEIGHTS)}`,
  )
  console.log()

  const letters = await prisma.letter.findMany({
    where: { authorId: { in: CASE_SUFFIXES.map((s) => `${SEED_PREFIX}${s}`) } },
  })

  if (letters.length === 0) {
    console.log('시드 데이터가 없어요. 먼저 node scripts/seedMockLetters.js 를 실행해주세요.')
    return
  }

  const rows = []
  for (const suffix of CASE_SUFFIXES) {
    const letter = letters.find((l) => l.authorId === `${SEED_PREFIX}${suffix}`)
    if (!letter) {
      console.log(`(경고) ${suffix} 편지를 찾지 못함`)
      continue
    }
    const result = await findCandidates(letter, CANDIDATE_LIMIT)
    rows.push(buildRow(suffix, letter, result))
  }

  console.table(rows)

  // 일반 편지 샘플(케이스 편지 제외)에 대해 후보 0건 비율만 훑어서 눈으로 이상치가 있는지 확인한다.
  const generalSample = await prisma.letter.findMany({
    where: {
      authorId: { startsWith: SEED_PREFIX },
      taggingStatus: 'done', // 태깅 실패 편지(primaryEmotion 없음)는 findCandidates에 못 넣는다
      NOT: { authorId: { in: CASE_SUFFIXES.map((s) => `${SEED_PREFIX}${s}`) } },
    },
    take: 30,
  })
  let zeroCount = 0
  for (const letter of generalSample) {
    const result = await findCandidates(letter, CANDIDATE_LIMIT)
    if (!result.crisis && result.candidates.length === 0) zeroCount += 1
  }
  console.log(`\n일반 편지 샘플 ${generalSample.length}건 중 후보 0건: ${zeroCount}건 (0건에 가까울수록 정상)`)

  console.log(
    '\n참고: "정답 매칭"(사람이 직접 판단한 최선의 매칭 id)을 라벨로 준비해서 이 스크립트에 ' +
      '연결하면 시스템 선택과의 일치율까지 계산할 수 있다. 지금은 라벨이 없어 진단 표(후보수/' +
      '티어분포/완화여부)까지만 출력한다 — 표를 보고 눈으로 케이스별 기대 결과와 비교해서 검토한다.',
  )
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
