export const CAMPUS_PREFERENCES_STORAGE_KEY =
  'noticepilot:campus-preferences:v1'
export const CAMPUS_PREFERENCES_VERSION = 1
export const ACTIVE_INSTITUTION = 'kangwon'
export const CAMPUS_OPTIONS = [
  { id: 'chuncheon' },
  { id: 'samcheok' },
  { id: 'dogye' },
  { id: 'gangneung_wonju' },
]

const campusOrder = CAMPUS_OPTIONS.map((campus) => campus.id)
const campusIdSet = new Set(campusOrder)

export const defaultCampusPreferences = {
  activeInstitution: ACTIVE_INSTITUTION,
  selectedCampuses: [],
  includeCommonNotices: true,
}

export function normalizeSelectedCampuses(selectedCampuses) {
  if (!Array.isArray(selectedCampuses)) {
    return []
  }

  const selectedCampusSet = new Set(
    selectedCampuses.filter((campusId) => campusIdSet.has(campusId)),
  )

  return campusOrder.filter((campusId) => selectedCampusSet.has(campusId))
}

export function normalizeCampusPreferences(rawPreferences) {
  const institutionPreference =
    rawPreferences?.institutionPreferences?.[ACTIVE_INSTITUTION] ??
    rawPreferences

  return {
    activeInstitution: ACTIVE_INSTITUTION,
    selectedCampuses: normalizeSelectedCampuses(
      institutionPreference?.selectedCampuses,
    ),
    includeCommonNotices: true,
  }
}

export function loadCampusPreferences() {
  if (typeof window === 'undefined') {
    return defaultCampusPreferences
  }

  try {
    const storedValue = window.localStorage.getItem(
      CAMPUS_PREFERENCES_STORAGE_KEY,
    )

    if (!storedValue) {
      return defaultCampusPreferences
    }

    const parsedValue = JSON.parse(storedValue)

    if (parsedValue?.version !== CAMPUS_PREFERENCES_VERSION) {
      return defaultCampusPreferences
    }

    return normalizeCampusPreferences(parsedValue)
  } catch {
    return defaultCampusPreferences
  }
}

export function createCampusPreferencesStoragePayload(
  preferences,
  updatedAt = new Date().toISOString(),
) {
  const normalizedPreferences = normalizeCampusPreferences(preferences)

  return {
    version: CAMPUS_PREFERENCES_VERSION,
    activeInstitution: ACTIVE_INSTITUTION,
    institutionPreferences: {
      [ACTIVE_INSTITUTION]: {
        selectedCampuses: normalizedPreferences.selectedCampuses,
        includeCommonNotices: true,
        updatedAt,
      },
    },
  }
}

export function saveCampusPreferences(preferences) {
  if (typeof window === 'undefined') {
    return { persisted: false, reason: 'storage_unavailable' }
  }

  try {
    window.localStorage.setItem(
      CAMPUS_PREFERENCES_STORAGE_KEY,
      JSON.stringify(createCampusPreferencesStoragePayload(preferences)),
    )

    return { persisted: true }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[NoticePilot] Failed to persist campus preferences.', error)
    }

    return {
      persisted: false,
      reason: 'storage_unavailable',
      errorName: error?.name || '',
    }
  }
}

export function createCampusPreferencesSnapshot(preferences) {
  return normalizeCampusPreferences(preferences)
}
