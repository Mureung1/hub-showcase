import { describe, expect, it } from "vitest";
import {
  koreanAdministrativeDistricts,
  koreanProvinces,
  medicalDepartments,
} from "./hospitalSearchFilters";

describe("hospitalSearchFilters", () => {
  it("17개 시·도와 229개 시·군·구를 제공한다", () => {
    expect(koreanProvinces).toHaveLength(17);
    expect(koreanProvinces).toContain("서울특별시");
    expect(koreanProvinces).not.toContain("서울");
    expect(Object.values(koreanAdministrativeDistricts).flat()).toHaveLength(229);
  });

  it("선택한 시·도에 맞는 시·군·구를 제공한다", () => {
    expect(koreanAdministrativeDistricts["서울특별시"]).toContain("마포구");
    expect(koreanAdministrativeDistricts["제주특별자치도"]).toEqual([
      "제주시",
      "서귀포시",
    ]);
  });

  it("자주 사용하는 진료과 선택지를 제공한다", () => {
    expect(medicalDepartments).toEqual(
      expect.arrayContaining([
        "내과",
        "소아청소년과",
        "이비인후과",
        "정형외과",
        "피부과",
        "치과",
        "한방내과",
      ]),
    );
  });
});
