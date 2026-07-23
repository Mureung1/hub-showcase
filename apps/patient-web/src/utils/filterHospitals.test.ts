import { describe, expect, it } from "vitest";
import {
  filterHospitalsByQuery,
  getValidHospitalRegionFilter,
  type SearchableHospital,
} from "./filterHospitals";

const hospitals: SearchableHospital[] = [
  {
    id: "ent",
    name: "서울이비인후과",
    department: "이비인후과",
    district: "서울 마포구",
  },
  {
    id: "orthopedics",
    name: "연세정형외과의원",
    department: "정형외과",
    district: "서울 서대문구",
  },
  {
    id: "internal-medicine",
    name: "우리내과의원",
    department: "내과",
    district: "서울 마포구",
  },
  {
    id: "english",
    name: "Seoul Clinic",
    department: "Family Medicine",
    district: "Seoul Mapo",
  },
  {
    id: "busan",
    name: "부산가정의학과",
    department: "가정의학과",
    district: "부산 해운대구",
  },
];

describe("filterHospitalsByQuery", () => {
  it("병원명으로 검색한다", () => {
    expect(filterHospitalsByQuery(hospitals, "서울이비인후과").map(({ id }) => id)).toEqual([
      "ent",
    ]);
  });

  it("진료과로 검색한다", () => {
    expect(filterHospitalsByQuery(hospitals, "이비인후과").map(({ id }) => id)).toEqual([
      "ent",
    ]);
  });

  it("지역으로 검색하고 기존 순서를 유지한다", () => {
    expect(filterHospitalsByQuery(hospitals, "마포구").map(({ id }) => id)).toEqual([
      "ent",
      "internal-medicine",
    ]);
  });

  it("여러 검색어가 서로 다른 병원 정보에 모두 포함된 결과만 반환한다", () => {
    expect(filterHospitalsByQuery(hospitals, "서울 이비인후과").map(({ id }) => id)).toEqual([
      "ent",
    ]);
    expect(filterHospitalsByQuery(hospitals, "마포구 내과").map(({ id }) => id)).toEqual([
      "internal-medicine",
    ]);
  });

  it("빈 문자열이나 공백만 입력하면 전체 병원을 반환한다", () => {
    expect(filterHospitalsByQuery(hospitals, "")).toEqual(hospitals);
    expect(filterHospitalsByQuery(hospitals, "   ")).toEqual(hospitals);
  });

  it("검색어 앞뒤와 사이의 중복 공백을 무시한다", () => {
    expect(
      filterHospitalsByQuery(hospitals, "  서울   이비인후과  ").map(({ id }) => id),
    ).toEqual(["ent"]);
  });

  it("영문 대소문자를 구분하지 않는다", () => {
    expect(filterHospitalsByQuery(hospitals, "SEOUL clinic").map(({ id }) => id)).toEqual([
      "english",
    ]);
  });

  it("일치하는 병원이 없으면 빈 배열을 반환한다", () => {
    expect(filterHospitalsByQuery(hospitals, "치과")).toEqual([]);
  });

  it("검색 과정에서 원본 배열과 객체를 변경하지 않는다", () => {
    const original = structuredClone(hospitals);

    filterHospitalsByQuery(hospitals, "서울");

    expect(hospitals).toEqual(original);
  });

  it("시·도만 선택하면 해당 지역의 병원만 반환한다", () => {
    expect(
      filterHospitalsByQuery(hospitals, "", { province: "부산", cityDistrict: "" }).map(
        ({ id }) => id,
      ),
    ).toEqual(["busan"]);
  });

  it("시·군·구까지 선택하면 두 지역 조건을 모두 만족하는 병원만 반환한다", () => {
    expect(
      filterHospitalsByQuery(hospitals, "", {
        province: "서울",
        cityDistrict: "마포구",
      }).map(({ id }) => id),
    ).toEqual(["ent", "internal-medicine"]);
  });

  it("검색어와 지역 조건을 함께 적용한다", () => {
    expect(
      filterHospitalsByQuery(hospitals, "내과", {
        province: "서울",
        cityDistrict: "마포구",
      }).map(({ id }) => id),
    ).toEqual(["internal-medicine"]);
  });

  it("지역 조건이 비어 있으면 검색어 결과를 그대로 반환한다", () => {
    expect(
      filterHospitalsByQuery(hospitals, "가정의학과", {
        province: "",
        cityDistrict: "",
      }).map(({ id }) => id),
    ).toEqual(["busan"]);
  });

  it("병원 데이터 갱신 후 사라진 지역 선택을 초기화한다", () => {
    expect(
      getValidHospitalRegionFilter([hospitals[4]!], {
        province: "서울",
        cityDistrict: "마포구",
      }),
    ).toEqual({ province: "", cityDistrict: "" });
  });

  it("시·도는 남아 있고 시·군·구만 사라지면 하위 선택만 초기화한다", () => {
    expect(
      getValidHospitalRegionFilter([hospitals[1]!], {
        province: "서울",
        cityDistrict: "마포구",
      }),
    ).toEqual({ province: "서울", cityDistrict: "" });
  });

  it("대표 진료과만 선택하면 해당 진료과 병원만 반환한다", () => {
    expect(
      filterHospitalsByQuery(
        hospitals,
        "",
        { province: "", cityDistrict: "" },
        "정형외과",
      ).map(({ id }) => id),
    ).toEqual(["orthopedics"]);
  });

  it("대표 진료과와 지역 조건을 함께 적용한다", () => {
    expect(
      filterHospitalsByQuery(
        hospitals,
        "",
        { province: "서울", cityDistrict: "마포구" },
        "내과",
      ).map(({ id }) => id),
    ).toEqual(["internal-medicine"]);
  });

  it("대표 진료과를 선택하지 않으면 기존 검색·지역 결과를 유지한다", () => {
    expect(
      filterHospitalsByQuery(
        hospitals,
        "",
        { province: "서울", cityDistrict: "마포구" },
        "",
      ).map(({ id }) => id),
    ).toEqual(["ent", "internal-medicine"]);
  });
});
