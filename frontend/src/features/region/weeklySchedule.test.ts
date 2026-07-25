import { expect, it } from 'vitest'
import { buildWeeklySchedule } from './weeklySchedule'

it('dow가 "매일"이면 모든 요일에 해당 카테고리가 포함된다', () => {
  const rule = { dow: '매일', method: '전용 용기에 담아 배출', beginTime: '19:00', endTime: '23:00' }
  const schedule = buildWeeklySchedule({
    생활쓰레기: null,
    음식물쓰레기: rule,
    재활용품: null,
    대형폐기물: null,
  })

  expect(schedule.every((day) => day.rules.some((r) => r.category === '음식물쓰레기'))).toBe(true)
})
