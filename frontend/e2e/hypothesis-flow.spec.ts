import { test, expect } from '@playwright/test'

// 실제 프론트(5173) -> vite proxy -> 백엔드(3000) -> Supabase/Gemini까지 전부 태우는
// 골든 패스 E2E. 이 테스트는 실제 Gemini 호출과 테스트용 Supabase 프로젝트 쓰기를
// 발생시킨다(PR마다 쿼터 소모) — GitHub Actions 워크플로 주석 참고.
// 생성된 프로젝트는 정리하지 않는다: 테스트용 Supabase 프로젝트는 격리되어 있으므로
// 위험은 없지만, 데이터가 계속 쌓이므로 주기적으로 비워야 한다.
test('가설을 입력하고 분석하면 AI 권고가 대시보드에 표시된다', async ({ page }) => {
  const title = `E2E 테스트 ${Date.now()}`

  await page.goto('/')

  await page.locator('#title').fill(title)
  await page.locator('#problem_definition').fill('E2E 스모크 테스트용 문제 정의')
  await page.getByPlaceholder('원인').fill('테스트 원인')
  await page.getByPlaceholder('결과').fill('테스트 결과')
  await page
    .getByPlaceholder(/전사문을 붙여넣거나/)
    .fill('진행자: 테스트 질문입니다.\n사용자: 테스트 답변입니다.')

  await page.getByRole('button', { name: '분석 시작' }).click()

  await expect(page).toHaveURL(/\/projects\/[a-f0-9-]+$/, { timeout: 45_000 })
  await expect(page.getByText(/유력함|근거 부족|수정 필요/)).toBeVisible({ timeout: 45_000 })
})
