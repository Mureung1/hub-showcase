import { describe, expect, it } from "vitest";
import { classifyContent } from "./classification";

describe("classifyContent", () => {
  it.each([
    ["https://www.youtube.com/watch?v=test", "영상", "유튜브"],
    ["https://smartstore.naver.com/test", "쇼핑", "스마트스토어"],
    ["https://www.instagram.com/test", "SNS", "인스타그램"],
    ["다이어트 운동 루틴 정리", "건강", "운동"],
    ["React TypeScript 공부 자료", "공부", "프로그래밍"],
    ["분류할 수 없는 일반 문장", "미분류", "기타"],
  ])("%s를 분류한다", (content, categoryMain, categorySub) => {
    expect(classifyContent(content)).toEqual({ categoryMain, categorySub });
  });

  it("여러 키워드가 있으면 먼저 정의된 규칙을 사용한다", () => {
    expect(classifyContent("메이크업과 운동 기록")).toEqual({
      categoryMain: "뷰티",
      categorySub: "화장품",
    });
  });
});
