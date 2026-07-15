// 출처: 취미성향_테스트.docx (5장. 개발자용 점수 매핑표)
//
// 취미 발견 테스트 선택지 → 타입별 점수 매핑표 (26개 선택지 전부).
// 4지선다 문항(1, 2, 4, 6, 7번)은 선택지당 4개, O/X 문항(3, 5, 8번)은 선택지당 2개.
// (4 * 5) + (2 * 3) = 26
//
// 각 선택지는 "주타입 2점 / 보조타입 1점"을 부여한다.
// 키는 frontend/src/data/hobbyQuestions.js의 선택지 id(`${문항번호}-${선택지코드}`)와 동일하게 맞춘다.
//
// 4가지 타입: 딥다이버, 에너지러, 무드트래블러, 소셜메이커
// (점수 합산 로직/동점 처리는 이번 작업 범위 밖 — 다음 작업에서 구현)

export const hobbyScoreMap = {
  // 1. 가장 최근 본 쇼츠 중 기억에 남는 건?
  '1-A': { twoPointType: '딥다이버', onePointType: '에너지러' },
  '1-B': { twoPointType: '에너지러', onePointType: '딥다이버' },
  '1-C': { twoPointType: '소셜메이커', onePointType: '에너지러' },
  '1-D': { twoPointType: '무드트래블러', onePointType: '딥다이버' },

  // 2. 학창 시절 가장 좋아했던 시간은?
  '2-A': { twoPointType: '에너지러', onePointType: '소셜메이커' },
  '2-B': { twoPointType: '소셜메이커', onePointType: '무드트래블러' },
  '2-C': { twoPointType: '딥다이버', onePointType: '무드트래블러' },
  '2-D': { twoPointType: '무드트래블러', onePointType: '딥다이버' },

  // 3. 얼굴만 아는 사람이 파티에 초대한다면? (O/X)
  '3-O': { twoPointType: '소셜메이커', onePointType: '무드트래블러' },
  '3-X': { twoPointType: '딥다이버', onePointType: '무드트래블러' },

  // 4. 돈이 아주 많다면 가장 해보고 싶은 건?
  '4-A': { twoPointType: '무드트래블러', onePointType: '딥다이버' },
  '4-B': { twoPointType: '에너지러', onePointType: '무드트래블러' },
  '4-C': { twoPointType: '딥다이버', onePointType: '소셜메이커' },
  '4-D': { twoPointType: '소셜메이커', onePointType: '무드트래블러' },

  // 5. "젊을 때 고생은 사서도 한다" (O/X)
  '5-O': { twoPointType: '에너지러', onePointType: '무드트래블러' },
  '5-X': { twoPointType: '딥다이버', onePointType: '소셜메이커' },

  // 6. 가장 친한 친구에게 놀자고 할 때 자주 하는 말은?
  '6-A': { twoPointType: '딥다이버', onePointType: '소셜메이커' },
  '6-B': { twoPointType: '소셜메이커', onePointType: '에너지러' },
  '6-C': { twoPointType: '무드트래블러', onePointType: '소셜메이커' },
  '6-D': { twoPointType: '에너지러', onePointType: '무드트래블러' },

  // 7. 여행을 간다면 가장 끌리는 곳은?
  '7-A': { twoPointType: '무드트래블러', onePointType: '딥다이버' },
  '7-B': { twoPointType: '소셜메이커', onePointType: '무드트래블러' },
  '7-C': { twoPointType: '딥다이버', onePointType: '무드트래블러' },
  '7-D': { twoPointType: '에너지러', onePointType: '무드트래블러' },

  // 8. 나는 혼자 밥을 먹어도 전혀 불편하지 않다 (O/X)
  '8-O': { twoPointType: '딥다이버', onePointType: '무드트래블러' },
  '8-X': { twoPointType: '소셜메이커', onePointType: '에너지러' },
}
