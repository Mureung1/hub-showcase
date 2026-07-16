// 생활성향 테스트 선택지 → 타입별 점수 매핑표 (1~6번 문항, 4지선다, 24개 선택지 전부).
// 7~10번(소프트/하드 필터) 선택지는 이 파일에 두지 않는다 — backend/src/data/lifestyleFilterMap.js 참고.
//
// 각 선택지는 "주타입 2점 / 보조타입 1점"을 부여한다.
// 키는 frontend/src/data/lifestyleQuestions.js의 선택지 id(`${문항번호}-${선택지코드}`)와 동일하게 맞춘다.
//
// 4가지 타입: 깔끔루틴러, 함께루틴러, 여유마이웨이, 편한동거러
// (점수 합산 로직/동점 처리는 이번 작업 범위 밖 — 다음 작업에서 구현)

export const lifestyleScoreMap = {
  // 1. 평소 취침·기상 시간은 어떤 편인가요?
  '1-A': { twoPointType: '깔끔루틴러', onePointType: '함께루틴러' },
  '1-B': { twoPointType: '함께루틴러', onePointType: '깔끔루틴러' },
  '1-C': { twoPointType: '편한동거러', onePointType: '여유마이웨이' },
  '1-D': { twoPointType: '여유마이웨이', onePointType: '편한동거러' },

  // 2. 방 청소와 정리는 얼마나 자주 하나요?
  '2-A': { twoPointType: '깔끔루틴러', onePointType: '함께루틴러' },
  '2-B': { twoPointType: '함께루틴러', onePointType: '깔끔루틴러' },
  '2-C': { twoPointType: '여유마이웨이', onePointType: '편한동거러' },
  '2-D': { twoPointType: '편한동거러', onePointType: '여유마이웨이' },

  // 3. 방 안의 소음은 어느 정도까지 괜찮나요?
  '3-A': { twoPointType: '깔끔루틴러', onePointType: '함께루틴러' },
  '3-B': { twoPointType: '함께루틴러', onePointType: '깔끔루틴러' },
  '3-C': { twoPointType: '편한동거러', onePointType: '여유마이웨이' },
  '3-D': { twoPointType: '여유마이웨이', onePointType: '편한동거러' },

  // 4. 알람과 잠버릇에 가장 가까운 것은?
  '4-A': { twoPointType: '깔끔루틴러', onePointType: '함께루틴러' },
  '4-B': { twoPointType: '함께루틴러', onePointType: '깔끔루틴러' },
  '4-C': { twoPointType: '여유마이웨이', onePointType: '편한동거러' },
  '4-D': { twoPointType: '편한동거러', onePointType: '여유마이웨이' },

  // 5. 음식과 생활용품 공유는 어느 정도가 편한가요?
  '5-A': { twoPointType: '깔끔루틴러', onePointType: '여유마이웨이' },
  '5-B': { twoPointType: '여유마이웨이', onePointType: '깔끔루틴러' },
  '5-C': { twoPointType: '함께루틴러', onePointType: '편한동거러' },
  '5-D': { twoPointType: '편한동거러', onePointType: '함께루틴러' },

  // 6. 룸메이트와 어떤 관계로 지내고 싶나요?
  '6-A': { twoPointType: '여유마이웨이', onePointType: '깔끔루틴러' },
  '6-B': { twoPointType: '깔끔루틴러', onePointType: '여유마이웨이' },
  '6-C': { twoPointType: '함께루틴러', onePointType: '편한동거러' },
  '6-D': { twoPointType: '편한동거러', onePointType: '함께루틴러' },
}
