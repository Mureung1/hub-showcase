import { createListingSummary, createListingWarnings, createUserSummary } from './listingValidation'
import { loadUserInfo } from './userInfoStorage'

export const defaultUserInfo = {
  school: '',
  contractType: '',
  moveInDate: '',
  budget: '',
  maxDeposit: '',
  maxMonthlyRent: '',
  maxMaintenanceFee: '',
  useTotalBudget: false,
  commuteDaysPerWeek: '',
  returnTime: '',
  destination: '',
  maxTravelTime: '',
  transportation: [],
  housingTypes: [],
  priorities: [],
  avoidConditions: [],
}

const userInfoCompareKeys = [
  'school',
  'contractType',
  'moveInDate',
  'budget',
  'maxDeposit',
  'maxMonthlyRent',
  'maxMaintenanceFee',
  'useTotalBudget',
  'commuteDaysPerWeek',
  'returnTime',
  'destination',
  'maxTravelTime',
  'transportation',
  'housingTypes',
  'priorities',
  'avoidConditions',
]

function normalizeComparableUserInfo(userInfo) {
  return userInfoCompareKeys.reduce((normalized, key) => {
    const value = userInfo?.[key]
    if (Array.isArray(value)) {
      normalized[key] = [...value].sort()
      return normalized
    }

    if (value === undefined || value === null) {
      normalized[key] = { type: 'empty', value: '' }
      return normalized
    }

    normalized[key] = { type: typeof value, value }
    return normalized
  }, {})
}

export function loadCurrentUserInfo() {
  return loadUserInfo(defaultUserInfo)
}

export function hasDifferentUserInfo(savedItems, currentUserInfo) {
  const currentComparable = JSON.stringify(normalizeComparableUserInfo(currentUserInfo))
  return savedItems.some((item) => (
    JSON.stringify(normalizeComparableUserInfo(item.analysisRequest?.userInfo)) !== currentComparable
  ))
}

export function createComparisonAnalysisRequest(savedItem, currentUserInfo) {
  const listingInfo = savedItem.analysisRequest?.listingInfo || {}
  const fields = listingInfo.fields || {}

  if (!Object.keys(fields).length) {
    throw new Error('재분석할 매물 정보가 부족합니다.')
  }

  return {
    createdAt: new Date().toISOString(),
    warnings: createListingWarnings(fields),
    userSummary: createUserSummary(currentUserInfo),
    listingSummary: createListingSummary(fields),
    userInfo: currentUserInfo,
    listingInfo,
  }
}
