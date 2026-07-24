import { CATEGORIES, REGIONS } from '../data/mockData.js'

// 기본 날짜는 미래로. 과거 날짜는 목록의 '지난 모임 제외' 필터에 걸려 안 보인다.
export function futureDateStr(daysAhead) {
  const d = new Date()
  d.setDate(d.getDate() + daysAhead)
  return d.toISOString().slice(0, 10)
}

// 등록/수정 공용 기본값. 수정 페이지는 meetingToFormValues로 채워 넘긴다.
export function defaultFormValues() {
  return {
    type: 'flash',
    title: '',
    category: CATEGORIES[1],
    sido: Object.keys(REGIONS)[0],
    sigungu: Object.keys(REGIONS[Object.keys(REGIONS)[0]])[0],
    eupmyeondong: '',
    date: futureDateStr(1),
    time: '19:00',
    endDate: futureDateStr(60),
    capacity: 4,
    adultOnly: false,
    openChatUrl: '',
    description: '',
  }
}
