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

/** '최대 5천만원' → 5000, '최대 300만원' → 300 (정렬용 상대 크기). FE sortSubsidies와 규칙 통일 */
function parseAmountForSort(amount: string): number {
  const cheonMan = amount.match(/(\d+)\s*천만/)
  if (cheonMan) return Number(cheonMan[1]) * 1000
  const man = amount.match(/(\d+)\s*만/)
  if (man) return Number(man[1])
  return 0
}

/** 정렬 규칙: match(내림차순) · deadline(dday 오름차순) · amount(금액 내림차순) · new(원순서 유지) */
function applySort(items: Subsidy[], sort: SortOption): Subsidy[] {
  const copy = [...items]
  switch (sort) {
    case 'deadline':
      return copy.sort((a, b) => a.dday - b.dday)
    case 'amount':
      return copy.sort((a, b) => parseAmountForSort(b.amount) - parseAmountForSort(a.amount))
    case 'new':
      return copy
    case 'match':
    default:
      return copy.sort((a, b) => b.match - a.match)
  }
}

/** Supabase에서 전체 row를 읽어 Subsidy[]로 변환. 실패 시 fallback 반환 */
async function loadAll(): Promise<Subsidy[]> {
  const { data, error } = await supabase.from(SUBSIDIES_TABLE).select('*')
  if (error) {
    console.error('[subsidies-repo] Supabase 조회 실패, 샘플 데이터로 대체:', error.message)
    return FALLBACK
  }
  return (data as SubsidyRow[]).map(rowToSubsidy)
}

/** 전체 목록 (정렬 적용) */
export async function findAll(sort: SortOption = 'match'): Promise<Subsidy[]> {
  return applySort(await loadAll(), sort)
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
 * 프로필 조건 매칭 + 정렬.
 * 현재 스키마에는 업종/지역 구조화 컬럼이 없어 조건 필터는 정렬 위주로만 동작한다.
 * (실제 조건 필터링은 subsidies 스키마 확장 후 — 3주차 매칭 알고리즘 범위)
 */
export async function match(
  _profile: OnboardingProfile,
  sort: SortOption = 'match',
): Promise<Subsidy[]> {
  return applySort(await loadAll(), sort)
}
