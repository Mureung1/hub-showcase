import { describe, expect, it } from 'vitest'
import type { BizinfoAnnouncement } from './bizinfo-client.js'
import { inferMethod, mapAnnouncementToSubsidy, parseDeadline } from './mapper.js'

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
    })
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
})
