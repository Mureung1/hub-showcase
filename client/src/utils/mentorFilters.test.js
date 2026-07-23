import { describe, it, expect } from "vitest";
import { filterMentors, initialMentorFilters } from "./mentorFilters";

const baseMentor = {
  name: "김민준",
  school: "서울대학교",
  lab: "인공지능 연구실",
  academicStatus: "박사과정",
  program: "정규 멘토링",
  introduction: "AI를 연구합니다",
  detailedIntroduction: "딥러닝과 자연어처리를 연구합니다",
  major: "컴퓨터공학",
  keywords: ["머신러닝", "딥러닝"],
  counselingFields: ["진로상담", "논문지도"],
};

const otherMentor = {
  name: "이서연",
  school: "연세대학교",
  lab: "로봇공학 연구실",
  academicStatus: "석사과정",
  program: "단기 멘토링",
  introduction: "로봇을 연구합니다",
  detailedIntroduction: "제어시스템을 연구합니다",
  major: "기계공학",
  keywords: ["로보틱스", "제어"],
  counselingFields: ["생활상담"],
};

const mentors = [baseMentor, otherMentor];

describe("filterMentors", () => {
  it("모든 필터가 빈 값이면 전체 mentors를 반환한다", () => {
    expect(filterMentors(mentors, initialMentorFilters)).toEqual(mentors);
  });

  it("mentors가 빈 배열이면 빈 배열을 반환한다", () => {
    expect(filterMentors([], initialMentorFilters)).toEqual([]);
  });

  it("query가 이름에 포함되면 매칭된다", () => {
    const result = filterMentors(mentors, { ...initialMentorFilters, query: "민준" });
    expect(result).toEqual([baseMentor]);
  });

  it("query가 keywords 배열의 항목에 포함되면 매칭된다", () => {
    const result = filterMentors(mentors, { ...initialMentorFilters, query: "머신러닝" });
    expect(result).toEqual([baseMentor]);
  });

  it("query가 counselingFields 배열의 항목에 포함되면 매칭된다", () => {
    const result = filterMentors(mentors, { ...initialMentorFilters, query: "생활상담" });
    expect(result).toEqual([otherMentor]);
  });

  it("query는 대소문자를 무시하고 매칭된다", () => {
    const upperMentor = { ...baseMentor, name: "John Smith", keywords: [], counselingFields: [] };
    const result = filterMentors([upperMentor], { ...initialMentorFilters, query: "john" });
    expect(result).toEqual([upperMentor]);
  });

  it("query 앞뒤 공백은 trim되어 매칭된다", () => {
    const result = filterMentors(mentors, { ...initialMentorFilters, query: "  민준  " });
    expect(result).toEqual([baseMentor]);
  });

  it("어떤 필드에도 포함되지 않는 query면 제외된다", () => {
    const result = filterMentors(mentors, { ...initialMentorFilters, query: "존재하지않는검색어" });
    expect(result).toEqual([]);
  });

  it("researchField가 keywords 중 하나에 부분 포함되면 매칭된다", () => {
    const result = filterMentors(mentors, { ...initialMentorFilters, researchField: "머신" });
    expect(result).toEqual([baseMentor]);
  });

  it("researchField와 일치하는 keyword가 없으면 제외된다", () => {
    const result = filterMentors(mentors, { ...initialMentorFilters, researchField: "블록체인" });
    expect(result).toEqual([]);
  });

  it("counselingField는 완전 일치해야 매칭된다", () => {
    const result = filterMentors(mentors, { ...initialMentorFilters, counselingField: "진로상담" });
    expect(result).toEqual([baseMentor]);
  });

  it("counselingField가 부분 문자열이면 매칭되지 않는다", () => {
    const result = filterMentors(mentors, { ...initialMentorFilters, counselingField: "진로" });
    expect(result).toEqual([]);
  });

  it("major가 mentor.major에 부분 포함되면 매칭된다", () => {
    const result = filterMentors(mentors, { ...initialMentorFilters, major: "컴퓨터" });
    expect(result).toEqual([baseMentor]);
  });

  it("academicStatus는 완전 일치해야 매칭된다", () => {
    const result = filterMentors(mentors, { ...initialMentorFilters, academicStatus: "석사과정" });
    expect(result).toEqual([otherMentor]);
  });

  it("lab이 mentor.lab에 부분 포함되면 매칭된다", () => {
    const result = filterMentors(mentors, { ...initialMentorFilters, lab: "로봇공학" });
    expect(result).toEqual([otherMentor]);
  });

  it("여러 필터를 동시에 적용하면 AND 조건으로 모두 만족하는 것만 반환된다", () => {
    const result = filterMentors(mentors, {
      ...initialMentorFilters,
      major: "컴퓨터공학",
      academicStatus: "박사과정",
    });
    expect(result).toEqual([baseMentor]);
  });

  it("일부 필터만 만족하고 하나라도 불만족하면 결과에서 제외된다", () => {
    const result = filterMentors(mentors, {
      ...initialMentorFilters,
      major: "컴퓨터공학",
      academicStatus: "석사과정",
    });
    expect(result).toEqual([]);
  });

  it("keywords, counselingFields가 빈 배열이어도 에러 없이 동작한다", () => {
    const emptyFieldsMentor = { ...baseMentor, keywords: [], counselingFields: [] };
    const result = filterMentors([emptyFieldsMentor], initialMentorFilters);
    expect(result).toEqual([emptyFieldsMentor]);
  });

  it("name 등 필드가 null/undefined여도 에러 없이 처리한다", () => {
    const nullableMentor = {
      ...baseMentor,
      name: null,
      school: undefined,
      lab: null,
      major: undefined,
    };
    expect(() => filterMentors([nullableMentor], initialMentorFilters)).not.toThrow();
    expect(filterMentors([nullableMentor], initialMentorFilters)).toEqual([nullableMentor]);
  });
});
