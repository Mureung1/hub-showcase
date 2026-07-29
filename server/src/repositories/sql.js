/*
 * 공용 SQL 조각.
 *
 * 주의: 아래 함수의 인자는 SQL 표현식(파라미터 자리표시자 `$1` 또는 컬럼 참조 `u.geog`)이
 * 그대로 문자열로 삽입된다. **절대 사용자 입력을 넘기지 말 것** — 값은 항상 $n 파라미터로 바인딩한다.
 *
 * 위치 계산은 PostGIS geography(WGS84 회전타원체) 기준이다(마이그레이션 003).
 * 직접 Haversine을 쓰지 않는 이유는 docs/최적화.md §4 참고 —
 * 요약하면 계산식으로 필터하면 인덱스를 못 타고, 경도 보정을 손으로 하면 틀리기 쉽다.
 */

// 경도·위도 순서 주의: ST_MakePoint(lng, lat)
export const geogPoint = (lng, lat) => `ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography`

// 두 geography 사이 거리(km). ST_Distance는 미터를 반환한다.
export const distanceKm = (a, b) => `(ST_Distance(${a}, ${b}) / 1000.0)`

/*
 * 반경 이내 판정. 세 번째 인자는 **미터**다.
 *
 * ST_DWithin은 GiST 인덱스를 직접 사용한다. 단 거리 인자가 상수일 때만 그렇고,
 * 컬럼 참조(사용자별 반경)면 인덱스를 못 탄다 — 그 경우 상수 상한으로 후보를 좁힌 뒤
 * 정확 판정을 덧붙이는 2단 구성이 필요하다(notificationRepository.findTargets 참고).
 */
export const withinMeters = (a, b, meters) => `ST_DWithin(${a}, ${b}, ${meters})`

// 알림 반경 상한(km). userService의 검증값과 반드시 일치시킬 것 —
// 이 값보다 큰 반경을 허용하면 인덱스 프리필터가 대상을 놓친다.
export const MAX_NOTI_RADIUS_KM = 50
