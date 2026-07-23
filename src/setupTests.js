// 이 프로젝트는 vitest globals를 켜지 않고 각 테스트 파일이 "vitest"에서
// expect/afterEach를 직접 import하므로, jest-dom 매처와 RTL의 자동 cleanup도
// 여기서 명시적으로 연결해야 한다(globals가 없으면 @testing-library/react가
// 내부적으로 기대하는 전역 afterEach를 못 찾아 렌더 결과가 테스트 간에 안 지워진다).
import { afterEach, expect } from "vitest";
import * as matchers from "@testing-library/jest-dom/matchers";
import { cleanup } from "@testing-library/react";

expect.extend(matchers);
afterEach(cleanup);
