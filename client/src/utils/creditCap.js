// 이번 학기 수강신청 상한(기본 18학점) 체크 — App.jsx의 toggleCourse에서
// 과목을 담기 전에 호출한다. GPA 3.7 이상 21학점 상한은 아직 미구현.
export function canAddCourse(pickedCredits, courseCredits, cap = 18) {
  return pickedCredits + courseCredits <= cap;
}
