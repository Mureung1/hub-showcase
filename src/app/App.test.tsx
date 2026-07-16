import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import App from './App'
import MessageFlow from '../pages/message-flow'

afterEach(() => {
  cleanup()
  window.sessionStorage.clear()
  vi.useRealTimers()
  vi.restoreAllMocks()
  Reflect.deleteProperty(navigator, 'clipboard')
})

beforeEach(() => {
  window.sessionStorage.clear()
})

const chooseHaeyoSpeechStyle = () => {
  fireEvent.click(screen.getByRole('radio', { name: /요체/ }))
}

const chooseProfessorMessenger = () => {
  fireEvent.click(screen.getByRole('button', { name: /교수냥/ }))
  fireEvent.click(screen.getByRole('radio', { name: /^메신저/ }))
}

const openProfessorEmailSituation = (situationName: string) => {
  fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
  fireEvent.click(screen.getByRole('button', { name: /교수냥/ }))
  fireEvent.click(screen.getByRole('radio', { name: /^이메일/ }))
  fireEvent.click(screen.getByRole('button', { name: situationName }))
}

const fillCommonEmailDetails = (details = '자료구조 과제 2번의 제출 형식을 확인하고 싶습니다.') => {
  fireEvent.change(screen.getByLabelText('받는 분 성함과 호칭'), { target: { value: '김민서 교수님' } })
  fireEvent.change(screen.getByLabelText('학과'), { target: { value: '컴퓨터공학과' } })
  fireEvent.change(screen.getByLabelText('학번'), { target: { value: '20261234' } })
  fireEvent.change(screen.getByLabelText('이름'), { target: { value: '이나비' } })
  fireEvent.change(screen.getByLabelText('전달할 구체 내용'), { target: { value: details } })
}

describe('App', () => {
  it('메인 화면에 서비스명 제목이 렌더링된다', () => {
    const { container } = render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: '답냥이' })).toBeInTheDocument()
    expect(container.querySelector('.cat-stage')).toHaveAttribute('data-state', 'idle')
    expect(container.querySelector('.cat-stage-fallback')).toHaveAttribute('src', '/cats/dabnyangi-main.webp')
  })

  it('선택과 결과 단계가 브랜드 냥이 상태에 연결된다', () => {
    const { container } = render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    expect(container.querySelector('.cat-stage')).toHaveAttribute('data-state', 'selected')

    chooseProfessorMessenger()
    expect(container.querySelector('.cat-stage-fallback')).toHaveAttribute('src', '/cats/professor-cat-stage.webp')
    chooseHaeyoSpeechStyle()
    fireEvent.click(screen.getByRole('button', { name: '감사·확인' }))
    expect(container.querySelector('.cat-stage')).toHaveAttribute('data-state', 'result')
  })

  it('상황 카드를 고르면 텍스트 입력 없이 바로 템플릿 결과가 나온다', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    chooseProfessorMessenger()
    chooseHaeyoSpeechStyle()
    fireEvent.click(screen.getByRole('button', { name: '부탁' }))

    expect(screen.getAllByText('빈칸을 채워주세요')).toHaveLength(3)
    expect(screen.getAllByText('[부탁할 내용]')).toHaveLength(3)
    expect(screen.getAllByRole('button', { name: '복사' })).toHaveLength(3)
    expect(screen.getByText('기본')).toBeInTheDocument()
    expect(screen.getByText('더 부드럽게')).toBeInTheDocument()
    expect(screen.getByText('더 분명하게')).toBeInTheDocument()
  })

  it('S1의 네 관계 카드는 정적 냥이 이미지를 사용하고 Canvas를 늘리지 않는다', () => {
    const { container } = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))

    expect(container.querySelectorAll('[data-asset-slot="cat"]')).toHaveLength(4)
    expect(
      Array.from(container.querySelectorAll<HTMLImageElement>('[data-asset-slot="cat"] img'), (image) =>
        image.getAttribute('src'),
      ),
    ).toEqual([
      '/cats/groupwork-cat.webp',
      '/cats/professor-cat.webp',
      '/cats/senior-cat.webp',
      '/cats/friend-cat.webp',
    ])
    expect(container.querySelector<HTMLImageElement>('img[src="/cats/senior-cat.webp"]')).not.toHaveAttribute(
      'data-crop',
    )
    expect(container.querySelectorAll('[data-asset-slot="cat"] canvas')).toHaveLength(0)
    expect(container.querySelector('.scenario-card-art-placeholder')).toBeNull()
    expect(screen.getAllByText(/에게 이어 말하기 →/)).toHaveLength(4)
  })

  it('빈 입력창 대신 냥이 질문과 빠른 답변으로 대화를 시작한다', () => {
    render(<App />)

    expect(screen.getByRole('region', { name: '답냥이 가이드 대화' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: '지금 필요한 건 어떤 말이냥?' })).toBeInTheDocument()
    expect(screen.getByLabelText('빠른 답변')).toBeInTheDocument()
    expect(screen.getByRole('list', { name: '말 고르기 1/4단계' })).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('선택한 방식과 관계를 사용자 말풍선으로 남기고 관계별 냥이로 전환한다', () => {
    const { container } = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /답장할래요/ }))
    expect(screen.getByLabelText('지금까지 고른 내용')).toHaveTextContent('답장할래요')
    expect(screen.getByRole('list', { name: '말 고르기 2/4단계' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /교수냥/ }))

    expect(screen.getByLabelText('지금까지 고른 내용')).toHaveTextContent('답장할래요')
    expect(screen.getByLabelText('지금까지 고른 내용')).toHaveTextContent('교수님·조교님')
    expect(container.querySelector('.chat-shell')).toHaveAttribute('data-scenario', 'professor')
    expect(container.querySelector('.chat-header-avatar img')).toHaveAttribute('src', '/cats/professor-cat.webp')
    expect(screen.getByRole('list', { name: '말 고르기 3/4단계' })).toBeInTheDocument()
  })

  it('결과 세 개를 관계별 냥이의 한 말 꾸러미로 동시에 보여준다', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /팀플냥/ }))
    chooseHaeyoSpeechStyle()
    fireEvent.click(screen.getByRole('button', { name: '감사·확인' }))

    expect(screen.getByRole('heading', { level: 2, name: '어느 톤으로 보낼까냥?' })).toBeInTheDocument()
    expect(screen.getByText(/팀플·조모임에 맞춰 요체로 같은 뜻을 세 가지 톤으로 준비했어요/)).toBeInTheDocument()
    expect(screen.getByText('기본 · 더 부드럽게 · 더 분명하게')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: '복사' })).toHaveLength(3)
    expect(screen.getByRole('list', { name: '말 고르기 4/4단계' })).toBeInTheDocument()
  })

  it('노출되는 모든 상황 카드는 선택한 말투로 API 없이 세 개의 템플릿 후보를 반환한다', () => {
    const templateRoutes = [
      {
        helper: /팀플냥/,
        professor: false,
        cards: ['일정 조율', '감사·확인', '부탁', '답장이 늦었을 때 사과', '거절', '몫 확인·재촉'],
      },
      {
        helper: /교수냥/,
        professor: true,
        cards: ['일정 조율', '감사·확인', '부탁', '답장이 늦었을 때 사과', '거절', '결석·과제 문의'],
      },
      {
        helper: /선배냥/,
        professor: false,
        cards: ['일정 조율', '감사·확인', '부탁', '답장이 늦었을 때 사과', '거절', '말 편하게 하자고 하기'],
      },
      {
        helper: /연인냥/,
        professor: false,
        cards: ['일정 조율', '감사·확인', '부탁', '답장이 늦었을 때 사과', '거절', '마음 표현하기'],
      },
    ]
    const allTemplateCandidateTexts: string[] = []
    let placeholderCandidateCount = 0

    for (const route of templateRoutes) {
      for (const card of route.cards) {
        window.sessionStorage.clear()
        const { container, unmount } = render(<App />)
        fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
        fireEvent.click(screen.getByRole('button', { name: route.helper }))
        if (route.professor) fireEvent.click(screen.getByRole('radio', { name: /^메신저/ }))
        chooseHaeyoSpeechStyle()
        fireEvent.click(screen.getByRole('button', { name: card }))

        const candidateTexts = Array.from(container.querySelectorAll('.result-card > p'), (element) =>
          element.textContent?.trim() ?? '',
        )
        expect(screen.getAllByRole('button', { name: '복사' })).toHaveLength(3)
        expect(candidateTexts).toHaveLength(3)
        expect(new Set(candidateTexts)).toHaveProperty('size', 3)
        allTemplateCandidateTexts.push(...candidateTexts)

        const allCandidateText = candidateTexts.join(' ')
        placeholderCandidateCount += candidateTexts.filter((candidateText) => candidateText.includes('[부탁할 내용]')).length

        if (card === '답장이 늦었을 때 사과') {
          for (const candidateText of candidateTexts) {
            expect(candidateText).toMatch(/답/)
          }
        } else {
          expect(allCandidateText).not.toMatch(/답장.*늦|답 늦/)
        }

        unmount()
      }
    }

    expect(placeholderCandidateCount).toBe(12)
    expect(allTemplateCandidateTexts).toHaveLength(72)
  })

  it('대표 네 상황은 답장과 먼저 연락에서 같은 말투 템플릿을 공유한다', () => {
    const representativeRoutes = [
      {
        modes: [/답장할래요/, /먼저 연락할래요/],
        helper: /팀플냥/,
        card: '감사·확인',
        professor: false,
      },
      {
        modes: [/먼저 연락할래요/, /답장할래요/],
        helper: /교수냥/,
        card: '일정 조율',
        professor: true,
      },
      {
        modes: [/먼저 연락할래요/, /답장할래요/],
        helper: /선배냥/,
        card: '말 편하게 하자고 하기',
        professor: false,
      },
      {
        modes: [/답장할래요/, /먼저 연락할래요/],
        helper: /연인냥/,
        card: '거절',
        professor: false,
      },
    ]

    for (const route of representativeRoutes) {
      let expectedMessages: string[] | null = null

      for (const mode of route.modes) {
        window.sessionStorage.clear()
        const { container, unmount } = render(<App />)
        fireEvent.click(screen.getByRole('button', { name: mode }))
        fireEvent.click(screen.getByRole('button', { name: route.helper }))
        if (route.professor) fireEvent.click(screen.getByRole('radio', { name: /^메신저/ }))
        chooseHaeyoSpeechStyle()
        fireEvent.click(screen.getByRole('button', { name: route.card }))

        const messages = Array.from(container.querySelectorAll('.result-card > p'), (element) =>
          element.textContent?.trim() ?? '',
        )
        expectedMessages ??= messages
        expect(messages).toEqual(expectedMessages)
        expect(screen.getAllByRole('button', { name: '복사' })).toHaveLength(3)

        unmount()
      }
    }
  })

  it('직접 설명하기를 고르면 답장 모드에서 받은 메시지가 있어야 후보를 만들 수 있다', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /답장할래요/ }))
    chooseProfessorMessenger()
    fireEvent.click(screen.getByRole('button', { name: '직접 설명할게요' }))

    expect(screen.getByRole('button', { name: '보낼 말 3가지 만들기' })).toBeDisabled()
    expect(screen.getByText('메시지 목적을 골라주세요.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '질문하기' }))

    fireEvent.change(screen.getByLabelText('받은 메시지 붙여넣기'), {
      target: { value: '과제 기한 연장 문의 주셔서 확인했습니다.' },
    })

    expect(screen.getByRole('button', { name: '보낼 말 3가지 만들기' })).toBeDisabled()
    expect(screen.getByText('평소 쓰는 말투를 골라주세요.')).toBeInTheDocument()

    chooseHaeyoSpeechStyle()

    expect(screen.getByRole('button', { name: '보낼 말 3가지 만들기' })).toBeEnabled()
    expect(screen.getByText('23/500자')).toBeInTheDocument()
  })

  it('템플릿 결과는 내 상황에 더 맞추기로 표시하고 누르면 직접 설명하기 입력으로 전환된다', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    chooseProfessorMessenger()
    chooseHaeyoSpeechStyle()
    fireEvent.click(screen.getByRole('button', { name: '결석·과제 문의' }))

    expect(screen.queryByRole('button', { name: '다시 만들기' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '내 상황에 더 맞추기' }))

    expect(screen.getByRole('button', { name: '보낼 말 3가지 만들기' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /요체/ })).toBeChecked()
    expect(screen.getByRole('button', { name: '보낼 말 3가지 만들기' })).toBeDisabled()
  })

  it('템플릿 결과의 상황 다시 고르기는 빠른 답변 화면으로 돌아간다', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    chooseProfessorMessenger()
    chooseHaeyoSpeechStyle()
    fireEvent.click(screen.getByRole('button', { name: '결석·과제 문의' }))
    fireEvent.click(screen.getByRole('button', { name: '상황 다시 고르기' }))

    expect(screen.getByRole('button', { name: '결석·과제 문의' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '직접 설명할게요' })).toBeInTheDocument()
  })

  it('AI 결과의 입력 내용 수정하기는 목적과 입력이 보존된 직접 설명 화면으로 돌아간다', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /선배냥/ }))
    fireEvent.click(screen.getByRole('button', { name: '직접 설명할게요' }))
    fireEvent.click(screen.getByRole('button', { name: '질문하기' }))
    chooseHaeyoSpeechStyle()
    fireEvent.change(screen.getByLabelText('상황 설명'), {
      target: { value: '동아리 회의 시간을 다시 확인하고 싶어요.' },
    })
    fireEvent.click(screen.getByRole('button', { name: '보낼 말 3가지 만들기' }))
    await waitFor(() => expect(screen.getAllByRole('button', { name: '복사' })).toHaveLength(3))

    fireEvent.click(screen.getByRole('button', { name: '입력 내용 수정하기' }))

    expect(screen.getByLabelText('상황 설명')).toHaveValue('동아리 회의 시간을 다시 확인하고 싶어요.')
    expect(screen.getByRole('radio', { name: /요체/ })).toBeChecked()
    expect(screen.getByRole('button', { name: '보낼 말 3가지 만들기' })).toBeEnabled()
  })

  it('리롤이 실패하면 기존 후보 3개를 유지한 채 오류 문구를 보여준다', async () => {
    const { rerender } = render(<MessageFlow mockGenerationCase="normal" />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /선배냥/ }))
    fireEvent.click(screen.getByRole('button', { name: '직접 설명할게요' }))
    fireEvent.click(screen.getByRole('button', { name: '질문하기' }))
    chooseHaeyoSpeechStyle()
    fireEvent.change(screen.getByLabelText('상황 설명'), {
      target: { value: '동아리 회의 시간을 다시 확인하고 싶어요.' },
    })
    fireEvent.click(screen.getByRole('button', { name: '보낼 말 3가지 만들기' }))
    await waitFor(() => expect(screen.getAllByRole('button', { name: '복사' })).toHaveLength(3))

    rerender(<MessageFlow mockGenerationCase="error429" />)
    fireEvent.click(screen.getByRole('button', { name: '다시 만들기' }))

    expect(await screen.findByText('요청이 많아요. 잠시 후 다시 시도해주세요.')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: '복사' })).toHaveLength(3)
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '다시 만들기' })).toBeEnabled()
  })

  it('리롤 중에는 리롤·복사 버튼이 비활성화되고 기존 후보가 유지된다', async () => {
    const { rerender } = render(<MessageFlow mockGenerationCase="normal" />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /선배냥/ }))
    fireEvent.click(screen.getByRole('button', { name: '직접 설명할게요' }))
    fireEvent.click(screen.getByRole('button', { name: '질문하기' }))
    chooseHaeyoSpeechStyle()
    fireEvent.change(screen.getByLabelText('상황 설명'), {
      target: { value: '동아리 회의 시간을 다시 확인하고 싶어요.' },
    })
    fireEvent.click(screen.getByRole('button', { name: '보낼 말 3가지 만들기' }))
    await waitFor(() => expect(screen.getAllByRole('button', { name: '복사' })).toHaveLength(3))

    rerender(<MessageFlow mockGenerationCase="delay" />)
    fireEvent.click(screen.getByRole('button', { name: '다시 만들기' }))

    expect(await screen.findByRole('button', { name: '다시 만들고 있어요…' })).toBeDisabled()
    const copyButtons = screen.getAllByRole('button', { name: '복사' })
    expect(copyButtons).toHaveLength(3)
    for (const copyButton of copyButtons) {
      expect(copyButton).toBeDisabled()
    }
  })

  it('직접입력은 목 생성기의 대기 상태를 거쳐 구조화된 후보를 보여준다', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /선배냥/ }))
    fireEvent.click(screen.getByRole('button', { name: '직접 설명할게요' }))
    fireEvent.click(screen.getByRole('button', { name: '질문하기' }))
    chooseHaeyoSpeechStyle()
    fireEvent.change(screen.getByLabelText('상황 설명'), {
      target: { value: '동아리 회의 시간을 다시 확인하고 싶어요.' },
    })
    fireEvent.click(screen.getByRole('button', { name: '보낼 말 3가지 만들기' }))

    expect(screen.getByRole('button', { name: '보낼 말을 만들고 있어요…' })).toBeDisabled()
    expect(screen.getByLabelText('보낼 말 후보를 준비하고 있어요')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('현재는 AI 연결 전 검증용 예시 후보입니다.')).toBeInTheDocument()
    })
    expect(screen.getByRole('heading', { level: 2, name: '어느 톤으로 보낼까냥?' })).toBeInTheDocument()
    expect(screen.getByText(/선배·동기에 맞춰 요체로 같은 뜻을 세 가지 톤으로 준비했어요/)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: '복사' })).toHaveLength(3)
  })

  it('생성 실패 시 입력을 유지하고 다시 시도 동선을 보여준다', async () => {
    render(<MessageFlow mockGenerationCase="error429" />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /선배냥/ }))
    fireEvent.click(screen.getByRole('button', { name: '직접 설명할게요' }))
    fireEvent.click(screen.getByRole('button', { name: '질문하기' }))
    chooseHaeyoSpeechStyle()
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
    render(<MessageFlow mockGenerationCase="delay" />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /선배냥/ }))
    fireEvent.click(screen.getByRole('button', { name: '직접 설명할게요' }))
    fireEvent.click(screen.getByRole('button', { name: '질문하기' }))
    chooseHaeyoSpeechStyle()
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
    fireEvent.click(screen.getByRole('button', { name: '직접 설명할게요' }))
    fireEvent.click(screen.getByRole('button', { name: '질문하기' }))
    chooseHaeyoSpeechStyle()
    fireEvent.change(screen.getByLabelText('상황 설명'), {
      target: { value: '동아리 회의 시간을 다시 확인하고 싶어요.' },
    })

    unmount()
    render(<App />)

    expect(screen.getByLabelText('상황 설명')).toHaveValue('동아리 회의 시간을 다시 확인하고 싶어요.')
    expect(screen.getByRole('radio', { name: /요체/ })).toBeChecked()
    expect(screen.getByRole('button', { name: '보낼 말 3가지 만들기' })).toBeEnabled()
  })

  it('관계만 다시 골라도 직접 작성한 상황을 유지한다', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    chooseProfessorMessenger()
    fireEvent.click(screen.getByRole('button', { name: '직접 설명할게요' }))
    fireEvent.click(screen.getByRole('button', { name: '질문하기' }))
    chooseHaeyoSpeechStyle()
    fireEvent.change(screen.getByLabelText('상황 설명'), {
      target: { value: '다음 모임 시간을 다시 확인하고 싶어요.' },
    })

    fireEvent.click(screen.getByRole('button', { name: /자주 쓰는 상황에서 고르기/ }))
    fireEvent.click(screen.getByRole('button', { name: /관계 바꾸기/ }))
    fireEvent.click(screen.getByRole('button', { name: /선배냥/ }))
    fireEvent.click(screen.getByRole('button', { name: '직접 설명할게요' }))

    expect(screen.getByLabelText('상황 설명')).toHaveValue('다음 모임 시간을 다시 확인하고 싶어요.')
  })

  it('S0로 돌아가 같은 방식을 다시 고르면 입력과 목적이 유지된다', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /선배냥/ }))
    fireEvent.click(screen.getByRole('button', { name: '직접 설명할게요' }))
    fireEvent.click(screen.getByRole('button', { name: '질문하기' }))
    chooseHaeyoSpeechStyle()
    fireEvent.change(screen.getByLabelText('상황 설명'), {
      target: { value: '동아리 회의 시간을 다시 확인하고 싶어요.' },
    })

    fireEvent.click(screen.getByRole('button', { name: /자주 쓰는 상황에서 고르기/ }))
    fireEvent.click(screen.getByRole('button', { name: /관계 바꾸기/ }))
    fireEvent.click(screen.getByRole('button', { name: /방식 다시 고르기/ }))
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /선배냥/ }))
    fireEvent.click(screen.getByRole('button', { name: '직접 설명할게요' }))

    expect(screen.getByLabelText('상황 설명')).toHaveValue('동아리 회의 시간을 다시 확인하고 싶어요.')
    expect(screen.getByRole('radio', { name: /요체/ })).toBeChecked()
    expect(screen.getByRole('button', { name: '보낼 말 3가지 만들기' })).toBeEnabled()
  })

  it('방식을 바꾸면 입력을 초기화하고 고른 관계는 유지한다', () => {
    const { container } = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /선배냥/ }))
    fireEvent.click(screen.getByRole('button', { name: '직접 설명할게요' }))
    fireEvent.click(screen.getByRole('button', { name: '질문하기' }))
    chooseHaeyoSpeechStyle()
    fireEvent.change(screen.getByLabelText('상황 설명'), {
      target: { value: '동아리 회의 시간을 다시 확인하고 싶어요.' },
    })

    fireEvent.click(screen.getByRole('button', { name: /자주 쓰는 상황에서 고르기/ }))
    fireEvent.click(screen.getByRole('button', { name: /관계 바꾸기/ }))
    fireEvent.click(screen.getByRole('button', { name: /방식 다시 고르기/ }))
    fireEvent.click(screen.getByRole('button', { name: /답장할래요/ }))

    const keptScenarioCard = container.querySelector('.scenario-card[data-selected="true"]')
    expect(keptScenarioCard?.textContent).toContain('선배냥')

    fireEvent.click(screen.getByRole('button', { name: /선배냥/ }))
    fireEvent.click(screen.getByRole('button', { name: '직접 설명할게요' }))

    expect(screen.getByLabelText('상황 설명 (선택)')).toHaveValue('')
    expect(screen.getByLabelText('받은 메시지 붙여넣기')).toHaveValue('')
    expect(screen.getByRole('button', { name: '보낼 말 3가지 만들기' })).toBeDisabled()
  })

  it('관계를 바꾸면 이전 결과를 폐기한다', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /팀플냥/ }))
    chooseHaeyoSpeechStyle()
    fireEvent.click(screen.getByRole('button', { name: '감사·확인' }))

    const storedBefore: unknown = JSON.parse(window.sessionStorage.getItem('dabnyangi:flow') ?? '{}')
    expect((storedBefore as { candidates: unknown[] }).candidates).toHaveLength(3)

    fireEvent.click(screen.getByRole('button', { name: '상황 다시 고르기' }))
    fireEvent.click(screen.getByRole('button', { name: /관계 바꾸기/ }))
    fireEvent.click(screen.getByRole('button', { name: /교수냥/ }))

    const storedAfter: unknown = JSON.parse(window.sessionStorage.getItem('dabnyangi:flow') ?? '{}')
    expect((storedAfter as { candidates: unknown[] }).candidates).toHaveLength(0)
  })

  it('내부 단계 이름 S0~S3을 사용자에게 노출하지 않는다', () => {
    render(<App />)
    expect(screen.queryByText(/^S[0-3]$/)).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    expect(screen.queryByText(/^S[0-3]$/)).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /팀플냥/ }))
    expect(screen.queryByText(/^S[0-3]$/)).toBeNull()

    chooseHaeyoSpeechStyle()
    fireEvent.click(screen.getByRole('button', { name: '감사·확인' }))
    expect(screen.queryByText(/^S[0-3]$/)).toBeNull()
  })

  it('단계가 바뀌면 새 단계 제목으로 초점을 옮긴다', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))

    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 2, name: '누구에게 먼저 연락하냥?' }))

    fireEvent.click(screen.getByRole('button', { name: /팀플냥/ }))
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 2, name: '어떤 상황인지 알려주라냥' }))
  })

  it('목적 칩은 보이는 legend와 aria-pressed 상태를 제공한다', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /선배냥/ }))
    fireEvent.click(screen.getByRole('button', { name: '직접 설명할게요' }))

    expect(screen.getByText('메시지 목적')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '질문하기' })).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(screen.getByRole('button', { name: '질문하기' }))

    expect(screen.getByRole('button', { name: '질문하기' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '부탁하기' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('말투 선택 전에는 상황 카드만 비활성화하고 직접 설명 진입은 허용한다', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    chooseProfessorMessenger()

    const situationCards = ['일정 조율', '감사·확인', '부탁', '답장이 늦었을 때 사과', '거절', '결석·과제 문의']
    for (const card of situationCards) {
      expect(screen.getByRole('button', { name: card })).toBeDisabled()
    }
    expect(screen.getByText('상황 카드를 고르려면 말투를 먼저 골라주세요.')).toHaveAttribute('role', 'status')
    expect(screen.getByRole('button', { name: '직접 설명할게요' })).toBeEnabled()

    fireEvent.click(screen.getByRole('button', { name: '직접 설명할게요' }))
    expect(screen.getByRole('heading', { level: 2, name: '상황을 조금 더 들려주라냥' })).toBeInTheDocument()
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).not.toBeChecked()
    }
  })

  it('직접 설명에서 고른 말투로 돌아와 카드를 즉시 조회하고 결과에 표시한다', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    chooseProfessorMessenger()
    fireEvent.click(screen.getByRole('button', { name: '직접 설명할게요' }))
    fireEvent.click(screen.getByRole('radio', { name: /용용체/ }))
    fireEvent.click(screen.getByRole('button', { name: /자주 쓰는 상황에서 고르기/ }))

    expect(screen.getByRole('radio', { name: /용용체/ })).toBeChecked()
    expect(screen.getByRole('button', { name: '감사·확인' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: '감사·확인' }))

    expect(screen.getByRole('heading', { level: 2, name: '어느 톤으로 보낼까냥?' })).toBeInTheDocument()
    expect(screen.getByText(/교수님·조교님에 맞춰 용용체로 같은 뜻을 세 가지 톤으로 준비했어요/)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: '복사' })).toHaveLength(3)
    expect(screen.queryByText('현재는 AI 연결 전 검증용 예시 후보입니다.')).toBeNull()
  })

  it('상황 카드와 직접 설명은 보이는 필수 legend와 네 말투 옵션을 공유한다', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    chooseProfessorMessenger()

    const speechStyleGroup = screen.getByRole('group', { name: '평소 어떤 말투를 쓰나요? (필수)' })
    expect(speechStyleGroup).toBeInTheDocument()
    expect(speechStyleGroup.querySelectorAll('input[type="radio"]')).toHaveLength(4)
    expect(screen.getByRole('radio', { name: /습니다체.*확인했습니다.*감사합니다/ })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: /요체.*확인했어요.*고마워요/ })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: /이다체.*확인했다.*고맙다/ })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: /용용체.*확인했어용.*고마워용/ })).not.toBeChecked()

    chooseHaeyoSpeechStyle()
    expect(screen.getByRole('radio', { name: /요체/ })).toBeChecked()

    fireEvent.click(screen.getByRole('button', { name: '직접 설명할게요' }))
    expect(screen.getAllByRole('radio')).toHaveLength(4)
    expect(screen.getByRole('radio', { name: /요체/ })).toBeChecked()

    fireEvent.click(screen.getByRole('button', { name: /자주 쓰는 상황에서 고르기/ }))
    expect(
      screen
        .getByRole('group', { name: '평소 어떤 말투를 쓰나요? (필수)' })
        .querySelectorAll('input[type="radio"]'),
    ).toHaveLength(4)
    expect(screen.getByRole('radio', { name: /요체/ })).toBeChecked()
  })

  it.each([
    { relationship: '팀플·조모임', helperName: /팀플냥/, professor: false },
    { relationship: '교수님·조교님', helperName: /교수냥/, professor: true },
    { relationship: '선배·동기', helperName: /선배냥/, professor: false },
    { relationship: '친구·연인', helperName: /연인냥/, professor: false },
  ])('$relationship 관계는 네 가지 개인 말투를 모두 제공한다', ({ helperName, professor }) => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: helperName }))
    if (professor) fireEvent.click(screen.getByRole('radio', { name: /^메신저/ }))

    expect(
      screen
        .getByRole('group', { name: '평소 어떤 말투를 쓰나요? (필수)' })
        .querySelectorAll('input[type="radio"]'),
    ).toHaveLength(4)
    expect(screen.getByRole('radio', { name: /습니다체/ })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /요체/ })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /이다체/ })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /용용체/ })).toBeInTheDocument()
  })

  it('관계를 바꿔도 네 관계 공통 개인 말투 선택을 유지한다', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /연인냥/ }))
    fireEvent.click(screen.getByRole('radio', { name: /용용체/ }))

    fireEvent.click(screen.getByRole('button', { name: /관계 바꾸기/ }))
    chooseProfessorMessenger()

    expect(
      screen
        .getByRole('group', { name: '평소 어떤 말투를 쓰나요? (필수)' })
        .querySelectorAll('input[type="radio"]'),
    ).toHaveLength(4)
    expect(screen.getByRole('radio', { name: /용용체/ })).toBeChecked()
    const storedValue = JSON.parse(window.sessionStorage.getItem('dabnyangi:flow') ?? '{}') as Record<string, unknown>
    expect(storedValue.speechStyleId).toBe('yongyong')
  })

  it('상황 카드에서 고른 개인 말투와 진행 위치를 30분 세션에 복구한다', () => {
    const { unmount } = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /선배냥/ }))
    fireEvent.click(screen.getByRole('radio', { name: /이다체/ }))
    unmount()

    render(<App />)

    expect(screen.getByRole('heading', { level: 2, name: '어떤 상황인지 알려주라냥' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /이다체/ })).toBeChecked()
    expect(screen.getByRole('button', { name: '일정 조율' })).toBeEnabled()
  })

  it('교수·조교 관계에서만 연락 형식을 고르고 선택한 형식의 상황을 보여준다', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /교수냥/ }))

    expect(screen.getByRole('group', { name: '어디로 연락할까요? (필수)' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /^메신저/ })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: /^이메일/ })).not.toBeChecked()
    expect(screen.queryByRole('group', { name: '평소 어떤 말투를 쓰나요? (필수)' })).toBeNull()
    expect(screen.queryByRole('button', { name: '결석·과제 문의' })).toBeNull()

    fireEvent.click(screen.getByRole('radio', { name: /^메신저/ }))
    expect(screen.getByRole('group', { name: '평소 어떤 말투를 쓰나요? (필수)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '결석·과제 문의' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '직접 설명할게요' })).toBeEnabled()

    fireEvent.click(screen.getByRole('radio', { name: /^이메일/ }))
    expect(screen.queryByRole('group', { name: '평소 어떤 말투를 쓰나요? (필수)' })).toBeNull()
    expect(screen.queryByRole('button', { name: '직접 설명할게요' })).toBeNull()
    expect(screen.getByText('이메일은 예의를 위해 습니다체로 작성해요.')).toBeInTheDocument()
    expect(screen.getByLabelText('이메일 상황 빠른 답변').querySelectorAll('button')).toHaveLength(6)
  })

  it.each([
    { relationship: '팀플·조모임', helperName: /팀플냥/ },
    { relationship: '선배·동기', helperName: /선배냥/ },
    { relationship: '친구·연인', helperName: /연인냥/ },
  ])('$relationship 관계는 연락 형식 질문 없이 기존 메신저 흐름을 유지한다', ({ helperName }) => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: helperName }))

    expect(screen.queryByRole('group', { name: '어디로 연락할까요? (필수)' })).toBeNull()
    expect(screen.getByRole('group', { name: '평소 어떤 말투를 쓰나요? (필수)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '직접 설명할게요' })).toBeEnabled()
  })

  it('면담 요청은 공통 다섯 필드와 가능 시간을 채워야 로컬 이메일 결과를 만든다', () => {
    const { container } = render(<App />)
    openProfessorEmailSituation('면담 요청')

    expect(screen.getByRole('heading', { level: 2, name: '이메일에 들어갈 내용을 알려주라냥' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('김민서 교수님 또는 박지훈 조교님')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: '면담 방식 (선택)' })).toHaveValue('')
    expect(screen.getByRole('button', { name: '이메일 3가지 만들기' })).toBeDisabled()
    expect(screen.getByText('받는 분 성함과 호칭을 입력해주세요.')).toHaveAttribute('role', 'status')

    fillCommonEmailDetails('졸업 프로젝트 주제와 진행 방향을 상담받고 싶습니다.')
    expect(screen.getByRole('button', { name: '이메일 3가지 만들기' })).toBeDisabled()
    expect(screen.getByText('가능한 시간대를 입력해주세요.')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('가능한 시간대 2~3개'), {
      target: { value: '화요일 오후 2~4시, 목요일 오전 10~12시' },
    })
    fireEvent.change(screen.getByRole('combobox', { name: '면담 방식 (선택)' }), {
      target: { value: '대면 또는 온라인' },
    })
    expect(screen.getByRole('button', { name: '이메일 3가지 만들기' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: '이메일 3가지 만들기' }))

    expect(screen.getByRole('heading', { level: 2, name: '어떤 이메일로 보낼까냥?' })).toBeInTheDocument()
    expect(container.querySelectorAll('.email-result-card')).toHaveLength(3)
    expect(screen.getAllByRole('button', { name: '제목 복사' })).toHaveLength(3)
    expect(screen.getAllByRole('button', { name: '본문 복사' })).toHaveLength(3)
    expect(screen.getAllByRole('button', { name: '전체 메일 복사' })).toHaveLength(3)
    expect(screen.getByText('정석')).toBeInTheDocument()
    expect(screen.getByText('더 정중하게')).toBeInTheDocument()
    expect(screen.getByText('더 간결하게')).toBeInTheDocument()
    expect(container).toHaveTextContent('김민서 교수님, 안녕하세요.')
    expect(container).toHaveTextContent('면담 방식: 대면 또는 온라인')
    expect(screen.queryByRole('button', { name: '다시 만들기' })).toBeNull()
    expect(screen.queryByText('현재는 AI 연결 전 검증용 예시 후보입니다.')).toBeNull()
  })

  it('면담 외 이메일 상황은 가능 시간과 면담 방식 없이 공통 입력만 받는다', () => {
    render(<App />)
    openProfessorEmailSituation('수업·과제 질문')

    expect(screen.queryByLabelText('가능한 시간대 2~3개')).toBeNull()
    expect(screen.queryByRole('combobox', { name: '면담 방식 (선택)' })).toBeNull()
    fillCommonEmailDetails()
    expect(screen.getByRole('button', { name: '이메일 3가지 만들기' })).toBeEnabled()
  })

  it('이메일 정보와 결과를 30분 세션에서 복구한다', () => {
    const firstRender = render(<App />)
    openProfessorEmailSituation('수업·과제 질문')
    fillCommonEmailDetails()
    firstRender.unmount()

    const secondRender = render(<App />)
    expect(screen.getByRole('heading', { level: 2, name: '이메일에 들어갈 내용을 알려주라냥' })).toBeInTheDocument()
    expect(screen.getByLabelText('받는 분 성함과 호칭')).toHaveValue('김민서 교수님')
    expect(screen.getByLabelText('전달할 구체 내용')).toHaveValue('자료구조 과제 2번의 제출 형식을 확인하고 싶습니다.')
    fireEvent.click(screen.getByRole('button', { name: '이메일 3가지 만들기' }))
    secondRender.unmount()

    render(<App />)
    expect(screen.getByRole('heading', { level: 2, name: '어떤 이메일로 보낼까냥?' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: '전체 메일 복사' })).toHaveLength(3)
  })

  it('저장된 이메일 결과는 현재 입력과 정적 템플릿으로 다시 계산해 복구한다', () => {
    const firstRender = render(<App />)
    openProfessorEmailSituation('수업·과제 질문')
    fillCommonEmailDetails()
    fireEvent.click(screen.getByRole('button', { name: '이메일 3가지 만들기' }))
    firstRender.unmount()

    const storedValue = JSON.parse(window.sessionStorage.getItem('dabnyangi:flow') ?? '{}') as Record<
      string,
      unknown
    >
    window.sessionStorage.setItem(
      'dabnyangi:flow',
      JSON.stringify({
        ...storedValue,
        emailCandidates: [1, 2, 3].map((toneLevel) => ({
          toneLevel,
          toneLabel: `조작된 라벨 ${toneLevel}`,
          subject: `조작된 제목 ${toneLevel}`,
          body: `조작된 본문 ${toneLevel}`,
        })),
      }),
    )

    render(<App />)

    expect(screen.getByRole('heading', { level: 2, name: '어떤 이메일로 보낼까냥?' })).toBeInTheDocument()
    expect(screen.queryByText('조작된 제목 1')).toBeNull()
    expect(screen.getAllByText(/수업·과제 관련 질문드립니다/).length).toBeGreaterThan(0)
  })

  it('연락 형식을 바꿔도 이메일 입력은 유지하고 이메일 결과는 폐기한다', () => {
    render(<App />)
    openProfessorEmailSituation('수업·과제 질문')
    fillCommonEmailDetails()
    fireEvent.click(screen.getByRole('button', { name: '이메일 3가지 만들기' }))
    fireEvent.click(screen.getByRole('button', { name: '이메일 상황 다시 고르기' }))

    fireEvent.click(screen.getByRole('radio', { name: /^메신저/ }))
    const storedAfterSwitch = JSON.parse(window.sessionStorage.getItem('dabnyangi:flow') ?? '{}') as Record<
      string,
      unknown
    >
    expect(storedAfterSwitch.emailCandidates).toEqual([])

    fireEvent.click(screen.getByRole('radio', { name: /^이메일/ }))
    fireEvent.click(screen.getByRole('button', { name: '수업·과제 질문' }))
    expect(screen.getByLabelText('받는 분 성함과 호칭')).toHaveValue('김민서 교수님')
    expect(screen.getByLabelText('전달할 구체 내용')).toHaveValue('자료구조 과제 2번의 제출 형식을 확인하고 싶습니다.')
  })

  it('이메일 결과에서 정보 수정과 상황 복귀는 입력을 유지한다', () => {
    render(<App />)
    openProfessorEmailSituation('수업·과제 질문')
    fillCommonEmailDetails()
    fireEvent.click(screen.getByRole('button', { name: '이메일 3가지 만들기' }))

    fireEvent.click(screen.getByRole('button', { name: '이메일 정보 수정하기' }))
    expect(screen.getByLabelText('학번')).toHaveValue('20261234')
    expect(screen.getByRole('button', { name: '이메일 3가지 만들기' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: /이메일 상황 다시 고르기/ }))

    expect(screen.getByLabelText('이메일 상황 빠른 답변').querySelectorAll('button')).toHaveLength(6)
  })

  it('모드를 바꾸면 이메일 연락 형식과 개인정보 입력을 초기화한다', () => {
    render(<App />)
    openProfessorEmailSituation('수업·과제 질문')
    fillCommonEmailDetails()
    fireEvent.click(screen.getByRole('button', { name: /이메일 상황 다시 고르기/ }))
    fireEvent.click(screen.getByRole('button', { name: /관계 바꾸기/ }))
    fireEvent.click(screen.getByRole('button', { name: /방식 다시 고르기/ }))
    fireEvent.click(screen.getByRole('button', { name: /답장할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /교수냥/ }))

    expect(screen.getByRole('radio', { name: /^메신저/ })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: /^이메일/ })).not.toBeChecked()
    fireEvent.click(screen.getByRole('radio', { name: /^이메일/ }))
    fireEvent.click(screen.getByRole('button', { name: '수업·과제 질문' }))
    expect(screen.getByLabelText('받는 분 성함과 호칭')).toHaveValue('')
    expect(screen.getByLabelText('전달할 구체 내용')).toHaveValue('')
  })

  it('처음으로 돌아가면 이메일 연락 형식·입력·결과를 모두 지운다', () => {
    render(<App />)
    openProfessorEmailSituation('수업·과제 질문')
    fillCommonEmailDetails()
    fireEvent.click(screen.getByRole('button', { name: '이메일 3가지 만들기' }))
    fireEvent.click(screen.getByRole('button', { name: '처음으로 (작성 내용 지우기)' }))

    expect(window.sessionStorage.getItem('dabnyangi:flow')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /교수냥/ }))
    expect(screen.getByRole('radio', { name: /^이메일/ })).not.toBeChecked()
  })

  it('연락 형식이 없는 교수 구세션 결과는 후보를 폐기하고 형식을 다시 묻는다', () => {
    window.sessionStorage.setItem(
      'dabnyangi:flow',
      JSON.stringify({
        step: 'result',
        mode: 'initiate',
        selectedScenarioId: 'professor',
        selectedPurposeId: null,
        speechStyleId: 'haeyo',
        receivedMessage: '',
        situation: '',
        candidates: [
          { toneLevel: 1, toneLabel: '기본', text: '구세션 결과 1' },
          { toneLevel: 2, toneLabel: '더 부드럽게', text: '구세션 결과 2' },
          { toneLevel: 3, toneLabel: '더 분명하게', text: '구세션 결과 3' },
        ],
        source: 'template',
        savedAt: Date.now(),
      }),
    )

    render(<App />)

    expect(screen.getByRole('group', { name: '어디로 연락할까요? (필수)' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /^메신저/ })).not.toBeChecked()
    expect(screen.queryByText('구세션 결과 1')).toBeNull()
  })

  it('다른 관계에 저장된 email 값은 메신저로 정규화한다', () => {
    window.sessionStorage.setItem(
      'dabnyangi:flow',
      JSON.stringify({
        step: 'situation',
        mode: 'initiate',
        selectedScenarioId: 'friend',
        selectedPurposeId: null,
        speechStyleId: 'haeyo',
        contactChannel: 'email',
        receivedMessage: '',
        situation: '',
        candidates: [],
        source: 'template',
        savedAt: Date.now(),
      }),
    )

    render(<App />)

    expect(screen.queryByRole('group', { name: '어디로 연락할까요? (필수)' })).toBeNull()
    expect(screen.getByRole('radio', { name: /요체/ })).toBeChecked()
    expect(screen.getByRole('button', { name: '마음 표현하기' })).toBeEnabled()
  })

  it('이메일 제목·본문·전체 메일을 각각 정확한 형식으로 복사한다', async () => {
    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    const { container } = render(<App />)
    openProfessorEmailSituation('수업·과제 질문')
    fillCommonEmailDetails()
    fireEvent.click(screen.getByRole('button', { name: '이메일 3가지 만들기' }))

    const firstCard = container.querySelector('.email-result-card')
    const resultParts = firstCard?.querySelectorAll('.email-result-section > p')
    const subject = resultParts?.[0]?.textContent ?? ''
    const body = resultParts?.[1]?.textContent ?? ''

    fireEvent.click(screen.getAllByRole('button', { name: '제목 복사' })[0])
    expect(await screen.findByRole('button', { name: '제목 복사됨 ✓' })).toBeInTheDocument()
    expect(writeText).toHaveBeenNthCalledWith(1, subject)

    fireEvent.click(screen.getAllByRole('button', { name: '본문 복사' })[0])
    expect(await screen.findByRole('button', { name: '본문 복사됨 ✓' })).toBeInTheDocument()
    expect(writeText).toHaveBeenNthCalledWith(2, body)

    fireEvent.click(screen.getAllByRole('button', { name: '전체 메일 복사' })[0])
    expect(await screen.findByRole('button', { name: '전체 메일 복사됨 ✓' })).toBeInTheDocument()
    expect(writeText).toHaveBeenNthCalledWith(3, `제목: ${subject}\n\n${body}`)
    expect(screen.getByRole('status')).toHaveTextContent('복사했어요.')
  })

  it('이메일 세 복사 동작은 클립보드를 쓸 수 없으면 해당 텍스트를 선택한다', async () => {
    const { container } = render(<App />)
    openProfessorEmailSituation('수업·과제 질문')
    fillCommonEmailDetails()
    fireEvent.click(screen.getByRole('button', { name: '이메일 3가지 만들기' }))

    const firstCard = container.querySelector('.email-result-card')
    const resultParts = firstCard?.querySelectorAll('.email-result-section > p')
    const subject = resultParts?.[0]?.textContent ?? ''
    const body = resultParts?.[1]?.textContent ?? ''

    fireEvent.click(screen.getAllByRole('button', { name: '제목 복사' })[0])
    expect(await screen.findByRole('button', { name: '제목 텍스트 선택됨' })).toBeInTheDocument()
    expect(window.getSelection()?.toString()).toBe(subject)

    fireEvent.click(screen.getAllByRole('button', { name: '본문 복사' })[0])
    expect(await screen.findByRole('button', { name: '본문 텍스트 선택됨' })).toBeInTheDocument()
    expect(window.getSelection()?.toString()).toBe(body)

    fireEvent.click(screen.getAllByRole('button', { name: '전체 메일 복사' })[0])
    expect(await screen.findByRole('button', { name: '전체 메일 텍스트 선택됨' })).toBeInTheDocument()
    expect(window.getSelection()?.toString()).toBe(`제목: ${subject}\n\n${body}`)
    const visibleAllCopySource = firstCard?.querySelector('.email-copy-source--visible')
    expect(visibleAllCopySource).not.toBeNull()
    expect(visibleAllCopySource).not.toHaveAttribute('aria-hidden')
    expect(visibleAllCopySource).toHaveAttribute('tabindex', '0')
    expect(visibleAllCopySource).toHaveTextContent(`제목: ${subject}`)
    expect(screen.getByRole('status')).toHaveTextContent(
      '펼친 전체 메일을 선택했어요. 길게 눌러 복사해주세요.',
    )
  })

  it('클립보드와 텍스트 선택이 모두 실패하면 이메일 복사 실패를 명시한다', async () => {
    const writeText = vi.fn<(text: string) => Promise<void>>().mockRejectedValue(new Error('denied'))
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    vi.spyOn(document, 'createRange').mockImplementation(() => {
      throw new Error('selection failed')
    })
    render(<App />)
    openProfessorEmailSituation('수업·과제 질문')
    fillCommonEmailDetails()
    fireEvent.click(screen.getByRole('button', { name: '이메일 3가지 만들기' }))

    fireEvent.click(screen.getAllByRole('button', { name: '전체 메일 복사' })[0])

    expect(await screen.findByRole('button', { name: '전체 메일 복사 실패' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('복사하지 못했어요.')
  })

  it('이메일 제목이나 본문의 자리 표시자는 세 복사 동작 뒤에도 빈칸 안내를 유지한다', async () => {
    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    render(<App />)
    openProfessorEmailSituation('수업·과제 질문')
    fillCommonEmailDetails('[수업명] 과제의 제출 형식을 확인하고 싶습니다.')
    fireEvent.change(screen.getByLabelText('학과'), { target: { value: '[학과]' } })
    fireEvent.click(screen.getByRole('button', { name: '이메일 3가지 만들기' }))

    expect(screen.getAllByText('빈칸을 채워주세요')).toHaveLength(3)
    for (const copyName of ['제목 복사', '본문 복사', '전체 메일 복사']) {
      fireEvent.click(screen.getAllByRole('button', { name: copyName })[0])
      expect(await screen.findByText('복사했어요. 보내기 전에 빈칸을 채워 보내주세요.')).toHaveAttribute(
        'role',
        'status',
      )
    }
    expect(writeText).toHaveBeenCalledTimes(3)
  })

  it('세션의 개인 말투 값이 오염되면 나머지 직접 입력을 유지하고 선택만 초기화한다', () => {
    const { unmount } = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /선배냥/ }))
    fireEvent.click(screen.getByRole('button', { name: '직접 설명할게요' }))
    fireEvent.click(screen.getByRole('button', { name: '질문하기' }))
    chooseHaeyoSpeechStyle()
    fireEvent.change(screen.getByLabelText('상황 설명'), {
      target: { value: '동아리 회의 시간을 확인하고 싶어요.' },
    })
    unmount()

    const storedValue = JSON.parse(window.sessionStorage.getItem('dabnyangi:flow') ?? '{}') as Record<string, unknown>
    window.sessionStorage.setItem(
      'dabnyangi:flow',
      JSON.stringify({ ...storedValue, speechStyleId: 'corrupted-style' }),
    )
    render(<App />)

    expect(screen.getByLabelText('상황 설명')).toHaveValue('동아리 회의 시간을 확인하고 싶어요.')
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).not.toBeChecked()
    }
    expect(screen.getByText('평소 쓰는 말투를 골라주세요.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '보낼 말 3가지 만들기' })).toBeDisabled()
  })

  it('말투가 없는 구세션 결과는 출처에 맞는 안전한 선택 화면으로 복구한다', () => {
    const candidates = [
      { toneLevel: 1, toneLabel: '기본', text: '기본 구세션 문장' },
      { toneLevel: 2, toneLabel: '더 부드럽게', text: '부드러운 구세션 문장' },
      { toneLevel: 3, toneLabel: '더 분명하게', text: '분명한 구세션 문장' },
    ]
    const storedResult = {
      step: 'result',
      mode: 'initiate',
      selectedScenarioId: 'professor',
      contactChannel: 'messenger',
      selectedPurposeId: null,
      receivedMessage: '',
      situation: '',
      candidates,
      source: 'template',
      savedAt: Date.now(),
    }
    window.sessionStorage.setItem('dabnyangi:flow', JSON.stringify(storedResult))

    const { unmount } = render(<App />)

    expect(screen.getByRole('heading', { level: 2, name: '어떤 상황인지 알려주라냥' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '감사·확인' })).toBeDisabled()
    expect(screen.queryByText('기본 구세션 문장')).toBeNull()
    unmount()

    window.sessionStorage.setItem(
      'dabnyangi:flow',
      JSON.stringify({
        ...storedResult,
        selectedPurposeId: 'question',
        situation: '구세션에서 질문할 상황',
        source: 'ai',
      }),
    )
    render(<App />)

    expect(screen.getByRole('heading', { level: 2, name: '상황을 조금 더 들려주라냥' })).toBeInTheDocument()
    expect(screen.getByLabelText('상황 설명')).toHaveValue('구세션에서 질문할 상황')
    expect(screen.getByRole('button', { name: '보낼 말 3가지 만들기' })).toBeDisabled()
    expect(screen.queryByText('기본 구세션 문장')).toBeNull()
  })

  it('생성 중에는 입력 영역에 aria-busy와 진행을 가장하지 않는 대기 문구를 보여준다', async () => {
    const { container } = render(<MessageFlow mockGenerationCase="delay" />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /선배냥/ }))
    fireEvent.click(screen.getByRole('button', { name: '직접 설명할게요' }))
    fireEvent.click(screen.getByRole('button', { name: '질문하기' }))
    chooseHaeyoSpeechStyle()
    fireEvent.change(screen.getByLabelText('상황 설명'), {
      target: { value: '동아리 회의 시간을 다시 확인하고 싶어요.' },
    })
    fireEvent.click(screen.getByRole('button', { name: '보낼 말 3가지 만들기' }))

    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
    expect(container.querySelector('.cat-stage')).toHaveAttribute('data-state', 'generating')
    expect(container.querySelector('.cat-stage-fallback')).toHaveAttribute(
      'src',
      '/cats/dabnyangi-thinking.webp',
    )
    expect(await screen.findByText('보낼 말 3가지를 만들고 있어요.')).toBeInTheDocument()
    expect(screen.queryByText('거의 다 됐어요.')).toBeNull()
  })

  it('답장 모드의 빠른 답변 화면은 선택지가 원문을 읽지 않는다고 안내한다', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /답장할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /팀플냥/ }))

    expect(screen.getByText(/아래 빠른 답변은 받은 내용을 읽지 않아요/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /관계 바꾸기/ }))
    fireEvent.click(screen.getByRole('button', { name: /방식 다시 고르기/ }))
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /팀플냥/ }))

    expect(screen.queryByText(/아래 빠른 답변은 받은 내용을 읽지 않아요/)).toBeNull()
  })

  it('사용자가 이 탭에 임시 보관한 작성 내용을 즉시 지울 수 있다', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /선배냥/ }))
    fireEvent.click(screen.getByRole('button', { name: '직접 설명할게요' }))
    fireEvent.click(screen.getByRole('button', { name: '질문하기' }))
    chooseHaeyoSpeechStyle()
    fireEvent.change(screen.getByLabelText('상황 설명'), {
      target: { value: '동아리 회의 시간을 다시 확인하고 싶어요.' },
    })

    fireEvent.click(screen.getByRole('button', { name: '이 탭의 작성 내용 지우기' }))

    expect(screen.getByRole('heading', { level: 2, name: '지금 필요한 건 어떤 말이냥?' })).toBeInTheDocument()
    expect(window.sessionStorage.getItem('dabnyangi:flow')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /선배냥/ }))
    fireEvent.click(screen.getByRole('button', { name: '직접 설명할게요' }))
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).not.toBeChecked()
    }
  })

  it('클립보드를 쓸 수 없으면 후보 텍스트를 선택해 복사를 이어갈 수 있게 한다', async () => {
    const { container } = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    chooseProfessorMessenger()
    chooseHaeyoSpeechStyle()
    fireEvent.click(screen.getByRole('button', { name: '결석·과제 문의' }))
    const expectedText = container.querySelector('.result-card > p')?.textContent ?? ''
    fireEvent.click(screen.getAllByRole('button', { name: '복사' })[0])

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '텍스트 선택됨' })).toBeInTheDocument()
    })
    expect(expectedText).not.toBe('')
    expect(window.getSelection()?.toString()).toContain(expectedText)
  })

  it('복사 성공 시 버튼이 1.5초간 복사됨 ✓로 바뀌고 접근 가능한 상태 안내를 남긴다', async () => {
    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })

    const { container } = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /팀플냥/ }))
    chooseHaeyoSpeechStyle()
    fireEvent.click(screen.getByRole('button', { name: '감사·확인' }))
    const expectedText = container.querySelector('.result-card > p')?.textContent ?? ''
    fireEvent.click(screen.getAllByRole('button', { name: '복사' })[0])

    expect(await screen.findByRole('button', { name: '복사됨 ✓' })).toBeInTheDocument()
    expect(expectedText).not.toBe('')
    expect(writeText).toHaveBeenCalledWith(expectedText)
    expect(screen.getByRole('status')).toHaveTextContent('복사했어요.')

    await waitFor(
      () => expect(screen.queryByRole('button', { name: '복사됨 ✓' })).not.toBeInTheDocument(),
      { timeout: 2500 },
    )
    expect(screen.getAllByRole('button', { name: '복사' })).toHaveLength(3)
  })

  it('자리 표시자가 있는 후보를 복사하면 빈칸 채우기 안내를 지속 노출한다', async () => {
    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /팀플냥/ }))
    chooseHaeyoSpeechStyle()
    fireEvent.click(screen.getByRole('button', { name: '부탁' }))
    fireEvent.click(screen.getAllByRole('button', { name: '복사' })[0])

    const notice = await screen.findByText('복사했어요. 보내기 전에 빈칸을 채워 보내주세요.')
    expect(notice).toHaveAttribute('role', 'status')

    await waitFor(
      () => expect(screen.queryByRole('button', { name: '복사됨 ✓' })).not.toBeInTheDocument(),
      { timeout: 2500 },
    )
    expect(screen.getByText('복사했어요. 보내기 전에 빈칸을 채워 보내주세요.')).toBeInTheDocument()
  })

  it('다시 만들기로 후보가 새로 오면 복사 안내가 사라진다', async () => {
    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /선배냥/ }))
    fireEvent.click(screen.getByRole('button', { name: '직접 설명할게요' }))
    fireEvent.click(screen.getByRole('button', { name: '질문하기' }))
    chooseHaeyoSpeechStyle()
    fireEvent.change(screen.getByLabelText('상황 설명'), {
      target: { value: '동아리 회의 시간을 다시 확인하고 싶어요.' },
    })
    fireEvent.click(screen.getByRole('button', { name: '보낼 말 3가지 만들기' }))
    await waitFor(() => expect(screen.getAllByRole('button', { name: '복사' })).toHaveLength(3))

    fireEvent.click(screen.getAllByRole('button', { name: '복사' })[0])
    expect(await screen.findByRole('button', { name: '복사됨 ✓' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '다시 만들기' }))
    await waitFor(() => expect(screen.getAllByRole('button', { name: '복사' })).toHaveLength(3))

    expect(screen.getByText(/선배·동기에 맞춰 요체로 같은 뜻을 세 가지 톤으로 준비했어요/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '복사됨 ✓' })).not.toBeInTheDocument()
    expect(screen.queryByText('복사했어요.')).not.toBeInTheDocument()
  })
})
