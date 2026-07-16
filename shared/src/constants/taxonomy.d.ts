/**
 * 정규화된 용어 집합 (Canonical Taxonomy)
 *
 * 원문의 다양한 표현을 이 고정값들로 매핑함으로써 매칭 오류(문자열 불일치) 방지
 * 예: "이공계열" → [SCIENCE, IT, MEDICINE]
 *
 * 참고: 실제 매핑 데이터는 shared/taxonomy.json에서 로드되므로
 * Python 크롤러와 동일한 매핑을 유지할 수 있다.
 */
export declare const CANONICAL_MAJORS: string[];
export type CanonicalMajor = typeof CANONICAL_MAJORS[number];
export declare const CANONICAL_REGIONS: string[];
export type CanonicalRegion = typeof CANONICAL_REGIONS[number];
export declare const MAJOR_MAPPING: Record<string, CanonicalMajor[]>;
export declare const REGION_MAPPING: Record<string, CanonicalRegion[]>;
export declare const ENROLLMENT_STATUS_TYPES: readonly ["재학", "휴학", "졸업예정", "졸업생"];
export type EnrollmentStatus = typeof ENROLLMENT_STATUS_TYPES[number];
export declare const GRADE_TYPES: readonly [1, 2, 3, 4];
export type Grade = typeof GRADE_TYPES[number];
export declare const INCOME_BRACKETS: number[];
export type IncomeBracket = typeof INCOME_BRACKETS[number];
//# sourceMappingURL=taxonomy.d.ts.map