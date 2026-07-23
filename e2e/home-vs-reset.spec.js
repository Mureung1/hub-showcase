import { test, expect } from '@playwright/test'

// #21에서 만든 "홈"(상태 보존) vs "초기화"(완전 리셋) 버튼의 동작 차이를 검증한다.
test('홈 버튼은 상태를 보존하고, 초기화 버튼은 완전히 리셋한다', async ({ page }) => {
  await page.goto('/spec')
  const educationSelect = page.locator('.field', { hasText: '학력' }).locator('select')
  await educationSelect.selectOption('석사')

  // 홈: Context/localStorage를 그대로 두고 이동만 한다.
  await page.getByRole('button', { name: '홈' }).click()
  await page.waitForURL('**/')
  await expect(page.getByRole('button', { name: '지난 분석 이어하기' })).toBeVisible()

  await page.goto('/spec')
  await expect(educationSelect).toHaveValue('석사')

  // 초기화: Context(filters/spec/result)와 localStorage를 전부 초기화하고 랜딩으로 이동한다.
  await page.getByRole('button', { name: '초기화' }).click()
  await page.waitForURL('**/')
  await expect(page.getByRole('button', { name: '지난 분석 이어하기' })).toHaveCount(0)

  await page.goto('/spec')
  await expect(educationSelect).toHaveValue('학력무관')
})
