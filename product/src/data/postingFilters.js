const CLOSED_STATUSES = new Set(['closed', 'expired', 'inactive', 'ended'])
const OPEN_STATUSES = new Set(['open', 'active', 'published', 'ongoing', 'recruiting'])

export function postingYear(posting) {
  const match = String(posting?.posted_at || '').match(/^(\d{4})/)
  return match ? Number(match[1]) : null
}

export function postingState(posting) {
  if (posting?.closed_at) return 'closed'
  const status = String(posting?.status || '').trim().toLowerCase()
  if (CLOSED_STATUSES.has(status)) return 'closed'
  if (OPEN_STATUSES.has(status)) return 'open'
  // 기존 API는 status·closed_at을 생략한다. 필드가 없는 현재 공고는 진행 중으로 보여 준다.
  return 'open'
}

export function filterPostings(postings, filters = {}) {
  const query = String(filters.query || '').trim().toLowerCase()
  return postings.filter((posting) => {
    if (filters.cluster && posting.cluster_tag !== filters.cluster) return false

    const year = postingYear(posting)
    if (filters.period === 'recent' && year !== 2026) return false
    if (filters.period === 'prior' && year !== 2024 && year !== 2025) return false

    if (filters.state && filters.state !== 'all' && postingState(posting) !== filters.state) return false

    if (!query) return true
    const searchable = `${posting.company || ''} ${posting.title || ''} ${posting.cluster_tag || ''}`.toLowerCase()
    return searchable.includes(query)
  })
}
