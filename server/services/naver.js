const NAVER_NEWS_URL = 'https://openapi.naver.com/v1/search/news.json';

function stripHtml(text) {
  // 네이버 검색 결과의 title/description엔 검색어 강조용 <b> 태그와 HTML 엔티티가 섞여있어서 걷어낸다
  return text
    .replace(/<\/?b>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

async function searchNews(query, { display = 20, start = 1, sort = 'date' } = {}) {
  const url = new URL(NAVER_NEWS_URL);
  url.searchParams.set('query', query);
  url.searchParams.set('display', display);
  url.searchParams.set('start', start);
  url.searchParams.set('sort', sort);

  const response = await fetch(url, {
    headers: {
      'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID,
      'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET,
    },
  });

  if (!response.ok) {
    throw new Error(`naver_api_error_${response.status}`);
  }

  const { items } = await response.json();

  return items.map((item) => ({
    title: stripHtml(item.title),
    description: stripHtml(item.description),
    // link는 네이버 뉴스 캐시 페이지, originallink가 실제 언론사 원문 URL — articles.url UNIQUE는 원문 기준으로 잡는다
    url: item.originallink || item.link,
    publishedAt: new Date(item.pubDate).toISOString(),
  }));
}

module.exports = { searchNews };
