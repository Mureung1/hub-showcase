import { test, expect } from '@playwright/test'
import { fillSpec, submitSpecAndWaitForResult } from './helpers'

// 완료 기준의 스펙 케이스: 매우 낮음/매우 높음/일부만 입력/외국어 미입력 — 각각 결과 화면까지 정상 도달하는지만 확인한다.
// /spec 진입 전 라우팅(랜딩→필터→스펙)은 full-flow.spec.js가 이미 다루므로, 여기서는 /spec으로 바로 진입한다.
const CASES = [
  { name: '매우 낮음 (기본값 그대로 제출)', spec: {} },
  {
    name: '매우 높음',
    spec: {
      education: '박사',
      isExperienced: true,
      careerMonths: 240,
      major: '소프트웨어학과',
      foreignTest: 'TOEIC',
      foreignScore: 990,
      certificates: ['정보처리기사', 'SQLD'],
      hasComputerSkill: true,
    },
  },
  { name: '일부만 입력 (학력만 변경)', spec: { education: '학사' } },
  {
    name: '외국어 미입력 (나머지는 채우되 외국어만 비움)',
    spec: {
      education: '학사',
      isExperienced: true,
      careerMonths: 12,
      major: '소프트웨어학과',
      certificates: ['정보처리기사'],
    },
  },
]

for (const { name, spec } of CASES) {
  test(`스펙 케이스 - ${name}: 결과 화면까지 도달한다`, async ({ page }) => {
    await page.goto('/spec')
    await fillSpec(page, spec)
    await submitSpecAndWaitForResult(page)
    await expect(page.locator('.stat-grid')).toBeVisible()
  })
}
