// 대형 외신 사이트는 기본 Node fetch의 UA("node")를 봇으로 간주해 403을
// 반환하는 경우가 많다 — 일반 브라우저처럼 보이는 UA를 반드시 붙인다.
// articleParser.js(단건 파싱)와 rssFeedService.js(RSS 폴링) 양쪽이 공유한다.
export const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
