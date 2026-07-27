/**
 * 튜닝 가능한 상수 모음.
 *
 * 05_CODE_SCANNER_SCORER.md가 명시한 MVP 기본값들 — "실제 유저 레포 데이터를
 * 보고 Phase 2에서 조정 가능"하다고 문서에 적힌 값들이 여러 파일에 흩어져
 * 있으면 어디를 고쳐야 하는지 찾기 어려워지므로 한 곳에 모은다.
 */

// 레포 규모 상한 (07_API_SPEC.md 10장, 05장 10장 "레포지토리 규모 초과")
export const MAX_FILE_COUNT = 5000;

// 인터뷰 후보 파일 개수 (05장 6장: 상위 3~5개 중 MVP 기본값)
export const CANDIDATE_COUNT = 3;

// 파일 크기 점수 (05장 6장 "줄 수 계산 방식")
export const BYTES_PER_LINE = 30; // blob.size(byte) -> 근사 줄 수 환산 상수
export const SMALL_FILE_MAX_LINES = 15; // 이 미만이면 트리비얼 파일(0.2점)
export const LARGE_FILE_MIN_LINES = 300; // 이 초과면 과도하게 큰 파일(0.5점)

// 이름 패턴 보너스 (05장 6장)
export const NAME_PATTERNS = ['service', 'controller', 'handler', 'usecase', 'core', 'engine'];
export const NAME_PATTERN_BONUS = 0.3;

// 하이브리드 청킹 (05장 7장)
export const CHUNK_SHORT_FILE_MAX_LINES = 200; // 이 이하면 청킹 없이 전체 사용
export const CHUNK_MAX_PER_FILE = 2; // 파일당 최대 chunk 개수

// Gemini 모델명 (env로 override 가능 — Google이 모델을 종종 deprecate하므로
// 하드코딩 시 배포 없이는 복구 불가)
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
