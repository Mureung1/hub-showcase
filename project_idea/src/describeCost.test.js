import { test, expect } from 'vitest'
import { describeCost, baseFareForHub, estimateCost, fareTiersFor } from './describeCost.js'

test('3000원이면 음료 한 잔 값이다', () => {
  expect(describeCost(3000)).toEqual({ icon: '🥤', label: '음료 한 잔 값' })
})

test('경계값 3500원이면 아직 음료 한 잔 값이다', () => {
  expect(describeCost(3500)).toEqual({ icon: '🥤', label: '음료 한 잔 값' })
})

test('4000원이면 커피 한 잔 값이다', () => {
  expect(describeCost(4000)).toEqual({ icon: '☕', label: '커피 한 잔 값' })
})

test('경계값 5000원이면 아직 커피 한 잔 값이다', () => {
  expect(describeCost(5000)).toEqual({ icon: '☕', label: '커피 한 잔 값' })
})

test('6000원이면 햄버거 한 개 값이다', () => {
  expect(describeCost(6000)).toEqual({ icon: '🍔', label: '햄버거 한 개 값' })
})

test('경계값 8000원이면 아직 햄버거 한 개 값이다', () => {
  expect(describeCost(8000)).toEqual({ icon: '🍔', label: '햄버거 한 개 값' })
})

test('12000원이면 치킨 한 마리 값이다', () => {
  expect(describeCost(12000)).toEqual({ icon: '🍗', label: '치킨 한 마리 값' })
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
    { headcount: 1, won: 6000, icon: '🍔', label: '햄버거 한 개 값' },
    { headcount: 2, won: 3000, icon: '🥤', label: '음료 한 잔 값' },
    { headcount: 3, won: 2000, icon: '🥤', label: '음료 한 잔 값' },
    { headcount: 4, won: 1500, icon: '🥤', label: '음료 한 잔 값' },
  ])
})
