import { describe, expect, it } from 'vitest'
import type { BizinfoAnnouncement } from './bizinfo-client.js'
import {
  extractAmount,
  extractIndustry,
  extractRegions,
  inferMethod,
  mapAnnouncementToSubsidy,
  parseDeadline,
} from './mapper.js'

const NOW = new Date(2026, 6, 22) // 2026-07-22, 로컬 타임존 기준 (월은 0-indexed)

const baseAnnouncement: BizinfoAnnouncement = {
  pblancId: 'PBLN_000000000124563',
  pblancNm: '울주군 2026년 2차 소상공인 경영환경개선 및 디지털기기 지원 사업 공고',
  jrsdInsttNm: '울산광역시',
  excInsttNm: '울주군청',
  reqstBeginEndDe: '2026-07-27 ~ 2026-08-07',
  bsnsSumryCn: '<p>소상공인 경영환경개선 지원</p>',
  trgetNm: '울주군 소재 소상공인',
  refrncNm: '울주군청 경제교통과 052-229-8353',
  reqstMthPapersCn: '온라인 접수 (울주군 소상공인지원포털)',
  pblancUrl: 'https://www.bizinfo.go.kr/sii/siia/selectSIIA200Detail.do?pblancId=PBLN_000000000124563',
  pldirSportRealmLclasCodeNm: '경영',
  totCnt: 1433,
  printFileNm: '[제출서류]_소상공인_경영환경개선_지원사업_신청서.hwpx',
  creatPnttm: '2026-07-21 10:00:00',
  updtPnttm: '2026-07-21 10:00:00',
  inqireCo: 100,
}

describe('parseDeadline', () => {
  it('날짜 범위 형식이면 종료일 기준 deadline과 dday를 계산한다', () => {
    const result = parseDeadline('2026-07-27 ~ 2026-08-07', NOW)
    expect(result.deadline).toBe('2026. 8. 7')
    expect(result.dday).toBe(16) // 2026-07-22 -> 2026-08-07
  })

  it('날짜 범위가 아닌 자유 텍스트는 원문 그대로 두고 dday는 큰 값(9999)을 준다', () => {
    const result = parseDeadline('예산 소진시까지', NOW)
    expect(result.deadline).toBe('예산 소진시까지')
    expect(result.dday).toBe(9999)
  })

  it('이미 지난 마감일은 음수 dday를 반환한다', () => {
    const result = parseDeadline('2026-07-01 ~ 2026-07-10', NOW)
    expect(result.dday).toBeLessThan(0)
  })

  it('구분자가 "."인 날짜 범위도 종료일 기준으로 파싱한다 (실제 DB 확인 케이스)', () => {
    const result = parseDeadline('2020.01.01 ~ 2026.12.31', NOW)
    expect(result.deadline).toBe('2026. 12. 31')
    expect(result.dday).toBe(162) // 2026-07-22 -> 2026-12-31
  })
})

describe('inferMethod', () => {
  it('온라인/이메일/시스템 키워드만 있으면 "온라인"', () => {
    expect(inferMethod('온라인 접수 (포털 시스템)')).toBe('온라인')
    expect(inferMethod('이메일 접수: test@example.com')).toBe('온라인')
  })

  it('방문 키워드만 있으면 "방문"', () => {
    expect(inferMethod('센터 방문 접수')).toBe('방문')
  })

  it('온라인·방문 키워드가 모두 있으면 "온라인+방문"', () => {
    expect(inferMethod('온라인 접수 후 방문 면담')).toBe('온라인+방문')
  })

  it('둘 다 없으면 "기타"', () => {
    expect(inferMethod('우편으로 신청서 발송')).toBe('기타')
  })
})

describe('extractAmount', () => {
  it('"최대 N만원 지원" 형태에서 금액을 추출한다', () => {
    expect(extractAmount('<p>업소당 1개의 노후 간판 교체 설치비 최대 200만원 지원</p>')).toBe('최대 200만원')
  })

  it('"최대 N만원 이내 지원" 형태에서 금액을 추출한다', () => {
    expect(extractAmount('업체당 검사비용 최대 200만원 이내 지원')).toBe('최대 200만원')
  })

  it('"최대" 접두어 없이 "N만원) 지원"처럼 지원 문맥이 뒤따르면 추출한다', () => {
    expect(extractAmount('사업화(기업 당 700만원) 지원')).toBe('최대 700만원')
  })

  it('천만원 단위도 추출한다', () => {
    expect(extractAmount('소상공인 경영안정자금 최대 3천만원 지원')).toBe('최대 3천만원')
  })

  it('실제 API 응답(2026-07-23 확인)의 "연매출 1억 4백만원 미만" 자격 기준을 지원금액으로 오인하지 않는다', () => {
    expect(extractAmount('어린이제품 : 연매출 1억 4백만원 미만 대상(연매출 기준: ...)')).toBeNull()
  })

  it('"자세한 지원내용 공고문 참조"처럼 금액 언급이 없으면 null을 반환한다', () => {
    expect(extractAmount('<p>강원특별자치도 첨단바이오 산업 육성... 자세한 지원내용 공고문 참조</p>')).toBeNull()
  })

  it('금액이 여러 번 등장하면 첫 유효 매칭을 사용한다', () => {
    expect(
      extractAmount('업체당 최대 200만원 지원, 초과분은 자기부담 최대 50만원'),
    ).toBe('최대 200만원')
  })

  it('백만원 단위 금액을 추출한다 (실제 API 응답 다수 확인, 2026-07-23)', () => {
    expect(extractAmount('기업당 최대 70백만원 지원')).toBe('최대 70백만원')
  })

  it('억원 단위 금액을 추출한다', () => {
    expect(extractAmount('보증한도 최대 40억원(보증비율 100%)')).toBe('최대 40억원')
  })

  it('소수점 금액(백만/억 단위)을 그대로 추출한다', () => {
    expect(extractAmount('과제당 지원금 최대 3.8억원')).toBe('최대 3.8억원')
    expect(extractAmount('기업 맞춤형 지원 - 기업당 6.45백만원 지원')).toBe('최대 6.45백만원')
  })

  it('억원 단위 자격 기준(매출액 등)은 지원금액으로 오인하지 않는다', () => {
    expect(extractAmount('2025년 기준 매출액 50억원 이상인 기업')).toBeNull()
    expect(extractAmount('기업가치 50억원 이하, 매출액 20억원 이하, 창업 7년 이내')).toBeNull()
  })
})

describe('extractRegions', () => {
  it('지역 태그가 1개면 그 지역만 반환한다', () => {
    expect(extractRegions('경영,서울,개별간판,2026,간판개선,동작구')).toEqual(['서울'])
  })

  it('16개 지역이 전부 태그된 전국형 공고는 전체 배열을 반환한다', () => {
    const nationwide =
      '기술,서울,부산,대구,인천,전남광주,대전,울산,세종,경기,강원,충북,충남,전북,경북,경남,제주,2026'
    expect(extractRegions(nationwide)).toHaveLength(16)
  })

  it('광역권 통합 공고(2~14개)는 매칭된 지역 전부를 배열로 반환한다', () => {
    expect(extractRegions('경영,대전,세종,글로벌진출,2026')).toEqual(['대전', '세종'])
  })

  it('전남광주 통합 지역 태그를 인식한다 (2026-07-01 전남광주통합특별시 출범 반영)', () => {
    expect(extractRegions('수출,전남광주,2026,미래차')).toEqual(['전남광주'])
  })

  it('hashtags가 없으면 빈 배열을 반환한다', () => {
    expect(extractRegions(undefined)).toEqual([])
  })

  it('지역 태그가 하나도 없으면 빈 배열을 반환한다', () => {
    expect(extractRegions('기술,클라우드,전시회,2026')).toEqual([])
  })

  it('중복 지역 태그는 한 번만 반환한다', () => {
    expect(extractRegions('서울,서울특별시할인,서울,2026')).toEqual(['서울'])
  })
})

describe('extractIndustry', () => {
  it('음식점 관련 키워드를 인식한다', () => {
    expect(extractIndustry('서울시 거주 외식업 창업희망 청년 대상', undefined)).toEqual(['음식점'])
  })

  it('카페·베이커리 키워드를 인식한다 (제과점 포함)', () => {
    expect(extractIndustry('일반ㆍ휴게음식점, 제과점, 집단급식소 중 식품안심업소', undefined)).toEqual([
      '음식점',
      '카페·베이커리',
    ])
  })

  it('제조업 키워드를 인식한다', () => {
    expect(extractIndustry('한국표준산업분류 대분류(C)제조업(10~34)에 해당되는 기업', undefined)).toEqual([
      '제조업',
    ])
  })

  it('여러 업종이 동시에 언급되면 전부 반환한다', () => {
    expect(extractIndustry('도소매업, 제조업 등 제조 및 유통 관련 업종 대상', undefined)).toEqual([
      '소매·유통',
      '제조업',
    ])
  })

  it('"제과"가 다른 단어에 우연히 포함된 경우(예: 경제과학진흥원) 오탐하지 않는다', () => {
    expect(extractIndustry('경기도경제과학진흥원은 도내 중소기업의 해외시장진출을 지원', undefined)).toEqual([])
  })

  it('"~업 제외"처럼 부정 문맥에 쓰인 업종은 매칭하지 않는다 (실 API 사례, 2026-07-25)', () => {
    expect(
      extractIndustry('중소제조기업(※ 유통업체 제외) - B2C 적합 제품을 생산하는 중소제조기업', undefined),
    ).toEqual([])
  })

  it('제외 문맥과 무관하게 등장하는 업종은 그대로 매칭한다', () => {
    expect(extractIndustry('제조업 기반 유망 중소기업 발굴 및 육성 사업. 유통업체는 별도 공고 참조', undefined)).toEqual(
      ['소매·유통', '제조업'],
    )
  })

  it('trgetNm에 있는 키워드도 함께 검색한다', () => {
    expect(extractIndustry('사업 개요', '카페ㆍ베이커리 업종 대상')).toEqual(['카페·베이커리'])
  })

  it('업종 키워드가 없으면 빈 배열을 반환한다', () => {
    expect(extractIndustry('디지털 전환 지원사업', undefined)).toEqual([])
  })
})

describe('mapAnnouncementToSubsidy', () => {
  it('실제 API 응답 형태를 Subsidy 타입으로 정확히 매핑한다', () => {
    const result = mapAnnouncementToSubsidy(baseAnnouncement, NOW)

    expect(result).toEqual({
      id: 'PBLN_000000000124563',
      name: '울주군 2026년 2차 소상공인 경영환경개선 및 디지털기기 지원 사업 공고',
      org: '울산광역시',
      amount: '공고문 참조',
      dday: 16,
      match: 50,
      deadline: '2026. 8. 7',
      method: '온라인',
      qualifications: ['울주군 소재 소상공인'],
      documents: ['첨부: [제출서류]_소상공인_경영환경개선_지원사업_신청서.hwpx'],
      how: '온라인 접수 (울주군 소상공인지원포털)',
      where: '울주군청',
      whereUrl: 'https://www.bizinfo.go.kr/sii/siia/selectSIIA200Detail.do?pblancId=PBLN_000000000124563',
      contact: '울주군청 경제교통과 052-229-8353',
      region: [],
      industry: [],
    })
  })

  it('hashtags가 있으면 region이 채워진다', () => {
    const result = mapAnnouncementToSubsidy({ ...baseAnnouncement, hashtags: '경영,울산,울주군,2026' }, NOW)
    expect(result.region).toEqual(['울산'])
  })

  it('bsnsSumryCn에 업종 키워드가 있으면 industry가 채워진다', () => {
    const result = mapAnnouncementToSubsidy(
      { ...baseAnnouncement, bsnsSumryCn: '<p>제조업 소상공인 경영환경개선 지원</p>' },
      NOW,
    )
    expect(result.industry).toEqual(['제조업'])
  })

  it('trgetNm이 없으면 qualifications는 안내 문구로 대체된다', () => {
    const result = mapAnnouncementToSubsidy({ ...baseAnnouncement, trgetNm: '' }, NOW)
    expect(result.qualifications).toEqual(['공고문 원문에서 확인해주세요'])
  })

  it('printFileNm이 없으면 documents는 안내 문구로 대체된다', () => {
    const result = mapAnnouncementToSubsidy({ ...baseAnnouncement, printFileNm: undefined }, NOW)
    expect(result.documents).toEqual(['공고문 원문에서 확인해주세요'])
  })

  it('excInsttNm이 없으면 where는 jrsdInsttNm으로 대체된다', () => {
    const result = mapAnnouncementToSubsidy({ ...baseAnnouncement, excInsttNm: '' }, NOW)
    expect(result.where).toBe('울산광역시')
  })

  it('여러 줄 접수방법 안내는 공백으로 정리된다', () => {
    const result = mapAnnouncementToSubsidy(
      { ...baseAnnouncement, reqstMthPapersCn: '이메일 접수\r\n- 담당자: a@example.com\r\n- 담당자2: b@example.com' },
      NOW,
    )
    expect(result.how).toBe('이메일 접수 - 담당자: a@example.com - 담당자2: b@example.com')
  })

  it('reqstMthPapersCn이 없으면 method는 "기타", how는 안내 문구로 대체된다', () => {
    const result = mapAnnouncementToSubsidy({ ...baseAnnouncement, reqstMthPapersCn: undefined }, NOW)
    expect(result.method).toBe('기타')
    expect(result.how).toBe('공고문 원문에서 확인해주세요')
  })

  it('refrncNm이 없으면 contact는 안내 문구로 대체된다', () => {
    const result = mapAnnouncementToSubsidy({ ...baseAnnouncement, refrncNm: undefined }, NOW)
    expect(result.contact).toBe('공고문 원문 참조')
  })
})
