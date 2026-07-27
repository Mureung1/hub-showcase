import { NO_DEADLINE_DDAY, REGIONS, type Subsidy } from '@hub/shared'
import type { BizinfoAnnouncement } from './bizinfo-client.js'
import { kstToday } from './kst.js'

const FALLBACK_QUALIFICATION = '공고문 원문에서 확인해주세요'
const FALLBACK_DOCUMENT = '공고문 원문에서 확인해주세요'
export const FALLBACK_AMOUNT = '공고문 참조'
const FALLBACK_HOW = '공고문 원문에서 확인해주세요'
const FALLBACK_CONTACT = '공고문 원문 참조'
/** 조건 기반 매칭 알고리즘 도입 전까지의 중립값 (3주차 범위). 0은 "안 맞음"으로 오인되어 제외 */
const NEUTRAL_MATCH = 50

/** 구분자로 "-"와 "."을 모두 허용한다 — 실제 DB에 "2020.01.01 ~ 2026.12.31" 형태도 확인됨(1건) */
const DATE_RANGE_PATTERN = /(\d{4})[-.](\d{2})[-.](\d{2})\s*~\s*(\d{4})[-.](\d{2})[-.](\d{2})/

/**
 * 억/천만/백만/만 단위를 다룬다. 실제 API 300건 샘플(2026-07-23)에서 "기업당 최대 70백만원",
 * "보증한도 최대 40억원", "과제당 지원금 최대 3.8억원"처럼 백만/억 단위 지원금액도 흔했다.
 * 소수점(예: "6.45백만원")도 실사례가 있어 digit 그룹에 포함한다.
 * **주의**: server/subsidies-repo.ts의 parseAmountForSort, FE sortSubsidies는 아직 천만/만
 * 단위만 인식한다 — 이 필드를 실제로 파이프라인에 연결하는 시점(#44 묶음 2)에 두 곳도 백만/억
 * 단위를 인식하도록 함께 넓혀야 금액순 정렬이 깨지지 않는다.
 */
const AMOUNT_PATTERN = /([\d,]+(?:\.\d+)?)\s*(억|천만|백만|만)\s*원/g
/** "지원" 근처인지 확인하는 범위(문자 수) — "700만원) 지원"처럼 괄호가 끼는 경우까지 허용 */
const AMOUNT_FOLLOW_UP_WINDOW = 6

interface ParsedDeadline {
  deadline: string
  dday: number
}

/** "2026-07-20 ~ 2026-08-14" → 종료일 기준 deadline 텍스트 + dday. 날짜 형식이 아니면 원문 그대로 둔다 */
export function parseDeadline(reqstBeginEndDe: string, now: Date): ParsedDeadline {
  const match = reqstBeginEndDe.match(DATE_RANGE_PATTERN)
  if (!match) {
    return { deadline: reqstBeginEndDe, dday: NO_DEADLINE_DDAY }
  }

  const [, , , , endYear, endMonth, endDay] = match
  const endDate = new Date(Number(endYear), Number(endMonth) - 1, Number(endDay))
  const today = kstToday(now)
  const dday = Math.round((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  return {
    deadline: `${endYear}. ${Number(endMonth)}. ${Number(endDay)}`,
    dday,
  }
}

/** 접수방법 원문에서 짧은 신청 방식 라벨을 유추한다 (샘플 데이터의 '온라인'/'온라인+방문' 규칙과 통일) */
export function inferMethod(reqstMthPapersCn: string | undefined): string {
  if (!reqstMthPapersCn) return '기타'

  const hasOnline = /온라인|이메일|시스템/.test(reqstMthPapersCn)
  const hasVisit = /방문/.test(reqstMthPapersCn)

  if (hasOnline && hasVisit) return '온라인+방문'
  if (hasVisit) return '방문'
  if (hasOnline) return '온라인'
  return '기타'
}

/**
 * bsnsSumryCn(사업개요) 원문에서 지원금액을 추출한다.
 * "최대 200만원 지원" 형태를 정규식으로 잡되, "연매출 1억 4백만원 미만" 같은 자격 기준 문구를
 * 지원금액으로 오인하지 않도록 "최대" 접두어 또는 "지원" 후행 문맥이 있을 때만 채택한다.
 * 못 찾으면 null — 호출부에서 기존 fallback 문구를 유지한다.
 */
export function extractAmount(bsnsSumryCn: string): string | null {
  const text = bsnsSumryCn.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ')

  for (const match of text.matchAll(AMOUNT_PATTERN)) {
    const before = text.slice(Math.max(0, match.index - 6), match.index)
    const after = text.slice(
      match.index + match[0].length,
      match.index + match[0].length + AMOUNT_FOLLOW_UP_WINDOW,
    )

    const hasMaxPrefix = /최대\s*$/.test(before)
    const hasSupportSuffix = /^[\s).,·]*(이내\s*)?지원/.test(after)

    if (hasMaxPrefix || hasSupportSuffix) {
      const [, amount, unit] = match
      return `최대 ${amount.replace(/,/g, '')}${unit}원`
    }
  }

  return null
}

const REGION_SET: ReadonlySet<string> = new Set(REGIONS)

/**
 * 업종 키워드 사전 (이슈 #52). `src/data/onboardingSteps.ts`의 `INDUSTRY_OPTIONS` 값과 카테고리
 * 라벨이 정확히 일치해야 `scoreForProfile`에서 매칭이 동작한다 — 온보딩 업종 옵션이 바뀌면 이
 * 사전도 같이 갱신할 것 (`기타`는 자유 텍스트라 추출 대상에서 제외).
 *
 * 실 API 500건 표본(2026-07-25)으로 정확도를 검증하며 확정한 키워드:
 * - `제과`는 "경제과학진흥원" 같은 단어에 우연히 포함되는 오탐이 있어 `제과점`으로 좁힘
 * - `제외` 근접 문맥(예: "유통업체 제외")은 아래 EXCLUDE_WINDOW로 걸러냄
 */
const INDUSTRY_KEYWORDS: Record<string, RegExp> = {
  '음식점': /음식점|외식업|요식업|식당/,
  '카페·베이커리': /카페|베이커리|제과점|커피/,
  '소매·유통': /도소매|유통업|소매업/,
  '서비스업': /서비스업/,
  '제조업': /제조업체|제조업/,
}

/** 매칭된 키워드 뒤 이 범위 안에 "제외"가 있으면 부정 문맥으로 간주해 매칭에서 뺀다 */
const INDUSTRY_EXCLUDE_WINDOW = 20

/**
 * bsnsSumryCn(사업개요) + trgetNm(지원대상)에서 업종 태그를 추출한다 (이슈 #52).
 * [#43](https://github.com/syd348/hub/issues/43)에서 trgetNm만으로는 0.2%(3/1500)만 매칭돼
 * 보류했으나, bsnsSumryCn까지 포함하고 동의어를 넓히니 정확도 검증 후 6.6%(33/500)로 개선됨
 * (상세: docs/week4/issue-52-industry-match-plan.md). 여러 업종이 동시에 매칭될 수 있다
 * (예: "제조업, 서비스업" 둘 다 언급된 공고).
 */
export function extractIndustry(bsnsSumryCn: string, trgetNm: string | undefined): string[] {
  const text = `${bsnsSumryCn} ${trgetNm ?? ''}`.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ')

  const result: string[] = []
  for (const [category, pattern] of Object.entries(INDUSTRY_KEYWORDS)) {
    const match = text.match(pattern)
    if (!match || match.index === undefined) continue

    const after = text.slice(
      match.index + match[0].length,
      match.index + match[0].length + INDUSTRY_EXCLUDE_WINDOW,
    )
    if (after.includes('제외')) continue

    result.push(category)
  }
  return result
}

/**
 * hashtags에서 시/도 태그를 추출한다 (이슈 #43). 실API 500건 조사(2026-07-23) 결과 hashtags는
 * "대분류,지역,...세부키워드" 형태의 콤마 구분 문자열이고, 지역 태그 개수가 뚜렷한 이분포를
 * 보였다: 정확히 1개(64%, 특정 지역 한정) / 16개=REGIONS 전체(33%, 전국 대상) / 2~14개(2.4%,
 * "대전ㆍ세종" 같은 광역권 통합 공고). 개수로 분기하지 않고 **매칭된 지역을 그대로 배열로
 * 반환** — 전국 대상 공고는 자연히 16개 전부가 담기므로, 호출부에서 `.includes(profile.region)`
 * 검사만 하면 전국/광역권/단일 지역이 모두 같은 방식으로 매칭된다.
 * hashtags가 없거나 지역 태그가 하나도 없으면 빈 배열(지역 정보 없음).
 */
export function extractRegions(hashtags: string | undefined): string[] {
  if (!hashtags) return []
  const tags = hashtags.split(',').map((tag) => tag.trim())
  return [...new Set(tags.filter((tag) => REGION_SET.has(tag)))]
}

/** 여러 줄 접수방법 안내를 상세화면 한 줄 표시에 맞게 정리한다. 원문이 없으면 안내 문구로 대체 */
function normalizeWhitespace(text: string | undefined): string {
  if (!text) return FALLBACK_HOW
  return text.replace(/\s+/g, ' ').trim()
}

/** bizinfo API 응답 1건을 Subsidy 타입으로 정규화한다 (#28 매핑안 기준, fallback 값은 week3_plan.md 참고) */
export function mapAnnouncementToSubsidy(
  item: BizinfoAnnouncement,
  now: Date = new Date(),
): Subsidy {
  const { deadline, dday } = parseDeadline(item.reqstBeginEndDe, now)
  const applyOrg = item.excInsttNm || item.jrsdInsttNm

  return {
    id: item.pblancId,
    name: item.pblancNm,
    org: item.jrsdInsttNm,
    amount: extractAmount(item.bsnsSumryCn) ?? FALLBACK_AMOUNT,
    dday,
    match: NEUTRAL_MATCH,
    deadline,
    method: inferMethod(item.reqstMthPapersCn),
    qualifications: item.trgetNm ? [item.trgetNm] : [FALLBACK_QUALIFICATION],
    documents: item.printFileNm ? [`첨부: ${item.printFileNm}`] : [FALLBACK_DOCUMENT],
    how: normalizeWhitespace(item.reqstMthPapersCn),
    where: applyOrg,
    whereUrl: item.pblancUrl,
    contact: item.refrncNm || FALLBACK_CONTACT,
    region: extractRegions(item.hashtags),
    industry: extractIndustry(item.bsnsSumryCn, item.trgetNm),
  }
}
