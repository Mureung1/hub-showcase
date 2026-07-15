import { test } from 'node:test'
import assert from 'node:assert/strict'
import { analyzeReviews } from '../src/services/reviews.service.js'

test('부정 단어가 있으면 negative로 분류된다', () => {
  const [result] = analyzeReviews(['직원이 너무 불친절했어요'])
  assert.equal(result.sentiment, 'negative')
})

test("'불친절'처럼 부정 접두사가 붙은 긍정 단어는 긍정으로 세지 않는다", () => {
  const [result] = analyzeReviews(['불친절해서 실망했어요'])
  assert.equal(result.sentiment, 'negative')
})

test('긍정 단어가 있으면 positive로 분류된다', () => {
  const [result] = analyzeReviews(['정말 친절하고 맛있었어요'])
  assert.equal(result.sentiment, 'positive')
})

test('감정 단어가 없으면 neutral로 분류된다', () => {
  const [result] = analyzeReviews(['그냥 그랬어요'])
  assert.equal(result.sentiment, 'neutral')
})

test('키워드 카테고리가 매칭되면 추출된다', () => {
  const [result] = analyzeReviews(['음식이 너무 맛있었어요'])
  assert.ok(result.keywords.includes('맛'))
})

test('매칭되는 키워드가 없으면 일반으로 분류된다', () => {
  const [result] = analyzeReviews(['그냥 그랬어요'])
  assert.deepEqual(result.keywords, ['일반'])
})

test('긍정 리뷰의 관심도 점수는 10점이다', () => {
  const [result] = analyzeReviews(['정말 좋았어요'])
  assert.equal(result.score, 10)
})

test('중립 리뷰의 관심도 점수는 40점이다', () => {
  const [result] = analyzeReviews(['그냥 그랬어요'])
  assert.equal(result.score, 40)
})

test('부정 리뷰(키워드 1개)의 관심도 점수는 70점이다', () => {
  const [result] = analyzeReviews(['직원이 불친절했어요'])
  assert.equal(result.keywords.length, 1)
  assert.equal(result.score, 70)
})

test('부정 리뷰는 매칭 키워드가 많을수록 관심도 점수가 높다', () => {
  const [single] = analyzeReviews(['직원이 불친절했어요'])
  const [double] = analyzeReviews(['음식이 맛없고 너무 오래 기다렸어요'])
  assert.equal(double.keywords.length, 2)
  assert.ok(double.score > single.score)
})
