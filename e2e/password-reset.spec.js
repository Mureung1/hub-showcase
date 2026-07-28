import { test, expect } from '@playwright/test'

// 실제 이메일 발송(링크 클릭 → 세션 생성 → 비밀번호 변경) 자체는 받은편지함 접근이 필요해
// 자동화할 수 없다 — #16이 로그인/북마크 플로우를 자체 스코프에서 제외한 것과 같은 이유.
// 여기서는 자동화 가능한 부분(진입 경로, 클라이언트 검증, 링크 없이 접근했을 때의 가드)만 다룬다.

test.describe('비밀번호 재설정', () => {
  test('로그인 페이지에서 비밀번호 찾기로 이동할 수 있다', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('link', { name: '비밀번호를 잊으셨나요?' }).click()
    await page.waitForURL('**/forgot-password')
    await expect(page.getByRole('heading', { name: '비밀번호 찾기' })).toBeVisible()
  })

  test('이메일 형식이 잘못되면 요청 없이 바로 안내한다', async ({ page }) => {
    await page.goto('/forgot-password')
    await page.locator('input[type="email"]').fill('abc@abc')
    await page.getByRole('button', { name: '재설정 링크 받기' }).click()
    await expect(page.getByText('올바른 이메일 형식이 아닙니다.')).toBeVisible()
  })

  test('정상 형식 이메일을 제출하면 발송 완료 안내를 보여준다', async ({ page }) => {
    // Supabase 무료 프로젝트의 이메일 발송 한도가 낮아, 테스트 실행마다 실제로 메일을 보내면
    // 사용자의 수동 검증용 한도를 갉아먹는다 — 발송 API(auth/v1/recover)만 스텁하고
    // 나머지(폼 검증, 상태 전환, 안내 문구)는 그대로 실제 페이지에서 검증한다.
    await page.route('**/auth/v1/recover', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }),
    )
    await page.goto('/forgot-password')
    await page.locator('input[type="email"]').fill('e2e-test@example.com')
    await page.getByRole('button', { name: '재설정 링크 받기' }).click()
    await expect(page.getByText('재설정 링크를 보냈어요')).toBeVisible()
  })

  test('유효한 재설정 세션 없이 /reset-password에 직접 접근하면 안내만 보여준다', async ({ page }) => {
    await page.goto('/reset-password')
    await expect(page.getByText('유효하지 않거나 만료된 링크')).toBeVisible()
  })
})
