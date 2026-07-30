import { CONTRACT_TYPE_VALUES, NATIONAL_FLAGSHIP_UNIVERSITIES } from './userInfoOptions'

function validateOptionalNumber(errors, form, fieldName, message, { allowZero = true } = {}) {
  if (form[fieldName] === '' || form[fieldName] === null || form[fieldName] === undefined) {
    return
  }

  const value = Number(form[fieldName])
  const isValid = Number.isFinite(value) && (allowZero ? value >= 0 : value > 0)
  if (!isValid) {
    errors[fieldName] = message
  }
}

export function validateUserInfoStep(form, stepIndex) {
  const errors = {}

  if (stepIndex === 0) {
    if (!form.school.trim()) {
      errors.school = '소속 학교를 선택해주세요.'
    } else if (!NATIONAL_FLAGSHIP_UNIVERSITIES.includes(form.school)) {
      errors.school = '지원하는 학교 중에서 선택해주세요.'
    }

    if (!form.contractType) {
      errors.contractType = '계약 유형을 선택해주세요.'
    } else if (!CONTRACT_TYPE_VALUES.includes(form.contractType)) {
      errors.contractType = '지원하는 계약 유형 중에서 선택해주세요.'
    }
  }

  if (stepIndex === 1) {
    const budget = Number(form.budget)
    if (!form.budget) {
      errors.budget = '월 주거 예산을 입력해주세요.'
    } else if (!Number.isFinite(budget) || budget <= 0) {
      errors.budget = '0보다 큰 금액을 입력해주세요.'
    }

    validateOptionalNumber(errors, form, 'maxDeposit', '0 이상의 보증금을 입력해주세요.')
    validateOptionalNumber(errors, form, 'maxMonthlyRent', '0 이상의 월세를 입력해주세요.')
    validateOptionalNumber(errors, form, 'maxMaintenanceFee', '0 이상의 관리비를 입력해주세요.')
  }

  if (stepIndex === 2) {
    if (!form.commuteDaysPerWeek) {
      errors.commuteDaysPerWeek = '주당 등교 횟수를 선택해주세요.'
    }

    validateOptionalNumber(errors, form, 'maxTravelTime', '0보다 큰 이동 시간을 입력해주세요.', {
      allowZero: false,
    })
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0,
  }
}
