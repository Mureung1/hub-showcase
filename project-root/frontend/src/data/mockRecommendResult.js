// data/mockRecommendResult.js
// recommendTimetable()이 아직 구현 전이라, RecommendResultScreen 개발용으로 미리 만들어둔
// "추천 결과 상위 3개" mock. 실제 알고리즘 완성 후엔 이 파일 대신 알고리즘 반환값을 사용한다.
// 각 결과의 lectureIds는 mockSubjects의 id를 참조하며, 전공필수(m1, m2)는 항상 포함되어 있다.
export const mockRecommendResult = {
  targetCredit: 15,
  results: [
    {
      id: "r1",
      label: "추천 시간표 1",
      lectureIds: ["m1", "m2", "m3", "m6", "g4"],
      totalCredit: 15,
    },
    {
      id: "r2",
      label: "추천 시간표 2",
      lectureIds: ["m1", "m2", "m4", "g1", "g2", "g5"],
      totalCredit: 16,
    },
    {
      id: "r3",
      label: "추천 시간표 3",
      lectureIds: ["m1", "m2", "m5a", "m5b", "g2", "g3"],
      totalCredit: 14,
    },
  ],
};
