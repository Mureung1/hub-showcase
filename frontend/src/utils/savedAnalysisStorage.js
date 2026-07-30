export const SAVED_ANALYSES_STORAGE_KEY = 'savedAnalysisResults'
export const SAVED_ANALYSES_SCHEMA_VERSION = 1

function createSavedAnalysisId(analysisRequest) {
  const listingNumber = analysisRequest?.listingInfo?.fields?.listingNumber
  const address = analysisRequest?.listingInfo?.fields?.address
  const source = listingNumber || address || 'listing'
  const randomSuffix = Math.random().toString(36).slice(2, 8)
  return `${Date.now()}-${randomSuffix}-${String(source).replace(/\s+/g, '-').slice(0, 32)}`
}

function hasRequiredSavedShape(item) {
  return Boolean(item.analysis && item.analysisRequest?.listingInfo && item.analysisRequest?.userInfo)
}

function normalizeSavedItem(item) {
  return {
    id: item.id || createSavedAnalysisId(item.analysisRequest),
    schemaVersion: SAVED_ANALYSES_SCHEMA_VERSION,
    savedAt: item.savedAt || new Date().toISOString(),
    analysis: item.analysis || null,
    analysisRequest: item.analysisRequest || null,
    selectedRouteMode: item.selectedRouteMode || '',
    selectedRouteKey: item.selectedRouteKey || item.selectedRouteMode || '',
  }
}

export function loadSavedAnalyses() {
  try {
    const saved = window.localStorage.getItem(SAVED_ANALYSES_STORAGE_KEY)
    if (!saved) {
      return []
    }

    const parsed = JSON.parse(saved)
    return Array.isArray(parsed) ? parsed.map(normalizeSavedItem).filter(hasRequiredSavedShape) : []
  } catch {
    return []
  }
}

export function saveAnalysisResult({ analysis, analysisRequest, selectedRouteMode, selectedRouteKey }) {
  const savedItems = loadSavedAnalyses()
  const nextItem = normalizeSavedItem({
    id: createSavedAnalysisId(analysisRequest),
    savedAt: new Date().toISOString(),
    analysis,
    analysisRequest,
    selectedRouteMode,
    selectedRouteKey,
  })
  const nextItems = [nextItem, ...savedItems]

  try {
    window.localStorage.setItem(SAVED_ANALYSES_STORAGE_KEY, JSON.stringify(nextItems))
  } catch {
    throw new Error('저장 공간을 사용할 수 없어 분석 결과를 저장하지 못했습니다.')
  }

  return nextItem
}

export function findSavedAnalysis(id) {
  return loadSavedAnalyses().find((item) => item.id === id) || null
}

export function deleteSavedAnalysis(id) {
  const nextItems = loadSavedAnalyses().filter((item) => item.id !== id)

  try {
    window.localStorage.setItem(SAVED_ANALYSES_STORAGE_KEY, JSON.stringify(nextItems))
  } catch {
    throw new Error('저장 목록을 수정하지 못했습니다.')
  }

  return nextItems
}
