import { CalendarDays, Home, Megaphone, Store } from 'lucide-react'
import type { Booth, NavItem, Notice, ScheduleItem } from '../types/festival'

export const dates = ['5.16 금', '5.17 토', '5.18 일']

export const scheduleCategories = ['전체', '공연', '이벤트', '체험']

export const boothCategories = ['전체', '음식', '체험', '굿즈']

export const schedules: ScheduleItem[] = [
  {
    id: 1,
    date: '5.16 금',
    time: '14:00',
    endTime: '15:00',
    title: '동아리 버스킹',
    location: '학생회관 앞',
    category: '공연',
  },
  {
    id: 2,
    date: '5.16 금',
    time: '18:00',
    endTime: '19:00',
    title: '중앙무대 밴드 공연',
    location: '중앙운동장 중앙무대',
    category: '공연',
  },
  {
    id: 3,
    date: '5.16 금',
    time: '20:00',
    endTime: '21:00',
    title: '총학생회 레크리에이션',
    location: '중앙무대',
    category: '이벤트',
  },
  {
    id: 4,
    date: '5.17 토',
    time: '13:00',
    endTime: '16:00',
    title: '캠퍼스 스탬프 투어',
    location: '정문 안내부스',
    category: '체험',
  },
  {
    id: 5,
    date: '5.17 토',
    time: '19:30',
    endTime: '21:00',
    title: '초청 가수 공연',
    location: '중앙운동장 중앙무대',
    category: '공연',
  },
  {
    id: 6,
    date: '5.18 일',
    time: '17:00',
    endTime: '18:00',
    title: '폐막 응원전',
    location: '중앙무대',
    category: '이벤트',
  },
]

export const booths: Booth[] = [
  {
    id: 1,
    date: '5.16 금',
    name: '청춘분식',
    category: '음식',
    location: 'A구역 03',
    hours: '12:00 - 22:00',
    menu: ['떡볶이', '순대', '쿨피스'],
    prices: ['4,000원', '4,000원', '1,500원'],
  },
  {
    id: 2,
    date: '5.16 금',
    name: '푸른 사진관',
    category: '체험',
    location: 'B구역 07',
    hours: '13:00 - 20:00',
    menu: ['즉석 사진', '포토카드 꾸미기'],
    prices: ['3,000원', '2,000원'],
  },
  {
    id: 3,
    date: '5.16 금',
    name: '축제 굿즈샵',
    category: '굿즈',
    location: 'C구역 02',
    hours: '12:00 - 21:00',
    menu: ['대동제 키링', '응원 타월'],
    prices: ['5,000원', '7,000원'],
  },
  {
    id: 4,
    date: '5.17 토',
    name: '한입 타코야끼',
    category: '음식',
    location: 'A구역 05',
    hours: '12:00 - 22:00',
    menu: ['타코야끼 8알', '오코노미야끼'],
    prices: ['5,000원', '6,000원'],
  },
  {
    id: 5,
    date: '5.17 토',
    name: '행운 뽑기',
    category: '체험',
    location: 'B구역 11',
    hours: '14:00 - 20:00',
    menu: ['룰렛', '미션 카드'],
    prices: ['1,000원', '무료'],
  },
  {
    id: 6,
    date: '5.18 일',
    name: '마지막 포차',
    category: '음식',
    location: 'A구역 01',
    hours: '12:00 - 19:00',
    menu: ['닭꼬치', '레몬에이드'],
    prices: ['4,500원', '3,000원'],
  },
]

export const notices: Notice[] = [
  {
    id: 1,
    title: '쓰레기는 지정된 장소에 버려주세요!',
    author: '축제운영본부',
    date: '2026.05.16',
    body: '축제장 내 쓰레기 배출 구역은 중앙운동장 양쪽 출입구와 학생회관 앞에 마련되어 있습니다. 쾌적한 축제를 위해 분리배출에 협조해주세요.',
    important: true,
  },
  {
    id: 2,
    title: '우천 시 일부 야외 프로그램이 변경됩니다',
    author: '총학생회',
    date: '2026.05.16',
    body: '우천 상황에 따라 중앙무대 프로그램 시간이 조정될 수 있습니다. 변경 사항은 공지사항을 통해 다시 안내합니다.',
    important: true,
  },
  {
    id: 3,
    title: '분실물 센터 운영 안내',
    author: '축제운영본부',
    date: '2026.05.15',
    body: '분실물 센터는 학생회관 1층 로비에서 12:00부터 22:00까지 운영됩니다. 습득물은 현장 스태프에게 전달해주세요.',
    important: false,
  },
]

export const navItems: NavItem[] = [
  { id: 'home', label: '홈', icon: Home },
  { id: 'timetable', label: '타임테이블', icon: CalendarDays },
  { id: 'booths', label: '부스', icon: Store },
  { id: 'more', label: '공지', icon: Megaphone },
]

export const today = '5.16 금'

export const nextEvent = schedules[1]

export const importantNotice =
  notices.find((notice) => notice.important) ?? notices[0]
