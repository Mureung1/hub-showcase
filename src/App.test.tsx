import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import App from './App'
import ProjectIntro from './ProjectIntro'

afterEach(() => {
  cleanup()
  window.sessionStorage.clear()
  vi.useRealTimers()
  Reflect.deleteProperty(navigator, 'clipboard')
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
    fireEvent.click(screen.getByRole('button', { name: '부탁' }))

    expect(screen.getAllByText('빈칸을 채워주세요')).toHaveLength(3)
    expect(screen.getAllByText('[부탁할 내용]')).toHaveLength(3)
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
      {
        helper: /팀플냥/,
        cards: ['일정 조율', '감사·확인', '부탁', '답장이 늦었을 때 사과', '거절', '몫 확인·재촉'],
        avoidsPeriods: true,
        isProfessor: false,
      },
      {
        helper: /교수냥/,
        cards: ['일정 조율', '감사·확인', '부탁', '답장이 늦었을 때 사과', '거절', '결석·과제 문의'],
        avoidsPeriods: false,
        isProfessor: true,
      },
      {
        helper: /선배냥/,
        cards: ['일정 조율', '감사·확인', '부탁', '답장이 늦었을 때 사과', '거절', '말 편하게 하자고 하기'],
        avoidsPeriods: true,
        isProfessor: false,
      },
      {
        helper: /연인냥/,
        cards: ['일정 조율', '감사·확인', '부탁', '답장이 늦었을 때 사과', '거절', '마음 표현하기'],
        avoidsPeriods: true,
        isProfessor: false,
      },
    ]
    const stiffPhrases = [
      '확인했습니다',
      '감사하겠습니다',
      '여쭙고 싶습니다',
      '연락드립니다',
      '사과드립니다',
      '확인 부탁드립니다',
      '감사드립니다',
      '요청드릴 사항',
    ]
    const inventedDetails = [
      '오늘 안으로',
      '이번 주',
      '다음부터',
      '앞으로는',
      '다음에',
      '바쁜 거',
      '바쁘신',
      '사정이 있어서',
      '부득이한 사정',
    ]
    const hardCodedTitles = ['교수님', '조교님', '선배님']
    const conditionalApologies = ['다면 미안', '다면 죄송', '기다렸으면']
    const cushionExpressions = [
      '편하실 때',
      '덕분에',
      '부담되지 않으시면',
      '죄송하지만',
      '죄송한데',
      '가능하실 때',
      '괜찮으시다면',
      '괜찮으실 때',
      '정말',
      '괜찮으시면',
      '원하시면',
      '괜찮으면',
      '미안한데',
      'ㅎㅎ',
      '기다리게 해서',
      '기다리게 해드려',
      '시간 되실 때',
      '바쁘지 않으시면',
      '편하신 시간',
    ]
    const allTemplateCandidateTexts: string[] = []
    let placeholderCandidateCount = 0
    let casualYongCount = 0
    let laughMarkerCount = 0
    let cryMarkerCount = 0
    let exclamationCount = 0

    for (const route of templateRoutes) {
      for (const card of route.cards) {
        window.sessionStorage.clear()
        const { container, unmount } = render(<App />)
        fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
        fireEvent.click(screen.getByRole('button', { name: route.helper }))
        fireEvent.click(screen.getByRole('button', { name: card }))

        const candidateTexts = Array.from(container.querySelectorAll('.result-card > p'), (element) =>
          element.textContent?.trim() ?? '',
        )
        expect(screen.getAllByRole('button', { name: '복사' })).toHaveLength(3)
        expect(candidateTexts).toHaveLength(3)
        expect(new Set(candidateTexts)).toHaveProperty('size', 3)
        allTemplateCandidateTexts.push(...candidateTexts)

        if (route.avoidsPeriods) {
          for (const candidateText of candidateTexts) {
            expect(candidateText).not.toContain('.')
          }
        }

        const allCandidateText = candidateTexts.join(' ')
        for (const bannedPhrase of [...stiffPhrases, ...inventedDetails, ...hardCodedTitles, ...conditionalApologies]) {
          expect(allCandidateText).not.toContain(bannedPhrase)
        }
        placeholderCandidateCount += candidateTexts.filter((candidateText) => candidateText.includes('[부탁할 내용]')).length
        const cushionCounts = candidateTexts.map(
          (candidateText) => cushionExpressions.filter((expression) => candidateText.includes(expression)).length,
        )
        expect(cushionCounts).toEqual([0, 1, 0])
        expect(candidateTexts[2].length).toBeLessThanOrEqual(candidateTexts[1].length)

        if (card === '답장이 늦었을 때 사과') {
          for (const candidateText of candidateTexts) {
            expect(candidateText).toMatch(/답/)
          }
        } else {
          expect(allCandidateText).not.toMatch(/답장.*늦|답 늦/)
        }

        if (route.isProfessor) {
          for (const candidateText of candidateTexts) {
            expect(candidateText).not.toMatch(/감사해요|죄송해요|어려워요|ㅎㅎ|ㅠ/)
            expect(candidateText).toMatch(/합니다|습니다|드립니다|까요\?/)
          }
        }

        casualYongCount += candidateTexts.reduce(
          (count, candidateText) => count + (candidateText.match(/용(?=[!?]|$)/g)?.length ?? 0),
          0,
        )
        laughMarkerCount += candidateTexts.reduce(
          (count, candidateText) => count + (candidateText.match(/ㅎㅎ/g)?.length ?? 0),
          0,
        )
        cryMarkerCount += candidateTexts.reduce(
          (count, candidateText) => count + (candidateText.match(/ㅠ/g)?.length ?? 0),
          0,
        )
        exclamationCount += candidateTexts.reduce(
          (count, candidateText) => count + (candidateText.match(/!/g)?.length ?? 0),
          0,
        )

        unmount()
      }
    }

    expect(placeholderCandidateCount).toBe(12)
    expect(allTemplateCandidateTexts).toHaveLength(72)
    expect(new Set(allTemplateCandidateTexts)).toHaveProperty('size', 72)
    expect(casualYongCount).toBe(0)
    expect(laughMarkerCount).toBe(1)
    expect(cryMarkerCount).toBe(0)
    expect(exclamationCount).toBe(0)
  })

  it('대표 네 상황은 세 말투와 금지 표현 회귀를 확인한다', () => {
    const representativeRoutes = [
      {
        modes: [/답장할래요/, /먼저 연락할래요/],
        helper: /팀플냥/,
        card: '감사·확인',
        messages: [
          '확인했어요 알려주셔서 고마워요',
          '챙겨주신 덕분에 잘 확인했어요 고마워요',
          '내용 확인했어요 고마워요',
        ],
        forbidden: ['할게', '해줘'],
      },
      {
        modes: [/먼저 연락할래요/, /답장할래요/],
        helper: /교수냥/,
        card: '일정 조율',
        messages: [
          '안녕하세요 면담 가능한 시간을 여쭤봐도 될까요?',
          '안녕하세요 편하신 시간에 맞추겠습니다 면담 가능한 시간을 여쭤봐도 될까요?',
          '안녕하세요 면담 가능한 시간이 언제일까요?',
        ],
        forbidden: ['교수님', '조교님', '요일', '시까지', '감사해요', '죄송해요', '어려워요'],
      },
      {
        modes: [/먼저 연락할래요/, /답장할래요/],
        helper: /선배냥/,
        card: '말 편하게 하자고 하기',
        messages: [
          '저한테는 편하게 말씀하셔도 괜찮아요',
          '원하시면 저한테는 편하게 말씀하셔도 돼요',
          '말 편하게 하셔도 돼요 존댓말도 괜찮아요',
        ],
        forbidden: ['선배님', '놓으세요', '해야'],
      },
      {
        modes: [/답장할래요/, /먼저 연락할래요/],
        helper: /연인냥/,
        card: '거절',
        messages: [
          '이번에는 어려울 것 같아 미안해',
          '미안한데 이번에는 어려울 것 같아',
          '이번에는 어려워',
        ],
        forbidden: ['다음에', '때문에', '약속할게', '미안하지만', '마음 쓰인 부분'],
      },
    ]

    for (const route of representativeRoutes) {
      for (const forbiddenPhrase of route.forbidden) {
        expect(route.messages.join(' ')).not.toContain(forbiddenPhrase)
      }

      for (const mode of route.modes) {
        window.sessionStorage.clear()
        const { unmount } = render(<App />)
        fireEvent.click(screen.getByRole('button', { name: mode }))
        fireEvent.click(screen.getByRole('button', { name: route.helper }))
        fireEvent.click(screen.getByRole('button', { name: route.card }))

        for (const message of route.messages) {
          expect(screen.getByText(message)).toBeInTheDocument()
        }
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

  it('템플릿 결과는 내 상황에 더 맞추기로 표시하고 누르면 다른 상황이냥 입력으로 전환된다', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /교수냥/ }))
    fireEvent.click(screen.getByRole('button', { name: '결석·과제 문의' }))

    expect(screen.queryByRole('button', { name: '다시 만들기' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '내 상황에 더 맞추기' }))

    expect(screen.getByRole('button', { name: '보낼 말 3가지 만들기' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '보낼 말 3가지 만들기' })).toBeDisabled()
  })

  it('템플릿 결과의 상황 수정은 상황 카드 화면으로 돌아간다', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /교수냥/ }))
    fireEvent.click(screen.getByRole('button', { name: '결석·과제 문의' }))
    fireEvent.click(screen.getByRole('button', { name: '상황 수정' }))

    expect(screen.getByRole('button', { name: '결석·과제 문의' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '다른 상황이냥?' })).toBeInTheDocument()
  })

  it('AI 결과의 상황 수정은 목적과 입력이 보존된 다른 상황이냥 입력으로 돌아간다', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /선배냥/ }))
    fireEvent.click(screen.getByRole('button', { name: '다른 상황이냥?' }))
    fireEvent.click(screen.getByRole('button', { name: '질문하기' }))
    fireEvent.change(screen.getByLabelText('상황 설명'), {
      target: { value: '동아리 회의 시간을 다시 확인하고 싶어요.' },
    })
    fireEvent.click(screen.getByRole('button', { name: '보낼 말 3가지 만들기' }))
    await waitFor(() => expect(screen.getAllByRole('button', { name: '복사' })).toHaveLength(3))

    fireEvent.click(screen.getByRole('button', { name: '상황 수정' }))

    expect(screen.getByLabelText('상황 설명')).toHaveValue('동아리 회의 시간을 다시 확인하고 싶어요.')
    expect(screen.getByRole('button', { name: '보낼 말 3가지 만들기' })).toBeEnabled()
  })

  it('리롤이 실패하면 기존 후보 3개를 유지한 채 오류 문구를 보여준다', async () => {
    const { rerender } = render(<ProjectIntro mockGenerationCase="normal" />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /선배냥/ }))
    fireEvent.click(screen.getByRole('button', { name: '다른 상황이냥?' }))
    fireEvent.click(screen.getByRole('button', { name: '질문하기' }))
    fireEvent.change(screen.getByLabelText('상황 설명'), {
      target: { value: '동아리 회의 시간을 다시 확인하고 싶어요.' },
    })
    fireEvent.click(screen.getByRole('button', { name: '보낼 말 3가지 만들기' }))
    await waitFor(() => expect(screen.getAllByRole('button', { name: '복사' })).toHaveLength(3))

    rerender(<ProjectIntro mockGenerationCase="error429" />)
    fireEvent.click(screen.getByRole('button', { name: '다시 만들기' }))

    expect(await screen.findByText('요청이 많아요. 잠시 후 다시 시도해주세요.')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: '복사' })).toHaveLength(3)
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '다시 만들기' })).toBeEnabled()
  })

  it('리롤 중에는 리롤·복사 버튼이 비활성화되고 기존 후보가 유지된다', async () => {
    const { rerender } = render(<ProjectIntro mockGenerationCase="normal" />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /선배냥/ }))
    fireEvent.click(screen.getByRole('button', { name: '다른 상황이냥?' }))
    fireEvent.click(screen.getByRole('button', { name: '질문하기' }))
    fireEvent.change(screen.getByLabelText('상황 설명'), {
      target: { value: '동아리 회의 시간을 다시 확인하고 싶어요.' },
    })
    fireEvent.click(screen.getByRole('button', { name: '보낼 말 3가지 만들기' }))
    await waitFor(() => expect(screen.getAllByRole('button', { name: '복사' })).toHaveLength(3))

    rerender(<ProjectIntro mockGenerationCase="delay" />)
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
    expect(window.getSelection()?.toString()).toContain('결석하게 되어 과제 제출 방법을 여쭤봐도 될까요')
  })

  it('복사 성공 시 버튼이 1.5초간 복사됨 ✓로 바뀌고 접근 가능한 상태 안내를 남긴다', async () => {
    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /팀플냥/ }))
    fireEvent.click(screen.getByRole('button', { name: '감사·확인' }))
    fireEvent.click(screen.getAllByRole('button', { name: '복사' })[0])

    expect(await screen.findByRole('button', { name: '복사됨 ✓' })).toBeInTheDocument()
    expect(writeText).toHaveBeenCalledWith('확인했어요 알려주셔서 고마워요')
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
    fireEvent.click(screen.getByRole('button', { name: '다른 상황이냥?' }))
    fireEvent.click(screen.getByRole('button', { name: '질문하기' }))
    fireEvent.change(screen.getByLabelText('상황 설명'), {
      target: { value: '동아리 회의 시간을 다시 확인하고 싶어요.' },
    })
    fireEvent.click(screen.getByRole('button', { name: '보낼 말 3가지 만들기' }))
    await waitFor(() => expect(screen.getAllByRole('button', { name: '복사' })).toHaveLength(3))

    fireEvent.click(screen.getAllByRole('button', { name: '복사' })[0])
    expect(await screen.findByRole('button', { name: '복사됨 ✓' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '다시 만들기' }))
    await waitFor(() => expect(screen.getAllByRole('button', { name: '복사' })).toHaveLength(3))

    expect(screen.queryByRole('button', { name: '복사됨 ✓' })).not.toBeInTheDocument()
    expect(screen.queryByText('복사했어요.')).not.toBeInTheDocument()
  })
})
