// data/mockTimetables.js
// 선배가 공유한 시간표 mock (홈 화면 열람용). lectureIds는 mockSubjects의 id를 참조.
export const mockTimetables = [
  {
    id: "st1",
    title: "무난하게 듣기 좋은 시간표",
    grade: 2,
    description: "전공 필수 위주로 채우고 교양은 가볍게 들었어요.",
    lectureIds: ["m1", "m4", "g1", "g5"],
  },
  {
    id: "st2",
    title: "화/목 공강 시간표",
    grade: 3,
    description: "화요일, 목요일에 공강을 만들고 나머지를 채웠어요.",
    lectureIds: ["m2", "m6", "g2", "g4"],
  },
  {
    id: "st3",
    title: "오전 수업 없이 짜기",
    grade: 1,
    description: "아침잠이 많아서 오후 수업 위주로만 골랐어요.",
    lectureIds: ["g2", "m4", "g4", "g5"],
  },
];
