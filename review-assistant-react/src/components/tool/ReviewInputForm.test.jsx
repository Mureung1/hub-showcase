import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ReviewInputForm from './ReviewInputForm'

describe('정상 동작 (Happy Path)', () => {
  it('기본 UI 요소들이 정상적으로 렌더링되어야 한다', () => {
    render(
      <ReviewInputForm
        value=""
        onChange={vi.fn()}
        onAnalyze={vi.fn()}
        loading={false}
        lineCount={0}
      />
    )

    // 입력 영역 확인
    expect(screen.getByLabelText('리뷰 붙여넣기')).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText(/음식은 맛있었는데 너무 오래 기다렸어요/)
    ).toBeInTheDocument()

    // 예시 칩 버튼 확인
    expect(screen.getByRole('button', { name: '대기시간 불만 예시' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '친절도 칭찬 예시' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '여러 리뷰 섞어보기' })).toBeInTheDocument()

    // 분석 시작 버튼 확인
    expect(screen.getByRole('button', { name: '분석 시작' })).toBeInTheDocument()

    // 입력 힌트 확인
    expect(screen.getByText('0개 입력됨')).toBeInTheDocument()
  })
})
