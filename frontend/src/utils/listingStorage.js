export const LISTING_STORAGE_KEY = 'listingInfo'

export const defaultListingFields = {
  address: '',
  deposit: '',
  monthlyRent: '',
  maintenanceFee: '',
  area: '',
  floor: '',
  options: '',
  distanceFromSchool: '',
}

export function loadListingInfo() {
  try {
    const saved = window.localStorage.getItem(LISTING_STORAGE_KEY)
    return saved ? JSON.parse(saved) : null
  } catch {
    return null
  }
}

export function saveListingInfoToStorage(listingInfo) {
  const data = {
    ...listingInfo,
    savedAt: new Date().toISOString(),
  }

  window.localStorage.setItem(LISTING_STORAGE_KEY, JSON.stringify(data))
  return data
}
