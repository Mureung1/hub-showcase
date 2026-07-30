export const NATIONAL_FLAGSHIP_UNIVERSITIES = [
  '강원대학교',
  '경북대학교',
  '경상국립대학교',
  '부산대학교',
  '서울대학교',
  '전남대학교',
  '전북대학교',
  '제주대학교',
  '충남대학교',
  '충북대학교',
]

export const CONTRACT_TYPES = [
  { value: '월세', label: '월세' },
  { value: '전세', label: '전세' },
  { value: '상관없음', label: '상관없음' },
]

export const CONTRACT_TYPE_VALUES = CONTRACT_TYPES.map((option) => option.value)

export const DESTINATIONS = [
  { value: '학교', label: '학교' },
  { value: '직장', label: '직장' },
  { value: '기타', label: '기타' },
]

export const DESTINATION_VALUES = DESTINATIONS.map((option) => option.value)

export const TRANSPORTATION_OPTIONS = [
  { value: '도보', label: '도보' },
  { value: '대중교통', label: '대중교통' },
  { value: '자동차', label: '자동차' },
  { value: '자전거', label: '자전거' },
]

export const TRANSPORTATION_VALUES = TRANSPORTATION_OPTIONS.map((option) => option.value)

export const HOUSING_TYPE_OPTIONS = [
  { value: '원룸', label: '원룸' },
  { value: '투룸', label: '투룸' },
  { value: '오피스텔', label: '오피스텔' },
  { value: '빌라', label: '빌라' },
  { value: '아파트', label: '아파트' },
  { value: '상관없음', label: '상관없음' },
]

export const HOUSING_TYPE_VALUES = HOUSING_TYPE_OPTIONS.map((option) => option.value)

export const PRIORITY_OPTIONS = [
  { value: '역세권', label: '역세권' },
  { value: '채광', label: '채광' },
  { value: '방음', label: '방음' },
  { value: '치안', label: '치안' },
  { value: '편의시설', label: '편의시설' },
  { value: '주차', label: '주차' },
  { value: '엘리베이터', label: '엘리베이터' },
  { value: '반려동물 가능', label: '반려동물 가능' },
]

export const PRIORITY_VALUES = PRIORITY_OPTIONS.map((option) => option.value)

export const AVOID_CONDITION_OPTIONS = [
  { value: '반지하', label: '반지하' },
  { value: '옥탑', label: '옥탑' },
  { value: '저층', label: '저층' },
  { value: '노후 건물', label: '노후 건물' },
  { value: '큰길 주변', label: '큰길 주변' },
  { value: '유흥가 주변', label: '유흥가 주변' },
]

export const AVOID_CONDITION_VALUES = AVOID_CONDITION_OPTIONS.map((option) => option.value)

export function formatSelectedValues(values) {
  return Array.isArray(values) && values.length > 0 ? values.join(', ') : '선택 안 함'
}
