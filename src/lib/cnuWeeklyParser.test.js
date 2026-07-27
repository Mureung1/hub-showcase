import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { describe, it, expect } from 'vitest'
import { parseCnuBuildingWeek } from './cnuWeeklyParser.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// 실제 충남대 생협 식단 페이지(제3학생회관, searchView=date, 2026-07 확인)를 그대로 캡처한 고정
// 픽스처 — 네트워크 없이 실제 응답 형식 그대로 테스트한다(guide Step 7-1 요구사항).
const FIXTURE_HTML = readFileSync(path.join(__dirname, '..', '..', 'server', 'test', 'fixtures', 'cnu-weekly.html'), 'utf8')

describe('parseCnuBuildingWeek — 실제 픽스처(제3학생회관) 기준', () => {
  const { dates, byDate } = parseCnuBuildingWeek(FIXTURE_HTML)

  it('월~토 6일 날짜 열을 그대로 뽑는다', () => {
    expect(dates).toEqual(['20260727', '20260728', '20260729', '20260730', '20260731', '20260801'])
  })

  it('조식은 이 건물에서 전부 미운영(closed)', () => {
    expect(byDate['20260727'].breakfast.student.status).toBe('closed')
    expect(byDate['20260727'].breakfast.staff.status).toBe('closed')
  })

  it('정식(6000) 직원 중식 — 가격·메뉴를 정확히 파싱하고 (pork included) 주석을 M10으로 태깅한다', () => {
    const lunch = byDate['20260727'].lunch.staff
    expect(lunch.status).toBe('open')
    expect(lunch.price).toBe(6000)
    const dumplingSoup = lunch.menus.find((m) => m.name === '만두탕수')
    expect(dumplingSoup).toBeTruthy()
    expect(dumplingSoup.allergyCodes).toContain('M10')
    expect(dumplingSoup.estimated).toBe(true)
  })

  it('학생 중식(정식 4000원)은 직원과 다른 별도 메뉴 — 두 트랙이 독립적으로 파싱된다', () => {
    const staffLunch = byDate['20260727'].lunch.staff
    const studentLunch = byDate['20260727'].lunch.student
    expect(studentLunch.price).toBe(4000)
    expect(staffLunch.price).toBe(6000)
    expect(studentLunch.menus.map((m) => m.name)).not.toEqual(staffLunch.menus.map((m) => m.name))
  })

  it('(beef included)/(chicken included) 주석도 각각 M16/M15로 태깅하고 이름에서 제거한다', () => {
    const wedLunch = byDate['20260729'].lunch.staff
    const beefItem = wedLunch.menus.find((m) => m.name === '소불고기')
    expect(beefItem.allergyCodes).toContain('M16')

    const thuLunch = byDate['20260730'].lunch.staff
    const chickenItem = thuLunch.menus.find((m) => m.name === '들깨백닭갈비')
    expect(chickenItem.allergyCodes).toContain('M15')
  })

  it('토요일(마지막 열)은 운영안함 — closed', () => {
    expect(byDate['20260801'].lunch.staff.status).toBe('closed')
  })

  it('주석 제거 후 남은 이름에도 키워드 태깅(tagAllergensFromMenuName)이 함께 적용된다', () => {
    // "만두탕수(pork included)" -> 주석 제거로 M10, 그리고 "만두"라는 이름 자체도 M6(밀) 키워드에 걸린다.
    const dumplingSoup = byDate['20260727'].lunch.staff.menus.find((m) => m.name === '만두탕수')
    expect(dumplingSoup.allergyCodes).toEqual(expect.arrayContaining(['M6', 'M10']))
  })
})

describe('parseCnuBuildingWeek — 운영중단 케이스(작은 단위 스니펫)', () => {
  // 실제 사이트에서 캡처한 "운영중단(내부공사)" 셀 그대로(제2학생회관, 2026-07 확인) — 표 구조만
  // 최소화해 이 케이스 하나를 격리해서 검증한다.
  const SUSPENDED_HTML = `
    <table>
      <thead><tr><th colspan="2">구분</th><th scope="col">월 <br />2026.07.27</th></tr></thead>
      <tbody>
        <tr><td class='building' rowspan=2>중식</td><td>직원</td><td>운영안함</td></tr>
        <tr><td>학생</td><td>
          <ul><li><h3 class="menu-tit03">정식(null)</h3><p>운영중단(내부공사)<br /></p></li></ul>
        </td></tr>
      </tbody>
    </table>
  `

  it('"정식(null)" + 운영중단 사유 텍스트 -> status suspended, price는 반영하지 않는다', () => {
    const { byDate } = parseCnuBuildingWeek(SUSPENDED_HTML)
    const lunch = byDate['20260727'].lunch.student
    expect(lunch.status).toBe('suspended')
    expect(lunch.price).toBeNull()
    expect(lunch.note).toBe('운영중단(내부공사)')
    expect(lunch.menus).toEqual([])
  })
})

describe('parseCnuBuildingWeek — 예상 못한 셀 형식(부분 성공 허용)', () => {
  const UNKNOWN_HTML = `
    <table>
      <thead><tr><th colspan="2">구분</th><th scope="col">월 <br />2026.07.27</th></tr></thead>
      <tbody>
        <tr><td class='building' rowspan=2>중식</td><td>직원</td><td>어쩐지 낯선 안내문</td></tr>
        <tr><td>학생</td><td>운영안함</td></tr>
      </tbody>
    </table>
  `

  it('제목(menu-tit03)이 없는 미확인 형식은 그 슬롯만 unknown으로 남기고 예외를 던지지 않는다', () => {
    const { byDate } = parseCnuBuildingWeek(UNKNOWN_HTML)
    expect(byDate['20260727'].lunch.staff.status).toBe('unknown')
    expect(byDate['20260727'].lunch.staff.note).toContain('어쩐지 낯선 안내문')
    expect(byDate['20260727'].lunch.student.status).toBe('closed')
  })
})
