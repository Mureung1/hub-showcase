import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import App from './App'
import ProjectIntro from './ProjectIntro'

afterEach(() => {
  cleanup()
  window.sessionStorage.clear()
  vi.useRealTimers()
})

beforeEach(() => {
  window.sessionStorage.clear()
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
    expect(screen.getAllByText('[과목명]')).toHaveLength(3)
    expect(screen.getAllByRole('button', { name: '복사' })).toHaveLength(3)
    expect(screen.getByText('기본')).toBeInTheDocument()
    expect(screen.getByText('더 부드럽게')).toBeInTheDocument()
    expect(screen.getByText('더 분명하게')).toBeInTheDocument()
  })

  it('S1의 네 관계 카드에 추후 고양이 에셋을 넣을 전용 영역이 있다', () => {
    const { container } = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))

    expect(container.querySelectorAll('[data-asset-slot="cat"]')).toHaveLength(4)
    expect(screen.getAllByText('이 냥이와 말 고르기 →')).toHaveLength(4)
  })

  it('노출되는 모든 상황 카드는 API 없이 세 개의 템플릿 후보를 반환한다', () => {
    const templateRoutes = [
      { helper: /팀플냥/, cards: ['일정 조율', '감사·확인', '부탁', '사과', '거절', '몫 확인·재촉'] },
      { helper: /교수냥/, cards: ['일정 조율', '감사·확인', '부탁', '사과', '거절', '결석·과제 문의'] },
      { helper: /선배냥/, cards: ['일정 조율', '감사·확인', '부탁', '사과', '거절', '말 편하게 하자고 하기'] },
      { helper: /연인냥/, cards: ['일정 조율', '감사·확인', '부탁', '사과', '거절', '마음 표현하기'] },
    ]

    for (const route of templateRoutes) {
      for (const card of route.cards) {
        window.sessionStorage.clear()
        const { unmount } = render(<App />)
        fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
        fireEvent.click(screen.getByRole('button', { name: route.helper }))
        fireEvent.click(screen.getByRole('button', { name: card }))

        expect(screen.getAllByRole('button', { name: '복사' })).toHaveLength(3)
        unmount()
      }
    }
  })

  it('다른 상황이냥을 고르면 답장 모드에서 받은 메시지가 있어야 후보를 만들 수 있다', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /답장할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /교수냥/ }))
    fireEvent.click(screen.getByRole('button', { name: '다른 상황이냥?' }))

    expect(screen.getByRole('button', { name: '보낼 말 3가지 만들기' })).toBeDisabled()
    expect(screen.getByText('메시지 목적을 골라주세요.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '질문하기' }))

    fireEvent.change(screen.getByLabelText('받은 메시지 붙여넣기'), {
      target: { value: '과제 기한 연장 문의 주셔서 확인했습니다.' },
    })

    expect(screen.getByRole('button', { name: '보낼 말 3가지 만들기' })).toBeEnabled()
    expect(screen.getByText('23/500자')).toBeInTheDocument()
  })

  it('템플릿 결과에서 다시 만들기를 누르면 다른 상황이냥 화면으로 전환된다', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /교수냥/ }))
    fireEvent.click(screen.getByRole('button', { name: '결석·과제 문의' }))
    fireEvent.click(screen.getByRole('button', { name: '다시 만들기' }))

    expect(screen.getByRole('button', { name: '보낼 말 3가지 만들기' })).toBeInTheDocument()
  })

  it('직접입력은 목 생성기의 대기 상태를 거쳐 구조화된 후보를 보여준다', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /선배냥/ }))
    fireEvent.click(screen.getByRole('button', { name: '다른 상황이냥?' }))
    fireEvent.click(screen.getByRole('button', { name: '질문하기' }))
    fireEvent.change(screen.getByLabelText('상황 설명'), {
      target: { value: '동아리 회의 시간을 다시 확인하고 싶어요.' },
    })
    fireEvent.click(screen.getByRole('button', { name: '보낼 말 3가지 만들기' }))

    expect(screen.getByRole('button', { name: '보낼 말을 만들고 있어요…' })).toBeDisabled()
    expect(screen.getByLabelText('보낼 말 후보를 준비하고 있어요')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('현재는 AI 연결 전 검증용 예시 후보입니다.')).toBeInTheDocument()
    })
    expect(screen.getAllByRole('button', { name: '복사' })).toHaveLength(3)
  })

  it('생성 실패 시 입력을 유지하고 다시 시도 동선을 보여준다', async () => {
    render(<ProjectIntro mockGenerationCase="error429" />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /선배냥/ }))
    fireEvent.click(screen.getByRole('button', { name: '다른 상황이냥?' }))
    fireEvent.click(screen.getByRole('button', { name: '질문하기' }))
    fireEvent.change(screen.getByLabelText('상황 설명'), {
      target: { value: '동아리 회의 시간을 다시 확인하고 싶어요.' },
    })
    fireEvent.click(screen.getByRole('button', { name: '보낼 말 3가지 만들기' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('요청이 많아요. 잠시 후 다시 시도해주세요.')
    })
    expect(screen.getByLabelText('상황 설명')).toHaveValue('동아리 회의 시간을 다시 확인하고 싶어요.')
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument()
  })

  it('20초 안에 응답이 없으면 타임아웃 안내와 입력을 유지한다', async () => {
    vi.useFakeTimers()
    render(<ProjectIntro mockGenerationCase="delay" />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /선배냥/ }))
    fireEvent.click(screen.getByRole('button', { name: '다른 상황이냥?' }))
    fireEvent.click(screen.getByRole('button', { name: '질문하기' }))
    fireEvent.change(screen.getByLabelText('상황 설명'), {
      target: { value: '동아리 회의 시간을 다시 확인하고 싶어요.' },
    })
    fireEvent.click(screen.getByRole('button', { name: '보낼 말 3가지 만들기' }))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000)
    })
    expect(screen.getByRole('status')).toHaveTextContent('조금만 더 기다려주세요.')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000)
    })

    expect(screen.getByRole('alert')).toHaveTextContent('응답이 오래 걸리고 있어요. 잠시 후 다시 시도해주세요.')
    expect(screen.getByLabelText('상황 설명')).toHaveValue('동아리 회의 시간을 다시 확인하고 싶어요.')
  })

  it('카톡 전환 뒤 다시 열어도 현재 입력을 같은 탭에서 복원한다', () => {
    const { unmount } = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /선배냥/ }))
    fireEvent.click(screen.getByRole('button', { name: '다른 상황이냥?' }))
    fireEvent.click(screen.getByRole('button', { name: '질문하기' }))
    fireEvent.change(screen.getByLabelText('상황 설명'), {
      target: { value: '동아리 회의 시간을 다시 확인하고 싶어요.' },
    })

    unmount()
    render(<App />)

    expect(screen.getByLabelText('상황 설명')).toHaveValue('동아리 회의 시간을 다시 확인하고 싶어요.')
    expect(screen.getByRole('button', { name: '보낼 말 3가지 만들기' })).toBeEnabled()
  })

  it('관계만 다시 골라도 직접 작성한 상황을 유지한다', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /교수냥/ }))
    fireEvent.click(screen.getByRole('button', { name: '다른 상황이냥?' }))
    fireEvent.click(screen.getByRole('button', { name: '질문하기' }))
    fireEvent.change(screen.getByLabelText('상황 설명'), {
      target: { value: '다음 모임 시간을 다시 확인하고 싶어요.' },
    })

    fireEvent.click(screen.getByRole('button', { name: /상황 카드로 돌아가기/ }))
    fireEvent.click(screen.getByRole('button', { name: /다른 관계 고르기/ }))
    fireEvent.click(screen.getByRole('button', { name: /선배냥/ }))
    fireEvent.click(screen.getByRole('button', { name: '다른 상황이냥?' }))

    expect(screen.getByLabelText('상황 설명')).toHaveValue('다음 모임 시간을 다시 확인하고 싶어요.')
  })

  it('사용자가 이 탭에 임시 보관한 작성 내용을 즉시 지울 수 있다', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /선배냥/ }))
    fireEvent.click(screen.getByRole('button', { name: '다른 상황이냥?' }))
    fireEvent.click(screen.getByRole('button', { name: '질문하기' }))
    fireEvent.change(screen.getByLabelText('상황 설명'), {
      target: { value: '동아리 회의 시간을 다시 확인하고 싶어요.' },
    })

    fireEvent.click(screen.getByRole('button', { name: '이 탭의 작성 내용 지우기' }))

    expect(screen.getByRole('heading', { level: 2, name: '어떤 상황인가요?' })).toBeInTheDocument()
    expect(window.sessionStorage.getItem('dabnyangi:flow')).toBeNull()
  })

  it('클립보드를 쓸 수 없으면 후보 텍스트를 선택해 복사를 이어갈 수 있게 한다', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /교수냥/ }))
    fireEvent.click(screen.getByRole('button', { name: '결석·과제 문의' }))
    fireEvent.click(screen.getAllByRole('button', { name: '복사' })[0])

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '텍스트 선택됨' })).toBeInTheDocument()
    })
    expect(window.getSelection()?.toString()).toContain('결석 사유를 말씀드리고')
  })
})
