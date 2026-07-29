// 문자열 → 32bit 정수 해시(순수 함수, 결정적 — 같은 문자열은 항상 같은 값). missions.js(오늘의 미션
// 선택)에서 처음 쓰였고, quests.js(FR-16, 퀘스트 로테이션 선택)가 공용으로 재사용하기 위해 이 파일로
// 추출했다. Math.random 대신 이 방식을 쓰는 이유는 렌더마다, 혹은 서버 재시작마다 결과가 바뀌면
// 안 되기 때문이다(같은 (userId, 기간) 조합이면 항상 같은 항목이 나와야 함).
export function hashString(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0
  }
  return hash
}
