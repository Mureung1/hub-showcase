import {
  AVOID_CONDITION_VALUES,
  CONTRACT_TYPE_VALUES,
  DESTINATION_VALUES,
  HOUSING_TYPE_VALUES,
  NATIONAL_FLAGSHIP_UNIVERSITIES,
  PRIORITY_VALUES,
  TRANSPORTATION_VALUES,
} from './userInfoOptions'

export const USER_INFO_STORAGE_KEY = 'userInfo'
export const USER_INFO_SCHEMA_VERSION = 2

function normalizeAllowedArray(value, allowedValues) {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((item) => allowedValues.includes(item))
}

function normalizeOptionalNumber(value, { min = 0 } = {}) {
  if (value === '' || value === null || value === undefined) {
    return ''
  }

  const numberValue = Number(value)
  if (!Number.isFinite(numberValue) || numberValue < min) {
    return ''
  }

  return numberValue
}

function normalizeBudget(value, isLegacyData) {
  const numberValue = normalizeOptionalNumber(value, { min: 1 })
  if (numberValue === '') {
    return ''
  }

  if (isLegacyData && numberValue > 10000) {
    return Math.round(numberValue / 10000)
  }

  return numberValue
}

function normalizeAllowedValue(value, allowedValues) {
  return allowedValues.includes(value) ? value : ''
}

function normalizeUserInfo(defaultForm, form) {
  const isLegacyData = form.schemaVersion !== USER_INFO_SCHEMA_VERSION

  return {
    ...defaultForm,
    schemaVersion: USER_INFO_SCHEMA_VERSION,
    school: normalizeAllowedValue(String(form.school || '').trim(), NATIONAL_FLAGSHIP_UNIVERSITIES),
    contractType: normalizeAllowedValue(form.contractType, CONTRACT_TYPE_VALUES),
    moveInDate: form.moveInDate || '',
    budget: normalizeBudget(form.budget, isLegacyData),
    maxDeposit: normalizeOptionalNumber(form.maxDeposit),
    maxMonthlyRent: normalizeOptionalNumber(form.maxMonthlyRent),
    maxMaintenanceFee: normalizeOptionalNumber(form.maxMaintenanceFee),
    useTotalBudget: Boolean(form.useTotalBudget),
    commuteDaysPerWeek: normalizeOptionalNumber(form.commuteDaysPerWeek),
    returnTime: form.returnTime || '',
    destination: normalizeAllowedValue(form.destination, DESTINATION_VALUES),
    maxTravelTime: normalizeOptionalNumber(form.maxTravelTime, { min: 1 }),
    transportation: normalizeAllowedArray(form.transportation, TRANSPORTATION_VALUES),
    housingTypes: normalizeAllowedArray(form.housingTypes, HOUSING_TYPE_VALUES),
    priorities: normalizeAllowedArray(form.priorities, PRIORITY_VALUES),
    avoidConditions: normalizeAllowedArray(form.avoidConditions, AVOID_CONDITION_VALUES),
  }
}

export function loadUserInfo(defaultForm) {
  try {
    const saved = window.localStorage.getItem(USER_INFO_STORAGE_KEY)
    return saved ? normalizeUserInfo(defaultForm, JSON.parse(saved)) : defaultForm
  } catch {
    return defaultForm
  }
}

export function saveUserInfoToStorage(form) {
  const data = normalizeUserInfo({}, form)

  window.localStorage.setItem(USER_INFO_STORAGE_KEY, JSON.stringify(data))
  return data
}
