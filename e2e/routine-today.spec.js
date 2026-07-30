import { test, expect } from '@playwright/test'

test('오늘의 루틴에 실제 운동이 표시된다', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByText('상체 세션')).toBeVisible()
  await expect(page.getByText('벤치프레스')).toBeVisible()
  await expect(page.getByText('오버헤드프레스')).toBeVisible()
})
