export function validateUserInfoStep(form, stepIndex) {
  const errors = {}

  if (stepIndex === 0 && !form.school.trim()) {
    errors.school = '학교명을 입력해주세요.'
  }

  if (stepIndex === 1) {
    const budget = Number(form.budget)
    if (!form.budget) {
      errors.budget = '월 주거 예산을 입력해주세요.'
    } else if (!Number.isFinite(budget) || budget <= 0) {
      errors.budget = '0보다 큰 금액을 입력해주세요.'
    }
  }

  if (stepIndex === 2) {
    if (!form.commuteDaysPerWeek) {
      errors.commuteDaysPerWeek = '주당 등교 횟수를 선택해주세요.'
    }

    if (!form.returnTime) {
      errors.returnTime = '주요 귀가 시간을 입력해주세요.'
    }
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0,
  }
}
