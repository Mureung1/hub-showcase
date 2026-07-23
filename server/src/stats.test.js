import { describe, expect, test } from 'vitest'
import stats from './stats.js'

const { aggregate } = stats

function makePosting(overrides = {}) {
  return {
    posting_id: 'R001',
    title: '백엔드 개발자 채용',
    company: '테스트 기업',
    cluster_tag: '플랫폼',
    snapshot: 'recent',
    source: { type: 'curation', url: '' },
    entry_label: '신입가능',
    edu_label: '학력무관',
    career_label: '신입가능',
    skills: [],
    out_of_role_tags: [],
    advanced_spans: [],
    axis_mentions: [],
    reality_tags: [],
    ...overrides,
  }
}

describe('채용공고별 기술 빈도 집계', () => {
  test('한 공고에 같은 기술이 반복되어도 공고 빈도는 한 번만 집계한다', () => {
    const java = { name: 'Java', slug: 'java', requirement: 'required' }
    const result = aggregate([
      makePosting({ skills: [java, { ...java }] }),
    ])

    const frequency = result.tech_freq.find((item) => item.slug === 'java')
    const item = result.items.find((entry) => entry.item_id === 'java')

    expect(frequency.count).toBe(1)
    expect(frequency.pct).toBe(100)
    expect(item.freq_by_cluster).toEqual({ 플랫폼: 100 })
    expect(item.support).toEqual({ n_overall: 1, n_by_cluster: { 플랫폼: 1 } })
    expect(item.evidence.map((evidence) => evidence.posting_id)).toEqual(['R001'])
  })
})
