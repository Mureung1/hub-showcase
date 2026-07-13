// 온통청년 청년정책 수집기. 크롤링이 아니라 API 호출이라 구조화 JSON 을 받는다. (docs/데이터-수집.md)
// data.go.kr 에서 인증키 발급. 지역·연령·소득 등이 구조 필드로 와서 규칙 매핑만으로 충분(LLM 거의 불필요).

const KEY = process.env.YOUTH_API_KEY;
const ENDPOINT = "https://www.youthcenter.go.kr/opi/youthPlcyList.do";

// 정책 목록을 페이지 단위로 받는다. 파라미터와 응답 필드는 API 붙일 때 실측한다.
export async function fetchPolicies(pageIndex = 1) {
  // TODO(#4): fetch(ENDPOINT + 인증키 + pageIndex) -> JSON -> 정책 배열
  return [];
}

// 정책 하나를 우리 raw 포맷으로. 구조 필드(지역·연령)는 매핑용, 자유 문장은 raw_text 로.
export function toRaw(policy) {
  // TODO(#4): 온통청년 필드 -> { source_url, raw_title, deadline, region, age, raw_text ... }
  return { source_url: "", raw_title: "", raw_text: "", scraped_at: new Date().toISOString() };
}
