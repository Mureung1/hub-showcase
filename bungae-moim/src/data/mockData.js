// 프로토타입용 목 데이터. 오늘 = 2026-07-09(목) 기준으로 하드코딩했습니다.
// 실제 서비스에서는 이 파일 전체가 API 응답(번개모임_소모임_API_명세서.md)으로 대체됩니다.

import regionsData from '../../../shared/regions.json'

export const CATEGORIES = ['전체', '운동', '스터디', '취미', '식사']

// 공용 단일 소스(BE와 동일). 구조: { 시도: [시군구, ...] }. 읍/면/동 없음.
export const REGIONS = regionsData
