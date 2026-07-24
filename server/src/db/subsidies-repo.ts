import type { OnboardingProfile, SortOption, Subsidy } from '@hub/shared'
import { sampleSubsidies } from '../data/sample-subsidies.js'
import { rowToSubsidy, type SubsidyRow } from './mappers.js'
import { SUBSIDIES_TABLE, supabase } from './supabase.js'

/**
 * subsidies 조회 레포지토리.
 * "데이터를 어디서/어떻게 가져오는가"를 라우트에서 분리하기 위함.
 * 라우트는 이 레이어만 호출한다 — Supabase 접근·정렬·fallback을 여기 한곳에 모은다.
 * Supabase 조회가 실패하면 서버가 죽지 않도록 sample-subsidies.ts로 fallback한다.
 */

const FALLBACK: Subsidy[] = sampleSubsidies as Subsidy[]

/**
 * '최대 5천만원' → 5000, '최대 300만원' → 300, '최대 40억원' → 400000 (정렬용 상대 크기, 만원 단위).
 * FE sortSubsidies와 규칙 통일. 크롤러 extractAmount(#44)가 백만/억/소수점 단위도 뽑아내므로
 * 이 네 단위를 모두 인식해야 금액순 정렬이 깨지지 않는다.
 */
function parseAmountForSort(amount: string): number {
  const eok = amount.match(/(\d+(?:\.\d+)?)\s*억/)
  if (eok) return Number(eok[1]) * 10000
  const cheonMan = amount.match(/(\d+(?:\.\d+)?)\s*천만/)
  if (cheonMan) return Number(cheonMan[1]) * 1000
  const baekMan = amount.match(/(\d+(?:\.\d+)?)\s*백만/)
  if (baekMan) return Number(baekMan[1]) * 100
  const man = amount.match(/(\d+(?:\.\d+)?)\s*만/)
  if (man) return Number(man[1])
  return 0
}

/**
 * 정렬 규칙: match(내림차순) · deadline(dday 오름차순) · amount(금액 내림차순) · new(원순서 유지).
 * match/deadline/amount는 동점일 때 id로 2차 정렬한다 — 이슈 #48 페이지네이션 도입 후 같은
 * 요청(같은 profile/sort)을 여러 페이지에 걸쳐 반복 호출해도 순서가 흔들리지 않게 하기 위함
 * (동점 항목이 많은 region 가중치 특성상 결정적 정렬이 아니면 항목 중복/누락이 생길 수 있음).
 */
function applySort(items: Subsidy[], sort: SortOption): Subsidy[] {
  const copy = [...items]
  switch (sort) {
    case 'deadline':
      return copy.sort((a, b) => a.dday - b.dday || a.id.localeCompare(b.id))
    case 'amount':
      return copy.sort(
        (a, b) => parseAmountForSort(b.amount) - parseAmountForSort(a.amount) || a.id.localeCompare(b.id),
      )
    case 'new':
      return copy
    case 'match':
    default:
      return copy.sort((a, b) => b.match - a.match || a.id.localeCompare(b.id))
  }
}

export interface PagedResult {
  items: Subsidy[]
  /** 페이지네이션 이전 전체 건수 */
  total: number
  page: number
  limit: number
  hasMore: boolean
}

export const DEFAULT_PAGE = 1
export const DEFAULT_LIMIT = 20

/** 정렬된 배열을 page/limit 기준으로 자른다 (이슈 #48) */
function paginate(items: Subsidy[], page: number, limit: number): PagedResult {
  const total = items.length
  const start = (page - 1) * limit
  return {
    items: items.slice(start, start + limit),
    total,
    page,
    limit,
    hasMore: start + limit < total,
  }
}

/** PostgREST가 .range() 없이는 최대 1000행까지만 반환하므로, 페이지 단위로 순회해 전부 가져온다 */
const PAGE_SIZE = 1000

/** Supabase에서 전체 row를 읽어 Subsidy[]로 변환. 실패 시 fallback 반환 */
async function loadAll(): Promise<Subsidy[]> {
  const rows: SubsidyRow[] = []
  let from = 0

  for (;;) {
    const { data, error } = await supabase
      .from(SUBSIDIES_TABLE)
      .select('*')
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)

    if (error) {
      console.error('[subsidies-repo] Supabase 조회 실패, 샘플 데이터로 대체:', error.message)
      return FALLBACK
    }

    rows.push(...(data as SubsidyRow[]))
    if (data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return rows.map(rowToSubsidy)
}

/** 전체 목록 (정렬 + 페이지네이션 적용) */
export async function findAll(
  sort: SortOption = 'match',
  page: number = DEFAULT_PAGE,
  limit: number = DEFAULT_LIMIT,
): Promise<PagedResult> {
  const sorted = applySort(await loadAll(), sort)
  return paginate(sorted, page, limit)
}

/** 단건 조회 — 없으면 null */
export async function findById(id: string): Promise<Subsidy | null> {
  const { data, error } = await supabase
    .from(SUBSIDIES_TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('[subsidies-repo] 단건 조회 실패, 샘플 데이터로 대체:', error.message)
    return FALLBACK.find((item) => item.id === id) ?? null
  }
  return data ? rowToSubsidy(data as SubsidyRow) : null
}

/**
 * region 조건 부합도에 따른 가점/감점 (이슈 #43).
 * - subsidy.region이 비어있으면(hashtags에 지역 태그가 하나도 없던 경우) 지역 정보가 없다는
 *   뜻이라 그대로 둔다(필터링하지 않음 — "안 보이는 것보다 보이는 게 낫다"는 NEUTRAL_MATCH
 *   설계와 동일한 원칙).
 * - 전국 대상 공고는 크롤러가 hashtags 전체(15~16개)를 region에 담으므로 profile.region이
 *   항상 포함돼 있어 자연스럽게 가점을 받는다 — 별도 "전국" 처리 불필요.
 * - 완전 필터링이 아니라 점수 조정만 하는 이유는 리스크 표 참고: 조건이 안 맞는다고 아예
 *   숨기면 사용자가 "왜 안 보이지" 혼란스러울 수 있어 정렬 우선순위 조정으로 시작한다.
 */
const REGION_MATCH_BONUS = 20
const REGION_MISMATCH_PENALTY = 20

/**
 * industry 조건 가점 (이슈 #52). region과 달리 **가점만 주고 불일치 페널티는 없다** —
 * [#43](https://github.com/syd348/hub/issues/43)의 trgetNm 전용 키워드 매칭은 0.2%(3/1500)만
 * 매칭돼 반영을 보류했었는데, bsnsSumryCn까지 포함하고 동의어를 넓혀 실 API 500건으로
 * 오탐(경제과학진흥원 등 substring 충돌, "~업 제외" 부정 문맥)까지 걸러낸 뒤 검증하니
 * 6.6%(33/500)로 개선됐다. 그래도 region(hashtags 기반, ~98% 커버리지)보다는 신뢰도가
 * 낮아 페널티는 넣지 않았다 — subsidy.industry가 비어있으면(대다수, ~93%) "업종 정보 없음"으로
 * 간주해 중립 유지. 상세: docs/week4/issue-52-industry-match-plan.md
 */
const INDUSTRY_MATCH_BONUS = 10

function scoreForProfile(subsidy: Subsidy, profile: OnboardingProfile): number {
  let score = subsidy.match

  if (subsidy.region.length > 0) {
    score = subsidy.region.includes(profile.region)
      ? Math.min(100, score + REGION_MATCH_BONUS)
      : Math.max(0, score - REGION_MISMATCH_PENALTY)
  }

  if (subsidy.industry.includes(profile.industry)) {
    score = Math.min(100, score + INDUSTRY_MATCH_BONUS)
  }

  return score
}

/**
 * 프로필 조건 매칭 + 정렬.
 * region은 가점/감점, industry는 가점만 위 scoreForProfile로 반영된다.
 */
export async function match(
  profile: OnboardingProfile,
  sort: SortOption = 'match',
  page: number = DEFAULT_PAGE,
  limit: number = DEFAULT_LIMIT,
): Promise<PagedResult> {
  const items = await loadAll()
  const scored = items.map((item) => ({ ...item, match: scoreForProfile(item, profile) }))
  const sorted = applySort(scored, sort)
  return paginate(sorted, page, limit)
}
