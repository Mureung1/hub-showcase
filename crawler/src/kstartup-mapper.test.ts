import { REGIONS } from '@hub/shared'
import { describe, expect, it } from 'vitest'
import type { KstartupAnnouncement } from './kstartup-client.js'
import {
  inferKstartupMethod,
  mapKstartupAnnouncementToSubsidy,
  mapKstartupRegion,
  mapKstartupSupportRealm,
  parseBizEnyy,
  parseKstartupDeadline,
} from './kstartup-mapper.js'

const NOW = new Date(2026, 6, 28) // 2026-07-28

const baseAnnouncement: KstartupAnnouncement = {
  pbanc_sn: 178662,
  biz_pbanc_nm: '2026년도 방산 특화 창업중심대학 창업기업 모집 공고',
  pbanc_ntrp_nm: '중소벤처기업부 장관',
  pbanc_ctnt: '방산 분야 창업 활성화 및 사업화 지원을 위해 우수한 창업 아이템을 보유한 방산 창업기업을 모집',
  pbanc_rcpt_bgng_dt: '20260724',
  pbanc_rcpt_end_dt: '20260812',
  aply_trgt: '일반기업',
  aply_trgt_ctnt: '업력 7년 이내 창업기업',
  aply_excl_trgt_ctnt: '공고문 내 신청제외 대상 참조',
  biz_enyy: '7년미만,10년미만',
  supt_regin: '전국',
  supt_biz_clsfc: '사업화',
  detl_pg_url: 'https://www.k-startup.go.kr/web/contents/bizpbanc-ongoing.do?schM=view&pbancSn=178662',
  prch_cnpl_no: '1357',
  aply_mthd_onli_rcpt_istc: 'https://www.k-startup.go.kr/web/contents/webPMSBizUnvs.do',
  aply_mthd_vst_rcpt_istc: null,
  aply_mthd_fax_rcpt_istc: null,
  aply_mthd_eml_rcpt_istc: null,
  aply_mthd_pssr_rcpt_istc: null,
  aply_mthd_etc_istc: null,
  rcrt_prgs_yn: 'Y',
}

describe('parseKstartupDeadline', () => {
  it('YYYYMMDD 형식 종료일 기준으로 deadline과 dday를 계산한다', () => {
    const result = parseKstartupDeadline('20260812', NOW)
    expect(result.deadline).toBe('2026. 8. 12')
    expect(result.dday).toBe(15) // 2026-07-28 -> 2026-08-12
  })

  it('형식이 아닌 값은 원문 그대로 두고 dday는 큰 값(9999)을 준다', () => {
    const result = parseKstartupDeadline('예산 소진시까지', NOW)
    expect(result.deadline).toBe('예산 소진시까지')
    expect(result.dday).toBe(9999)
  })

  it('이미 지난 마감일은 음수 dday를 반환한다', () => {
    const result = parseKstartupDeadline('20260701', NOW)
    expect(result.dday).toBeLessThan(0)
  })
})

describe('mapKstartupRegion', () => {
  it('"전국"이면 REGIONS 전체를 반환한다', () => {
    expect(mapKstartupRegion('전국')).toHaveLength(16)
  })

  it('알려진 단일 지역이면 해당 지역 1개만 반환한다', () => {
    expect(mapKstartupRegion('서울')).toEqual(['서울'])
  })

  it('값이 없으면 빈 배열을 반환한다', () => {
    expect(mapKstartupRegion(undefined)).toEqual([])
  })

  it('목록에 없는 값이면 빈 배열을 반환한다(지역 정보 없음으로 간주)', () => {
    expect(mapKstartupRegion('알수없는지역')).toEqual([])
  })
})

describe('parseBizEnyy', () => {
  it('토큰 중 최댓값을 businessYearsMax로 채택한다', () => {
    const result = parseBizEnyy('예비창업자,1년미만,2년미만,3년미만,5년미만,7년미만,10년미만')
    expect(result.businessYearsMax).toBe(10)
    expect(result.businessYears).toBe('예비창업자,1년미만,2년미만,3년미만,5년미만,7년미만,10년미만')
  })

  it('"10년미만" 없이 "7년미만"까지만 있으면 7을 채택한다', () => {
    const result = parseBizEnyy('7년미만')
    expect(result.businessYearsMax).toBe(7)
  })

  it('"예비창업자"만 있으면 0을 채택한다', () => {
    const result = parseBizEnyy('예비창업자')
    expect(result.businessYearsMax).toBe(0)
  })

  it('값이 없으면 둘 다 undefined다', () => {
    expect(parseBizEnyy(undefined)).toEqual({})
  })
})

describe('inferKstartupMethod', () => {
  it('온라인 필드만 있으면 "온라인"', () => {
    expect(inferKstartupMethod(baseAnnouncement)).toBe('온라인')
  })

  it('온라인+방문 필드가 모두 있으면 "온라인+방문"', () => {
    expect(
      inferKstartupMethod({ ...baseAnnouncement, aply_mthd_vst_rcpt_istc: '방문 접수처' }),
    ).toBe('온라인+방문')
  })

  it('방문 필드만 있으면 "방문"', () => {
    expect(
      inferKstartupMethod({
        ...baseAnnouncement,
        aply_mthd_onli_rcpt_istc: null,
        aply_mthd_vst_rcpt_istc: '방문 접수처',
      }),
    ).toBe('방문')
  })

  it('아무 필드도 없으면 "기타"', () => {
    expect(
      inferKstartupMethod({ ...baseAnnouncement, aply_mthd_onli_rcpt_istc: null }),
    ).toBe('기타')
  })
})

describe('mapKstartupSupportRealm', () => {
  it('알려진 supt_biz_clsfc 값을 bizinfo 카테고리로 번역한다', () => {
    expect(mapKstartupSupportRealm('사업화')).toBe('경영')
    expect(mapKstartupSupportRealm('정책자금')).toBe('금융')
    expect(mapKstartupSupportRealm('판로ㆍ해외진출')).toBe('수출')
  })

  it('알 수 없는 값이나 미제공이면 "기타"로 대체한다', () => {
    expect(mapKstartupSupportRealm('알수없는분류')).toBe('기타')
    expect(mapKstartupSupportRealm(undefined)).toBe('기타')
  })
})

describe('mapKstartupAnnouncementToSubsidy', () => {
  it('실제 API 응답 형태를 Subsidy 타입으로 정확히 매핑한다', () => {
    const result = mapKstartupAnnouncementToSubsidy(baseAnnouncement, NOW)

    expect(result).toEqual({
      id: 'KS_178662',
      name: '2026년도 방산 특화 창업중심대학 창업기업 모집 공고',
      org: '중소벤처기업부 장관',
      amount: '공고문 참조',
      dday: 15,
      match: 50,
      deadline: '2026. 8. 12',
      method: '온라인',
      qualifications: ['업력 7년 이내 창업기업'],
      documents: ['공고문 원문에서 확인해주세요'],
      how: '공고문 원문에서 확인해주세요',
      where: '중소벤처기업부 장관',
      whereUrl: 'https://www.k-startup.go.kr/web/contents/bizpbanc-ongoing.do?schM=view&pbancSn=178662',
      contact: '1357',
      region: [...REGIONS],
      industry: [],
      supportRealm: '경영',
      businessYears: '7년미만,10년미만',
      businessYearsMax: 10,
    })
  })

  it('aply_trgt_ctnt가 없으면 fallback 문구를 쓴다', () => {
    const result = mapKstartupAnnouncementToSubsidy({ ...baseAnnouncement, aply_trgt_ctnt: undefined }, NOW)
    expect(result.qualifications).toEqual(['공고문 원문에서 확인해주세요'])
  })

  it('prch_cnpl_no가 없으면 fallback 연락처를 쓴다', () => {
    const result = mapKstartupAnnouncementToSubsidy({ ...baseAnnouncement, prch_cnpl_no: undefined }, NOW)
    expect(result.contact).toBe('공고문 원문 참조')
  })
})
