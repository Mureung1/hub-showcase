// 이상형(연애성향) 테스트 선택지 → 타입별 점수 매핑표 (24개 선택지 전부).
// 4지선다 문항(1, 2, 5, 6, 7번)은 선택지당 4개, 2지선다 문항(3, 4번)은 선택지당 2개.
// (4 * 5) + (2 * 2) = 24
//
// 각 선택지는 "주타입 2점 / 보조타입 1점"을 부여한다.
// 키는 frontend/src/data/datingQuestions.js의 선택지 id(`${문항번호}-${선택지코드}`)와 동일하게 맞춘다.
//
// 4가지 타입: 포근메이트, 티키타카러, 하트스파커, 그로우파트너
// (점수 합산 로직/동점 처리는 이번 작업 범위 밖 — 다음 작업에서 구현)

export const datingScoreMap = {
  // 1. 다음 날이 휴일인 금요일 밤, 가장 설레는 메시지는?
  '1-A': { twoPointType: '포근메이트', onePointType: '그로우파트너' },
  '1-B': { twoPointType: '티키타카러', onePointType: '하트스파커' },
  '1-C': { twoPointType: '하트스파커', onePointType: '티키타카러' },
  '1-D': { twoPointType: '그로우파트너', onePointType: '포근메이트' },

  // 2. 썸 탈 때 가장 설레는 데이트 장소는?
  '2-A': { twoPointType: '포근메이트', onePointType: '그로우파트너' },
  '2-B': { twoPointType: '티키타카러', onePointType: '하트스파커' },
  '2-C': { twoPointType: '하트스파커', onePointType: '티키타카러' },
  '2-D': { twoPointType: '그로우파트너', onePointType: '포근메이트' },

  // 3. 스킨십 속도는 어느 쪽이 더 좋다?
  '3-A': { twoPointType: '하트스파커', onePointType: '티키타카러' },
  '3-B': { twoPointType: '포근메이트', onePointType: '그로우파트너' },

  // 4. 연락은 어느 정도가 좋다?
  '4-A': { twoPointType: '티키타카러', onePointType: '포근메이트' },
  '4-B': { twoPointType: '그로우파트너', onePointType: '하트스파커' },

  // 5. 힘든 일이 있었을 때 더 끌리는 반응은?
  '5-A': { twoPointType: '포근메이트', onePointType: '그로우파트너' },
  '5-B': { twoPointType: '티키타카러', onePointType: '하트스파커' },
  '5-C': { twoPointType: '하트스파커', onePointType: '티키타카러' },
  '5-D': { twoPointType: '그로우파트너', onePointType: '포근메이트' },

  // 6. 약속 시간보다 조금 일찍 도착했을 때, 상대가 하고 있으면 설레는 행동은?
  '6-A': { twoPointType: '포근메이트', onePointType: '그로우파트너' },
  '6-B': { twoPointType: '티키타카러', onePointType: '하트스파커' },
  '6-C': { twoPointType: '하트스파커', onePointType: '티키타카러' },
  '6-D': { twoPointType: '그로우파트너', onePointType: '포근메이트' },

  // 7. 연애 중 가장 받고 싶은 선물은?
  '7-A': { twoPointType: '포근메이트', onePointType: '그로우파트너' },
  '7-B': { twoPointType: '티키타카러', onePointType: '하트스파커' },
  '7-C': { twoPointType: '하트스파커', onePointType: '티키타카러' },
  '7-D': { twoPointType: '그로우파트너', onePointType: '포근메이트' },
}
