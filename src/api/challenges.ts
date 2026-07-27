import { request } from './client.ts'

type TodayChallenge = {
  date: string
  topic: string
}

export const CHALLENGE_CATEGORIES = ['자연', '감각', '일상', '사물', '감정']

export function getTodayChallenge(): Promise<TodayChallenge> {
  return request('/challenges/today')
}
