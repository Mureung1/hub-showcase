// 마커 팝업의 "자세히 보기" 링크. 업체가 스스로 등록한 링크(네이버 지역검색 API의 link 필드)는
// 이벤트 프로모션 페이지처럼 빵집과 무관한 값이 섞여 있어 믿을 수 없었다(server/scripts/fetchNaverLinks.js
// 는 그래서 폐기). 대신 이미 직접 확인해 채워둔 주소를 그대로 검색어로 넘겨 네이버 지도 검색 결과로
// 보내면, 이름만으로 찾는 것보다 훨씬 정확하게 해당 장소로 연결된다 — API 호출도 DB 캐싱도 필요 없다.
export function naverMapSearchUrl(bakery) {
  const query = [bakery.name, bakery.address].filter(Boolean).join(' ');
  return `https://map.naver.com/p/search/${encodeURIComponent(query)}`;
}
