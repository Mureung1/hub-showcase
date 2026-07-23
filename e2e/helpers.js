// SpecPage/ResultPage에서 반복되는 조작을 모아둔 E2E 전용 헬퍼. vitest 유닛 테스트와는 무관.

function specField(page, label) {
  return page.locator('.field', { hasText: label })
}

export async function fillSpec(
  page,
  {
    education,
    isExperienced = false,
    careerMonths,
    major,
    foreignTest,
    foreignScore,
    certificates = [],
    hasComputerSkill = false,
  } = {},
) {
  if (education) {
    await specField(page, '학력').locator('select').selectOption(education)
  }

  await specField(page, '경력').locator('select').selectOption(isExperienced ? '경력' : '신입')
  if (isExperienced && careerMonths != null) {
    await specField(page, '경력').locator('input').fill(String(careerMonths))
  }

  if (major) {
    await specField(page, '전공').locator('select').selectOption(major)
  }

  if (foreignTest) {
    await specField(page, '외국어 성적').locator('select').selectOption(foreignTest)
    if (foreignScore != null) {
      await specField(page, '외국어 성적').locator('input').fill(String(foreignScore))
    }
  }

  for (const cert of certificates) {
    await page.getByRole('button', { name: cert, exact: true }).click()
  }

  if (hasComputerSkill) {
    await page.locator('input[type="checkbox"]').check()
  }
}

// 스펙 제출 → 로딩 → 인사이트 팝업(항상 자동으로 뜸) 닫기 → 결과 화면 도달까지 한 번에 처리한다.
export async function submitSpecAndWaitForResult(page) {
  await page.getByRole('button', { name: '갭 분석 결과 보기' }).click()
  await page.waitForURL('**/result')

  const insightModal = page.locator('.insight-modal-box')
  await insightModal.waitFor({ timeout: 15_000 })
  await insightModal.locator('.insight-modal-btn').click()
  await insightModal.waitFor({ state: 'hidden' })

  await page.getByRole('heading', { name: '3단계 · 갭 분석 결과' }).waitFor()
}
