import test from 'node:test'
import assert from 'node:assert/strict'

import { filterPostings, postingState, postingYear } from './postingFilters.js'

const postings = [
  {
    posting_id: 'recent-open',
    company: '네이버',
    title: '프론트엔드 개발자',
    cluster_tag: '빅테크·플랫폼',
    posted_at: '2026-03-02T10:00:00+09:00',
    status: 'open',
    closed_at: null,
  },
  {
    posting_id: 'prior-closed',
    company: '카카오페이',
    title: '결제 서비스',
    cluster_tag: '핀테크·금융',
    posted_at: '2025-03-17T10:00:00+09:00',
    closed_at: '2025-04-01T10:00:00+09:00',
  },
  {
    posting_id: 'older-active',
    company: '스타트업',
    title: 'React 엔지니어',
    cluster_tag: '스타트업',
    posted_at: '2024-07-08',
    status: 'active',
  },
]

test('공고 연도와 채용 상태를 서버 필드에서 읽는다', () => {
  assert.equal(postingYear(postings[0]), 2026)
  assert.equal(postingYear({ posted_at: null }), null)
  assert.equal(postingState(postings[0]), 'open')
  assert.equal(postingState(postings[1]), 'closed')
  assert.equal(postingState(postings[2]), 'open')
})

test('기업군·기간·상태·검색어를 모두 조합해 거른다', () => {
  assert.deepEqual(
    filterPostings(postings, {
      cluster: '핀테크·금융',
      period: 'prior',
      state: 'closed',
      query: '결제',
    }).map((posting) => posting.posting_id),
    ['prior-closed'],
  )
  assert.deepEqual(
    filterPostings(postings, { period: 'recent', state: 'open', query: '네이버' })
      .map((posting) => posting.posting_id),
    ['recent-open'],
  )
})

test('기간 필터는 2026년과 2024~2025년을 나눈다', () => {
  assert.deepEqual(
    filterPostings(postings, { period: 'prior' }).map((posting) => posting.posting_id),
    ['prior-closed', 'older-active'],
  )
})
