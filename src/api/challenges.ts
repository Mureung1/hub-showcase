import { request } from './client.ts'

type TodayChallenge = {
  date: string
  topic: string
}

export function getTodayChallenge(): Promise<TodayChallenge> {
  return request('/challenges/today')
}
