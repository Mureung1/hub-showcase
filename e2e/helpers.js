// SpecPage/ResultPage에서 반복되는 조작을 모아둔 E2E 전용 헬퍼. vitest 유닛 테스트와는 무관.

// hasText는 부분 일치라 '전공'이 '부전공 (선택)' 필드에도 걸린다 — field-label이 label로 "시작"하는
// 필드만 골라 disambiguate한다("외국어 성적"처럼 뒤에 부가 안내문이 붙는 라벨은 여전히 매치된다).
function specField(page, label) {
  return page.locator('.field', { has: page.locator('.field-label', { hasText: new RegExp(`^${label}(\\s|$)`) }) })
}

export async function fillSpec(
  page,
  {
    education,
    isExperienced = false,
    careerMonths,
    major,
    minorMajor,
    foreignLanguages = [],
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

  if (minorMajor) {
    await specField(page, '부전공').locator('select').selectOption(minorMajor)
  }

  // 외국어 성적은 여러 개 추가할 수 있다 — 시험/점수를 고르고 "추가" 버튼을 눌러야 실제로 spec에 반영된다.
  for (const { test, score } of foreignLanguages) {
    const field = specField(page, '외국어 성적')
    await field.locator('select').first().selectOption(test)
    if (test === 'OPIc') {
      await field.locator('select').nth(1).selectOption(String(score))
    } else {
      await field.locator('input').fill(String(score))
    }
    await field.getByRole('button', { name: '추가' }).click()
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
