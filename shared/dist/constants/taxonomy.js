/**
 * 정규화된 용어 집합 (Canonical Taxonomy)
 *
 * 원문의 다양한 표현을 이 고정값들로 매핑함으로써 매칭 오류(문자열 불일치) 방지
 * 예: "이공계열" → [SCIENCE, IT, MEDICINE]
 *
 * 참고: 실제 매핑 데이터는 shared/taxonomy.json에서 로드되므로
 * Python 크롤러와 동일한 매핑을 유지할 수 있다.
 */
import taxonomyData from "../../taxonomy.json";
// 전공 고정값 (as const -> as string[])
export const CANONICAL_MAJORS = taxonomyData.canonical_majors;
// 지역 고정값 (as const -> as string[])
export const CANONICAL_REGIONS = taxonomyData.canonical_regions;
// 원문 → Canonical 매핑 테이블
export const MAJOR_MAPPING = taxonomyData.major_mapping;
export const REGION_MAPPING = taxonomyData.region_mapping;
// 등급별 필터링 헬퍼
export const ENROLLMENT_STATUS_TYPES = [
    "재학",
    "휴학",
    "졸업예정",
    "졸업생",
];
export const GRADE_TYPES = [1, 2, 3, 4];
// 소득분위 (1~10)
export const INCOME_BRACKETS = Array.from({ length: 10 }, (_, i) => i + 1);
//# sourceMappingURL=taxonomy.js.map