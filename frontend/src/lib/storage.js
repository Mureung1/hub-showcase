// localStorage 기반 초안/발행 저장 (프로토타입 한정 — MVP에서 Supabase로 교체 예정)

const DRAFTS_KEY = 'respec.drafts'
const PUBLISHED_KEY = 'respec.published'

function load(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? []
  } catch {
    return []
  }
}

function save(key, list) {
  localStorage.setItem(key, JSON.stringify(list))
}

export function loadDrafts() {
  return load(DRAFTS_KEY)
}

export function saveDraft(draft) {
  const drafts = loadDrafts().filter((d) => d.id !== draft.id)
  drafts.unshift(draft)
  save(DRAFTS_KEY, drafts)
}

export function deleteDraft(id) {
  save(
    DRAFTS_KEY,
    loadDrafts().filter((d) => d.id !== id),
  )
}

export function loadPublished() {
  return load(PUBLISHED_KEY)
}

export function publishDocument(doc) {
  const published = loadPublished().filter((d) => d.id !== doc.id)
  published.unshift(doc)
  save(PUBLISHED_KEY, published)
  deleteDraft(doc.id)
}

export function getPublishedDocument(id) {
  return loadPublished().find((d) => d.id === id)
}

export function addCommentToPublished(docId, comment) {
  const published = loadPublished()
  const doc = published.find((d) => d.id === docId)
  if (!doc) return false
  doc.comments = [...(doc.comments ?? []), comment]
  save(PUBLISHED_KEY, published)
  return true
}
