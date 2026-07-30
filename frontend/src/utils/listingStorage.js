import { listingFieldNames } from './listingFieldDefinitions'

export const LISTING_STORAGE_KEY = 'listingInfo'
export const LISTING_SCHEMA_VERSION = 2

export const defaultListingFields = Object.fromEntries(
  listingFieldNames.map((fieldName) => [fieldName, '']),
)

function normalizeFields(fields = {}) {
  const normalized = Object.fromEntries(
    Object.keys(defaultListingFields).map((key) => [
      key,
      String(fields[key] || '').trim(),
    ]),
  )

  if (fields.area && !normalized.supplyArea && !normalized.exclusiveArea) {
    normalized.supplyArea = String(fields.area || '').trim()
  }

  return normalized
}

export function loadListingInfo() {
  try {
    const saved = window.localStorage.getItem(LISTING_STORAGE_KEY)
    if (!saved) {
      return null
    }

    const data = JSON.parse(saved)
    return {
      ...data,
      schemaVersion: LISTING_SCHEMA_VERSION,
      fields: normalizeFields(data.fields),
      imageName: data.imageName || '',
      imageType: data.imageType || '',
      ocrText: String(data.ocrText || '').trim(),
    }
  } catch {
    return null
  }
}

export function saveListingInfoToStorage(listingInfo) {
  const data = {
    ...listingInfo,
    schemaVersion: LISTING_SCHEMA_VERSION,
    fields: normalizeFields(listingInfo.fields),
    imageName: listingInfo.imageName || '',
    imageType: listingInfo.imageType || '',
    ocrText: String(listingInfo.ocrText || '').trim(),
    savedAt: new Date().toISOString(),
  }

  window.localStorage.setItem(LISTING_STORAGE_KEY, JSON.stringify(data))
  return data
}
