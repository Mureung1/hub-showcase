import {
  dedupeMarketNews,
  decodeHtmlEntities,
  mapNaverNewsItem,
  stripHtmlTags,
} from './naver-news.mapper'

describe('naver-news.mapper', () => {
  it('removes HTML tags and decodes entities', () => {
    expect(decodeHtmlEntities(stripHtmlTags('Samsung &amp; <b>SK</b> rally'))).toBe(
      'Samsung & SK rally',
    )
  })

  it('normalizes Naver news items and removes duplicate URLs/titles', () => {
    const first = mapNaverNewsItem(
      {
        title: '<b>반도체</b> 업황 회복',
        description: '삼성전자 &amp; SK하이닉스 상승',
        originallink: 'https://example.com/a',
        link: 'https://news.naver.com/a',
        pubDate: 'Mon, 27 Jul 2026 09:00:00 +0900',
      },
      'SECTOR',
      ['005930'],
    )
    const duplicate = mapNaverNewsItem(
      {
        title: '반도체 업황 회복',
        description: '중복 기사',
        originallink: 'https://example.com/a',
        link: 'https://news.naver.com/b',
        pubDate: 'Mon, 27 Jul 2026 09:01:00 +0900',
      },
      'SECTOR',
      ['005930'],
    )

    expect(first?.title).toBe('반도체 업황 회복')
    expect(first?.summary).toBe('삼성전자 & SK하이닉스 상승')
    expect(dedupeMarketNews([first, duplicate].filter((item) => item !== null))).toHaveLength(1)
  })
})
