import { describe, it, expect } from "vitest";
import { latLngToGrid } from "./grid";

/**
 * 검증 앵커는 기상청이 배포한 격자 좌표다.
 * - 서울시청 (60, 127)은 기상청 `dfs_xy_conv` 예제의 대표 검증값.
 * - 나머지 대도시 값은 공개된 기상청 격자표와 일치한다.
 */
describe("latLngToGrid", () => {
  it("서울시청 → 기상청 공식 예제값 (60, 127)", () => {
    expect(latLngToGrid(37.5665, 126.978)).toEqual({ nx: 60, ny: 127 });
  });

  it("부산시청 → (98, 76)", () => {
    expect(latLngToGrid(35.1796, 129.0756)).toEqual({ nx: 98, ny: 76 });
  });

  it("부산 서면(데모 매장) → (98, 75)", () => {
    expect(latLngToGrid(35.1578, 129.0594)).toEqual({ nx: 98, ny: 75 });
  });

  it("제주시청 → (53, 38)", () => {
    expect(latLngToGrid(33.4996, 126.5312)).toEqual({ nx: 53, ny: 38 });
  });

  it("강릉 → (92, 132)", () => {
    expect(latLngToGrid(37.7519, 128.8761)).toEqual({ nx: 92, ny: 132 });
  });

  it("정수 격자값을 반환한다", () => {
    const { nx, ny } = latLngToGrid(35.1578, 129.0594);
    expect(Number.isInteger(nx)).toBe(true);
    expect(Number.isInteger(ny)).toBe(true);
  });
});
