const NAVER_NEWS_URL = 'https://openapi.naver.com/v1/search/news.json';
// 네이버 뉴스 검색 api를 호출해서 응답을 DB 스키마에 맞는 모양으로 정규화하기

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
    headers: { // 네이버 api는 Bearer 토큰이 아니라 Client ID/Secret를 헤더에 넣어야 한다
      'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID,
      'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET,
    },
  });

  if (!response.ok) {
    throw new Error(`naver_api_error_${response.status}`);
  }

  const { items } = await response.json();

  return items.map((item) => ({
    title: stripHtml(item.title), // 원본 필드명으로 들고다니지 않도록 내 DB 필드명으로 교체
    description: stripHtml(item.description),
    // 네이버 응답엔 URL이 두 개 온다
    // link는 네이버 뉴스 캐시 페이지, originallink가 실제 언론사 원문 URL
    // articles.url UNIQUE는 원문 기준으로 잡는다 (나중에 다른 소스를 추가해도 원문 URL 기준 중복 판단 규칙이 그대로 통하도록)
    url: item.originallink || item.link,
    publishedAt: new Date(item.pubDate).toISOString(),
  }));
}

module.exports = { searchNews };
