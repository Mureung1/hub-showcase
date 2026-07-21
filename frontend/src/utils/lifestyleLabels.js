// 생활성향 테스트 소프트필터(7, 8번 문항) 원본 답변 값 -> 화면에 보여줄 한글 라벨 매핑
// 원본 값은 backend/src/data/lifestyleFilterMap.js 기준 (GET /api/users/:userId/profile 응답으로 실제 확인함)

const GUEST_POLICY_LABELS = {
  비허용: '손님방문 비허용',
  사전동의시짧은방문: '손님방문 사전동의 후 허용',
  늦은시간외허용: '손님방문 늦은시간 외 허용',
  자유허용: '손님방문 자유허용',
}

const TEMPERATURE_PREFERENCE_LABELS = {
  따뜻함: '온도선호 따뜻함',
  시원함: '온도선호 시원함',
  적당: '온도선호 적당함',
  유동적: '온도선호 유동적',
}

export function getGuestPolicyLabel(value) {
  return GUEST_POLICY_LABELS[value] ?? '정보 없음'
}

export function getTemperaturePreferenceLabel(value) {
  return TEMPERATURE_PREFERENCE_LABELS[value] ?? '정보 없음'
}
