import { describe, expect, test } from 'vitest'
import stats from './stats.js'

const { aggregate, heatmapLevel } = stats

// 폴백 집계는 라벨 표를 인자로 받는다. 서버 코드에 백엔드 상수를 두지 않는다.
const LABELS = {
  out_tags: { infra_deploy: { label: '인프라·배포', desc: 'Docker, AWS, CI/CD 운영' } },
  advanced_types: { traffic: '대용량 트래픽' },
  combos: [{ id: 'base', name: 'Java + Spring Boot', slugs: ['java'], desc: '기본 조합', level: '한 도메인 완성' }],
  reality_labels: { project_experience: '완성된 프로젝트 경험' },
  axis_labels: { performance: '성능·트래픽' },
}

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
    const result = aggregate([makePosting({ skills: [java, { ...java }] })], { job: 'backend', labels: LABELS })

    const frequency = result.tech_freq.find((item) => item.slug === 'java')
    const item = result.items.find((entry) => entry.item_id === 'java')

    expect(frequency.count).toBe(1)
    expect(frequency.pct).toBe(100)
    expect(item.freq_by_cluster).toEqual({ 플랫폼: 100 })
    expect(item.support).toEqual({ n_overall: 1, n_by_cluster: { 플랫폼: 1 } })
    expect(item.evidence.map((evidence) => evidence.posting_id)).toEqual(['R001'])
  })
})

describe('기업군 히트맵', () => {
  test.each([
    [null, '—'],
    [0, '약'],
    [30, '약'],
    [31, '중'],
    [69, '중'],
    [70, '강'],
    [100, '강'],
  ])('%s%%를 %s으로 분류한다', (value, expected) => {
    expect(heatmapLevel(value)).toBe(expected)
  })

  test('최근 3건과 이전 2건을 합쳐 기업군 표본 n=5로 집계한다', () => {
    const postings = [
      ...Array.from({ length: 3 }, (_, index) => makePosting({
        posting_id: `R00${index + 1}`,
        snapshot: 'recent',
        axis_mentions: index < 2 ? ['performance'] : [],
      })),
      ...Array.from({ length: 2 }, (_, index) => makePosting({
        posting_id: `P00${index + 1}`,
        snapshot: 'prev',
        axis_mentions: index === 0 ? ['performance'] : [],
      })),
    ]

    const result = aggregate(postings, { job: 'backend', labels: LABELS })

    expect(result.cluster_axes.rows).toEqual([
      {
        cluster: '플랫폼',
        n: 5,
        cells: [{ axis: '성능·트래픽', pct: 60, level: '중' }],
      },
    ])
  })
})

describe('폴백 집계의 라벨 처리', () => {
  test('라벨 표에서 태그와 축 이름을 읽는다', () => {
    const result = aggregate(
      [makePosting({ out_of_role_tags: ['infra_deploy'], axis_mentions: ['performance'], reality_tags: ['project_experience'] })],
      { job: 'backend', labels: LABELS }
    )

    expect(result.scope_expansion).toEqual([
      { tag: 'infra_deploy', label: '인프라·배포', desc: 'Docker, AWS, CI/CD 운영', count: 1, pct: 100 },
    ])
    expect(result.cluster_axes.axes).toEqual(['성능·트래픽'])
    expect(result.reality).toEqual([{ tag: 'project_experience', label: '완성된 프로젝트 경험', pct: 100 }])
    expect(result.job).toBe('backend')
  })
})

describe('폴백 집계가 다룰 수 없는 입력', () => {
  test('backend 가 아닌 직무는 빈 결과가 아니라 오류다', () => {
    expect(() => aggregate([makePosting()], { job: 'frontend', labels: LABELS }))
      .toThrowError(/backend 직무만 지원/)
  })

  test('직무를 주지 않아도 오류다', () => {
    let thrown = null
    try {
      aggregate([makePosting()], { labels: LABELS })
    } catch (error) {
      thrown = error
    }
    expect(thrown.code).toBe('UNSUPPORTED_FALLBACK_JOB')
  })

  test('라벨 표가 없으면 0% 를 내지 않고 오류를 던진다', () => {
    let thrown = null
    try {
      aggregate([makePosting()], { job: 'backend' })
    } catch (error) {
      thrown = error
    }
    expect(thrown.code).toBe('MISSING_LABELS')
  })

  test('라벨 표가 일부만 있어도 오류다', () => {
    let thrown = null
    try {
      aggregate([makePosting()], { job: 'backend', labels: { out_tags: {} } })
    } catch (error) {
      thrown = error
    }
    expect(thrown.code).toBe('MISSING_LABELS')
  })

  test('최근 스냅샷이 비면 오류다', () => {
    let thrown = null
    try {
      aggregate([makePosting({ snapshot: 'prev' })], { job: 'backend', labels: LABELS })
    } catch (error) {
      thrown = error
    }
    expect(thrown.code).toBe('EMPTY_DATASET')
  })
})
