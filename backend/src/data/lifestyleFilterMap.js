// 생활성향 테스트 선택지 → 필터 매핑표 (7~10번 문항, 4지선다, 16개 선택지 전부).
// 1~6번(점수 계산용) 선택지는 이 파일에 두지 않는다 — backend/src/data/lifestyleScoreMap.js 참고.
//
// 각 선택지는 필터명(filterName)과 필터값(value)만 가진다 (점수 타입 없음).
// 키는 frontend/src/data/lifestyleQuestions.js의 선택지 id(`${문항번호}-${선택지코드}`)와 동일하게 맞춘다.
//
// 7, 8번은 소프트 필터, 9, 10번은 하드 필터에 해당하지만
// 이 파일에는 그 구분 정보를 넣지 않는다 — 하드/소프트 구분은
// frontend/src/data/lifestyleQuestions.js의 group 필드로만 판단한다.
//
// filterName 4가지: guestPolicy, temperaturePreference, smokingStatus, drinkingStatus
// (필터 값 추출/적용 로직은 이번 작업 범위 밖 — 다음 작업에서 구현)

export const lifestyleFilterMap = {
  // 7. 친구나 지인을 방에 초대하는 것에 대해 어떻게 생각하나요?
  '7-A': { filterName: 'guestPolicy', value: '비허용' },
  '7-B': { filterName: 'guestPolicy', value: '사전동의시짧은방문' },
  '7-C': { filterName: 'guestPolicy', value: '늦은시간외허용' },
  '7-D': { filterName: 'guestPolicy', value: '자유허용' },

  // 8. 방의 냉난방과 환기는 어떤 방식이 가장 편한가요?
  '8-A': { filterName: 'temperaturePreference', value: '따뜻함' },
  '8-B': { filterName: 'temperaturePreference', value: '시원함' },
  '8-C': { filterName: 'temperaturePreference', value: '적당' },
  '8-D': { filterName: 'temperaturePreference', value: '유동적' },

  // 9. 평소 흡연 빈도는 어느 정도인가요?
  '9-A': { filterName: 'smokingStatus', value: '자주함' },
  '9-B': { filterName: 'smokingStatus', value: '적당히함' },
  '9-C': { filterName: 'smokingStatus', value: '가끔함' },
  '9-D': { filterName: 'smokingStatus', value: '안함' },

  // 10. 평소 음주 빈도는 어느 정도인가요?
  '10-A': { filterName: 'drinkingStatus', value: '자주함' },
  '10-B': { filterName: 'drinkingStatus', value: '적당히함' },
  '10-C': { filterName: 'drinkingStatus', value: '가끔함' },
  '10-D': { filterName: 'drinkingStatus', value: '안함' },
}
