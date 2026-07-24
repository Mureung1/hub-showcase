import { CalendarClock, FileBarChart, LineChart, ShieldCheck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface QuickQuestion {
  id: string
  icon: LucideIcon
  title: string
  description: string
  question: string
}

export const QUICK_QUESTIONS: QuickQuestion[] = [
  {
    id: 'market-today',
    icon: FileBarChart,
    title: '오늘 시장이 왜 움직였는지 볼까요?',
    description: '오늘 시황을 쉬운 문장으로 정리해드려요',
    question: '오늘 시장이 왜 움직였는지 볼까요?',
  },
  {
    id: 'watchlist-risk',
    icon: LineChart,
    title: '관심 종목의 근거와 리스크를 볼까요?',
    description: '상승 근거와 하락 리스크를 나눠서 보여드려요',
    question: '관심 종목의 근거와 리스크를 볼까요?',
  },
  {
    id: 'entry-check',
    icon: ShieldCheck,
    title: '지금 들어가도 되는 자리인지 점검할까요?',
    description: '진입 전 확인해야 할 리스크를 짚어드려요',
    question: '지금 들어가도 되는 자리인지 점검할까요?',
  },
  {
    id: 'upcoming-calendar',
    icon: CalendarClock,
    title: '다가오는 증시 일정을 정리할까요?',
    description: '증시에 영향을 줄 이벤트만 골라드려요',
    question: '다가오는 증시 일정을 정리할까요?',
  },
]
