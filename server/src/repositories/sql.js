/*
 * 공용 SQL 조각.
 *
 * 주의: 아래 함수의 인자는 SQL 표현식(파라미터 자리표시자 `$1` 또는 컬럼 참조 `u.base_lat`)이
 * 그대로 문자열로 삽입된다. **절대 사용자 입력을 넘기지 말 것** — 값은 항상 $n 파라미터로 바인딩한다.
 */

// Haversine(구면 코사인) 거리(km). LEAST(1, ...)로 부동소수 오차에 의한 acos 정의역 이탈 방지.
export const haversineKm = (aLat, aLng, bLat, bLng) =>
  `6371 * acos(LEAST(1,
     cos(radians(${aLat})) * cos(radians(${bLat})) * cos(radians(${bLng}) - radians(${aLng}))
     + sin(radians(${aLat})) * sin(radians(${bLat}))
   ))`
