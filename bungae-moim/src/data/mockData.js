// FE mock 데이터는 0건(전부 API 응답으로 대체됨). 이 파일은 실제 상수만 담는다:
// CATEGORIES(카테고리 필터/등록 폼 값)와, BE와 공유하는 지역 데이터(shared/regions.json)의 재export.

import regionsData from '../../../shared/regions.json'

export const CATEGORIES = ['전체', '운동', '스터디', '취미', '식사']

// 공용 단일 소스(BE와 동일). 구조: { 시도: [시군구, ...] }. 읍/면/동 없음.
export const REGIONS = regionsData
