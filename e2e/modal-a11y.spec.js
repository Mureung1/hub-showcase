import { test, expect } from '@playwright/test'
import { fillSpec, submitSpecAndWaitForResult } from './helpers'

// #18: 공고 상세/인사이트 모달의 ESC 닫힘 + 포커스 트랩. useModalA11y 훅(src/hooks/useModalA11y.js)이
// 세 모달(JobDetailModal/InsightModal/ReferenceLinksModal)에 공통으로 붙어있다.

test('인사이트 모달은 ESC로 닫힌다', async ({ page }) => {
  await page.goto('/spec')
  await fillSpec(page, { education: '학사' })
  await page.getByRole('button', { name: '갭 분석 결과 보기' }).click()
  await page.waitForURL('**/result')

  const insightModal = page.locator('.insight-modal-box')
  await insightModal.waitFor({ timeout: 15_000 })
  await page.keyboard.press('Escape')
  await expect(insightModal).toBeHidden()
})

test('공고 상세 모달은 ESC로 닫히고, 닫으면 포커스가 원래 클릭했던 카드로 돌아온다', async ({ page }) => {
  await page.goto('/spec')
  await fillSpec(page, { education: '학사', major: '소프트웨어학과' })
  await submitSpecAndWaitForResult(page)

  const firstCard = page.locator('.job-card').first()
  await firstCard.focus()
  await firstCard.click()

  const detailModal = page.locator('.modal-box')
  await expect(detailModal).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(detailModal).toBeHidden()
  await expect(firstCard).toBeFocused()
})

test('공고 상세 모달 안에서 Tab을 여러 번 눌러도 포커스가 모달 밖으로 나가지 않는다', async ({ page }) => {
  await page.goto('/spec')
  await fillSpec(page, { education: '학사', major: '소프트웨어학과' })
  await submitSpecAndWaitForResult(page)

  await page.locator('.job-card').first().click()
  const detailModal = page.locator('.modal-box')
  await expect(detailModal).toBeVisible()

  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('Tab')
  }

  const focusInsideModal = await page.evaluate(() => {
    const box = document.querySelector('.modal-box')
    return box ? box.contains(document.activeElement) : false
  })
  expect(focusInsideModal).toBe(true)
})
