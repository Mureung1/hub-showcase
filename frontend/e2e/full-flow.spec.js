import { test, expect } from '@playwright/test'

// E2E 통합 테스트 (docs/checklist.md Week3, DoD: 실제 GitHub ID로 끝까지 흐름 성공).
// 랜딩 → ID입력 → 분석중(자동전환) → 프로필결과 → 이슈검색(자동전환) → 추천목록 → 상세, 7화면 happy path.
// mock 없이 실제 GitHub API·LLM을 그대로 타므로(backend/.env의 GITHUB_TOKEN/GEMINI_API_KEY 필요) 느릴 수 있다.
// kimsunho2000은 분석(24h 캐시)·같은 조건 재추천(하루 3회 상한 도달 시에도 에러 대신 캐시 반환)이라 반복 실행에 안전하다
const GITHUB_ID = 'kimsunho2000'

test('랜딩부터 상세까지 실제 GitHub ID로 전체 흐름을 통과한다', async ({ page }) => {
  test.setTimeout(120_000)

  // 1. 랜딩
  await page.goto('./')
  await page.getByRole('link', { name: 'GitHub으로 시작하기' }).first().click()

  // 2. ID 입력
  await expect(page.getByRole('heading', { name: /GitHub을 볼게요/ })).toBeVisible()
  await page.locator('#gh-id').fill(GITHUB_ID)
  await page.getByRole('button', { name: '내 활동 분석하기' }).click()

  // 3. 분석중 → 프로필 결과 (자동 전환, 실제 GitHub API 호출 포함)
  await page.waitForURL((url) => url.hash.startsWith('#/profile'), { timeout: 60_000 })
  await expect(page.locator('.profile-card')).toBeVisible()

  // 4. 조건 확인 → 이슈 검색 (자동 전환, 실제 GitHub 검색 + LLM 재순위 포함)
  await page.getByRole('link', { name: '이 조건으로 이슈 찾기' }).click()
  await page.waitForURL((url) => url.hash.startsWith('#/result'), { timeout: 60_000 })

  // 5. 추천 결과 목록 — 카드가 최소 1개는 있어야 상세로 넘어갈 수 있다
  await expect(page.getByRole('heading', { name: '이런 이슈는 어때요?' })).toBeVisible()
  const firstCard = page.locator('.card').first()
  await expect(firstCard).toBeVisible({ timeout: 10_000 })

  // 6. 상세
  await firstCard.click()
  await page.waitForURL((url) => url.hash.startsWith('#/detail'), { timeout: 10_000 })
  await expect(page.locator('.d-title')).not.toBeEmpty()
  await expect(page.getByRole('link', { name: 'GitHub에서 이슈 보기 ↗' })).toHaveAttribute(
    'href',
    /github\.com/,
  )
  await expect(page.getByRole('heading', { name: '기여 시작 가이드' })).toBeVisible()
})
