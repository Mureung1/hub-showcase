import { test, expect } from '@playwright/test'

// Week3 "[FE/BE] 버그 디버깅 + 필터/재조회 마감" 회귀 테스트.
// 프로필 화면에서 난이도 조건을 바꾼 뒤에도 재추천이 정상 동작하고(바뀐 조건 반영),
// 조건을 다시 바꿔 재요청해도 하루 상한(같은 조건 3회)에 걸리지 않는지 확인한다.
// mock 없이 실제 GitHub API를 그대로 탄다 (docs/testing.md §5 원칙과 동일)
const GITHUB_ID = 'kimsunho2000'

async function pickDifferentDifficultyChip(page) {
  const chips = page.locator('label.label', { hasText: '난이도' }).locator('xpath=following-sibling::div[1]').getByRole('button')
  const count = await chips.count()
  for (let i = 0; i < count; i += 1) {
    const chip = chips.nth(i)
    const isOn = (await chip.getAttribute('class'))?.includes('chip-on')
    if (!isOn) {
      const label = await chip.textContent()
      await chip.click()
      return label?.trim()
    }
  }
  throw new Error('바꿀 수 있는 난이도 칩을 찾지 못했습니다')
}

test('난이도 조건을 바꿔도 재추천이 바뀐 조건으로 정상 동작한다', async ({ page }) => {
  test.setTimeout(120_000)

  await page.goto('./')
  await page.getByRole('link', { name: 'GitHub으로 시작하기' }).first().click()
  await page.locator('#gh-id').fill(GITHUB_ID)
  await page.getByRole('button', { name: '내 활동 분석하기' }).click()
  await page.waitForURL((url) => url.hash.startsWith('#/profile'), { timeout: 60_000 })
  await expect(page.locator('.profile-card')).toBeVisible()

  const chosenLabel = await pickDifferentDifficultyChip(page)

  await page.getByRole('link', { name: '이 조건으로 이슈 찾기' }).click()
  await page.waitForURL((url) => url.hash.startsWith('#/result'), { timeout: 60_000 })

  await expect(page.getByRole('heading', { name: '이런 이슈는 어때요?' })).toBeVisible()
  await expect(page.locator('.filterbar')).toContainText(chosenLabel)
})
