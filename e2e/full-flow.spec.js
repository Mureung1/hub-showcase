import { test, expect } from '@playwright/test'
import { fillSpec, submitSpecAndWaitForResult } from './helpers'

test('랜딩 → 필터 → 스펙 → 로딩 → 팝업 → 결과 → 상세 전체 플로우', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: '갭 분석 시작하기' })).toBeVisible()
  await page.getByRole('button', { name: '갭 분석 시작하기' }).click()
  await page.waitForURL('**/filter')

  await expect(page.getByRole('heading', { name: '1단계 · 조건 필터링' })).toBeVisible()
  await page.getByRole('button', { name: '다음: 스펙 입력하기' }).click()
  await page.waitForURL('**/spec')

  await expect(page.getByRole('heading', { name: '2단계 · 스펙 입력' })).toBeVisible()
  await fillSpec(page, { education: '학사', major: '소프트웨어학과' })
  await submitSpecAndWaitForResult(page)

  const firstCard = page.locator('.job-card').first()
  await expect(firstCard).toBeVisible()
  await firstCard.click()

  const detailModal = page.locator('.modal-box')
  await expect(detailModal).toBeVisible()
  await detailModal.getByRole('button', { name: '닫기' }).click()
  await expect(detailModal).toBeHidden()
})
