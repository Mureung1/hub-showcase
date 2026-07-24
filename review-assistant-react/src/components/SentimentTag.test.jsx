import { render, screen } from '@testing-library/react'
import { test, expect } from 'vitest'
import SentimentTag from './SentimentTag'

test('positive sentiment는 "긍정"으로 표시된다', () => {
  render(<SentimentTag sentiment="positive" />)
  expect(screen.getByText('긍정')).toBeInTheDocument()
})

test('negative sentiment는 "부정"으로 표시된다', () => {
  render(<SentimentTag sentiment="negative" />)
  expect(screen.getByText('부정')).toBeInTheDocument()
})

test('매핑에 없는 sentiment 값은 그대로 표시된다', () => {
  render(<SentimentTag sentiment="unknown" />)
  expect(screen.getByText('unknown')).toBeInTheDocument()
})

test('children이 있으면 라벨 뒤에 함께 표시된다', () => {
  render(<SentimentTag sentiment="neutral">(3건)</SentimentTag>)
  expect(screen.getByText('중립', { exact: false })).toBeInTheDocument()
  expect(screen.getByText('(3건)', { exact: false })).toBeInTheDocument()
})
