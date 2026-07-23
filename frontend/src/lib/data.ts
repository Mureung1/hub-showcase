import * as api from "./api";
import * as mock from "./mock";

/**
 * 목업 ↔ 실 API 전환 지점.
 *
 * 화면은 항상 이 파일에서만 가져온다. `@/lib/mock` 이나 `@/lib/api` 를
 * 페이지에서 직접 import 하지 않는다.
 *
 * .env.local 에 NEXT_PUBLIC_USE_MOCK=1 을 두면 목업, 없으면 백엔드를 본다.
 * (NEXT_PUBLIC_* 는 빌드 시점에 값이 박히므로 값을 바꾸면 dev 서버 재시작이 필요하다.)
 */
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "1";

export const listPositions = USE_MOCK ? mock.listPositions : api.listPositions;
export const getPosition = USE_MOCK ? mock.getPosition : api.getPosition;
export const recalculate = USE_MOCK ? mock.recalculate : api.recalculate;

export { ApiError } from "./api";
