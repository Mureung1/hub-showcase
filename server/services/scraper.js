const cheerio = require('cheerio');

const MIN_PARAGRAPH_LENGTH = 30; // 짧은 캡션/광고 문구를 본문에서 걸러내기 위한 최소 길이
const MIN_BODY_LENGTH = 200; // 이보다 짧으면 저작권 안내 등 잡문만 긁힌 실패로 간주

async function fetchArticleBody(url) {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NewssistBot/1.0)' },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) return null;

    const html = await response.text();
    const $ = cheerio.load(html);

    // 언론사별 본문 태그 규칙을 알 수 없으니, 페이지 전체 <p> 텍스트를 모아 본문으로 취급하는 범용 방식
    const paragraphs = $('p')
      .map((_, el) => $(el).text().trim())
      .get()
      .filter((text) => text.length >= MIN_PARAGRAPH_LENGTH);

    if (paragraphs.length === 0) return null;

    const body = paragraphs.join('\n\n');
    return body.length >= MIN_BODY_LENGTH ? body : null;
  } catch (err) {
    // 크롤링 실패는 배치 전체를 막으면 안 되므로 null만 반환하고 넘어간다
    return null;
  }
}

module.exports = { fetchArticleBody };
