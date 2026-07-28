import { test, expect } from 'vitest'
import { describeCost, baseFareForHub, estimateCost, fareTiersFor } from './describeCost.js'

test('1인이면 황제 값이다', () => {
  expect(describeCost(1)).toEqual({ icon: '👑', label: '황제 값' })
})

test('2인이면 부자 값이다', () => {
  expect(describeCost(2)).toEqual({ icon: '💰', label: '부자 값' })
})

test('3인이면 햄버거 한 개 값이다', () => {
  expect(describeCost(3)).toEqual({ icon: '🍔', label: '햄버거 한 개 값' })
})

test('4인이면 음료 한 잔 값이다', () => {
  expect(describeCost(4)).toEqual({ icon: '🥤', label: '음료 한 잔 값' })
})

test('가까운 거점(대구공항)은 기본요금이 낮다', () => {
  expect(baseFareForHub('대구공항')).toBe(6000)
})

test('보통 거점(대구역)은 중간 기본요금이다', () => {
  expect(baseFareForHub('대구역')).toBe(9000)
})

test('먼 거점(동대구역)은 기본요금이 높다', () => {
  expect(baseFareForHub('동대구역')).toBe(14000)
})

test('모르는 거점 이름이면 보통 요금으로 취급한다', () => {
  expect(baseFareForHub('알수없는거점')).toBe(9000)
})

test('1인이면 그 거점 기본요금 전액이다', () => {
  expect(estimateCost(1, '대구역')).toBe(9000)
})

test('2인이면 절반이다', () => {
  expect(estimateCost(2, '대구역')).toBe(4500)
})

test('4인이면 4분의 1이다', () => {
  expect(estimateCost(4, '동대구역')).toBe(3500)
})

test('거점별 1~4인 요금표를 만든다', () => {
  expect(fareTiersFor('대구공항')).toEqual([
    { headcount: 1, won: 6000, icon: '👑', label: '황제 값' },
    { headcount: 2, won: 3000, icon: '💰', label: '부자 값' },
    { headcount: 3, won: 2000, icon: '🍔', label: '햄버거 한 개 값' },
    { headcount: 4, won: 1500, icon: '🥤', label: '음료 한 잔 값' },
  ])
})
