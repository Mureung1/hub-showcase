import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import App from './App'

afterEach(() => {
  cleanup()
})

describe('App', () => {
  it('메인 화면에 서비스명 제목이 렌더링된다', () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: '답냥이' })).toBeInTheDocument()
  })

  it('상황 카드를 고르면 텍스트 입력 없이 바로 템플릿 결과가 나온다', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /교수냥/ }))
    fireEvent.click(screen.getByRole('button', { name: '결석·과제 문의' }))

    expect(screen.getByText(/결석 사유를 말씀드리고 과제 제출 기한을 여쭙고 싶습니다/)).toBeInTheDocument()
    expect(screen.getAllByText('빈칸을 채워주세요')).toHaveLength(3)
  })

  it('다른 상황이냥을 고르면 답장 모드에서 받은 메시지가 있어야 후보를 만들 수 있다', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /답장할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /교수냥/ }))
    fireEvent.click(screen.getByRole('button', { name: '다른 상황이냥?' }))

    expect(screen.getByRole('button', { name: '보낼 말 3가지 만들기' })).toBeDisabled()

    fireEvent.change(screen.getByLabelText('받은 메시지 붙여넣기'), {
      target: { value: '과제 기한 연장 문의 주셔서 확인했습니다.' },
    })

    expect(screen.getByRole('button', { name: '보낼 말 3가지 만들기' })).toBeEnabled()
  })

  it('템플릿 결과에서 다시 만들기를 누르면 다른 상황이냥 화면으로 전환된다', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /교수냥/ }))
    fireEvent.click(screen.getByRole('button', { name: '결석·과제 문의' }))
    fireEvent.click(screen.getByRole('button', { name: '다시 만들기' }))

    expect(screen.getByRole('button', { name: '보낼 말 3가지 만들기' })).toBeInTheDocument()
  })
})
