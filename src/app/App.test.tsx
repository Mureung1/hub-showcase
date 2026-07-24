import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import App from './App'
import MessageFlow from '../pages/message-flow'
import { templateCandidatesFor } from '../entities/message/situationTemplates'
import type {
  GenerationExecutor,
  GenerationRequest,
} from '../shared/generation'
import type { InteractionEvent } from '../shared/interaction'

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
  const speechStyle = screen.queryByRole('radio', { name: /요체/ })
  if (speechStyle) fireEvent.click(speechStyle)
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

const openTemplateDraft = (cardName: string) => {
  fireEvent.click(screen.getByRole('button', { name: cardName }))
  fireEvent.click(screen.getByRole('button', { name: '질문 없이 바로 초안 보기' }))
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
    openTemplateDraft('감사·확인')
    expect(container.querySelector('.cat-stage')).toHaveAttribute('data-state', 'result')
  })

  it('상황 카드 뒤 질문 없이 바로 초안을 고르면 입력·API 없이 템플릿 결과가 나온다', () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 204 }))
    render(<MessageFlow interactionReporter={() => undefined} />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    chooseProfessorMessenger()
    chooseHaeyoSpeechStyle()
    openTemplateDraft('부탁')

    expect(screen.getAllByText('빈칸을 채워주세요')).toHaveLength(3)
    expect(screen.getAllByText('[부탁할 내용]')).toHaveLength(3)
    expect(screen.getAllByRole('button', { name: '빈칸 채우기' })).toHaveLength(3)
    expect(screen.getAllByRole('button', { name: '복사' })).toHaveLength(3)
    expect(screen.getByText('필요하면 고쳐서 바로 복사해요')).toBeInTheDocument()
    expect(screen.getByText('기본')).toBeInTheDocument()
    expect(screen.getByText('더 부드럽게')).toBeInTheDocument()
    expect(screen.getByText('더 분명하게')).toBeInTheDocument()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('빈칸 후보는 수정할 부분을 자동 선택하고 채운 문장만 바로 복사한다', async () => {
    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    chooseProfessorMessenger()
    chooseHaeyoSpeechStyle()
    openTemplateDraft('부탁')

    fireEvent.click(screen.getAllByRole('button', { name: '빈칸 채우기' })[0])
    const editor = screen.getByLabelText('기본 초안 직접 수정') as HTMLTextAreaElement
    expect(editor).toHaveFocus()
    expect(editor.value.slice(editor.selectionStart, editor.selectionEnd)).toBe('[부탁할 내용]')

    const completedText = editor.value.replace('[부탁할 내용]', '과제 제출 기한을 하루 연장해 주실 수 있는지 확인')
    fireEvent.change(editor, { target: { value: completedText } })
    fireEvent.click(screen.getAllByRole('button', { name: '복사' })[0])

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(completedText))
    expect(screen.getAllByText('빈칸을 채워주세요')).toHaveLength(2)
  })

  it('상황 카드는 정확히 한 개의 핵심 질문과 세 빠른 답변으로 이어진다', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /팀플냥/ }))
    fireEvent.click(screen.getByRole('button', { name: '일정 조율' }))

    expect(screen.getByRole('heading', { level: 2, name: '어떻게 일정을 맞출까요?' })).toBeInTheDocument()
    expect(document.activeElement).toBe(
      screen.getByRole('heading', { level: 2, name: '어떻게 일정을 맞출까요?' }),
    )
    expect(screen.getByLabelText('상황 핵심 질문 빠른 답변').querySelectorAll('button')).toHaveLength(3)
    expect(screen.getByRole('button', { name: '질문 없이 바로 초안 보기' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '내 상황을 직접 설명하기' })).toBeInTheDocument()
  })

  it('핵심 답변을 고르면 중복 선택을 막고 guided AI 세 톤과 선택 요약을 보여준다', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /선배냥/ }))
    fireEvent.click(screen.getByRole('button', { name: '일정 조율' }))
    fireEvent.click(screen.getByRole('button', { name: '가능한 시간 묻기 선택하고 초안 만들기' }))

    expect(screen.getByRole('status')).toHaveTextContent('고른 내용을 반영해 보낼 말 3가지를 만들고 있어요.')
    for (const option of screen.getByLabelText('상황 핵심 질문 빠른 답변').querySelectorAll('button')) {
      expect(option).toBeDisabled()
    }

    await waitFor(() => expect(screen.getAllByRole('button', { name: '복사' })).toHaveLength(3))
    expect(screen.getByLabelText('선택한 내용')).toHaveTextContent('선배·동기 · 일정 조율 · 가능한 시간 묻기')
    expect(screen.getByText('개발·테스트용 예시 후보입니다.')).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: '말투 바꾸기' })).toBeNull()
  })

  it('guided AI 실패 fallback은 기존 후보를 보존하며 같은 ID로 재시도한다', async () => {
    const view = render(<MessageFlow mockGenerationCase="error500" />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /팀플냥/ }))
    fireEvent.click(screen.getByRole('button', { name: '일정 조율' }))
    fireEvent.click(screen.getByRole('button', { name: '가능한 시간 묻기 선택하고 초안 만들기' }))

    expect(await screen.findByText(/방금 고른 세부 답은 반영되지 않았어요/)).toBeInTheDocument()
    expect(screen.getByLabelText('선택한 내용')).toHaveTextContent('팀플·조모임 · 일정 조율 · 가능한 시간 묻기')
    expect(screen.getAllByRole('button', { name: '복사' })).toHaveLength(3)

    const fallbackTexts = Array.from(view.container.querySelectorAll('.result-card > p'), (item) => item.textContent)
    view.rerender(<MessageFlow mockGenerationCase="normal" />)
    fireEvent.click(screen.getByRole('button', { name: '같은 선택으로 AI 다시 만들기' }))

    expect(screen.getByText('기존 후보를 유지한 채 같은 선택으로 다시 만들고 있어요.')).toHaveAttribute(
      'role',
      'status',
    )
    expect(Array.from(view.container.querySelectorAll('.result-card > p'), (item) => item.textContent)).toEqual(
      fallbackTexts,
    )
    expect(screen.getByRole('button', { name: '다시 만들고 있어요…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '내 상황을 직접 설명하기' })).toBeDisabled()

    await waitFor(() => expect(screen.queryByText(/방금 고른 세부 답은 반영되지 않았어요/)).toBeNull())
    expect(screen.getByLabelText('선택한 내용')).toHaveTextContent('팀플·조모임 · 일정 조율 · 가능한 시간 묻기')
    expect(screen.getByText('개발·테스트용 예시 후보입니다.')).toBeInTheDocument()
  })

  it('guided AI 429도 다른 카드가 아닌 같은 조합의 템플릿으로 fallback한다', async () => {
    render(<MessageFlow interactionReporter={() => undefined} mockGenerationCase="error429" />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /팀플냥/ }))
    fireEvent.click(screen.getByRole('button', { name: '일정 조율' }))
    fireEvent.click(screen.getByRole('button', { name: '가능한 시간 묻기 선택하고 초안 만들기' }))

    expect(await screen.findByText('다음 모임 시간 맞추려고 하는데 언제가 괜찮으세요?')).toBeInTheDocument()
    expect(screen.getByLabelText('선택한 내용')).toHaveTextContent('팀플·조모임 · 일정 조율 · 가능한 시간 묻기')
    expect(screen.getByText(/방금 고른 세부 답은 반영되지 않았어요/)).toBeInTheDocument()
  })

  it('guided AI timeout도 같은 조합의 템플릿으로 fallback한다', async () => {
    vi.useFakeTimers()
    render(<MessageFlow interactionReporter={() => undefined} mockGenerationCase="delay" />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /팀플냥/ }))
    fireEvent.click(screen.getByRole('button', { name: '일정 조율' }))
    fireEvent.click(screen.getByRole('button', { name: '가능한 시간 묻기 선택하고 초안 만들기' }))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000)
    })

    expect(screen.getByText('다음 모임 시간 맞추려고 하는데 언제가 괜찮으세요?')).toBeInTheDocument()
    expect(screen.getByLabelText('선택한 내용')).toHaveTextContent('팀플·조모임 · 일정 조율 · 가능한 시간 묻기')
    expect(screen.getByText(/방금 고른 세부 답은 반영되지 않았어요/)).toBeInTheDocument()
  })

  it('질문 없이 바로 초안은 생성 오류 설정과 무관하게 로컬 템플릿을 즉시 보여준다', () => {
    render(<MessageFlow mockGenerationCase="error500" />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /연인냥/ }))
    openTemplateDraft('거절')

    expect(screen.getByLabelText('고른 상황')).toHaveTextContent('친구·연인 · 거절')
    expect(screen.queryByText(/방금 고른 세부 답은 반영되지 않았어요/)).toBeNull()
    expect(screen.getAllByRole('button', { name: '복사' })).toHaveLength(3)
  })

  it('바로 초안 결과 경로를 세션에서 복구해 같은 카드의 AI 질문으로 전환한다', () => {
    const firstRender = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /연인냥/ }))
    openTemplateDraft('마음 표현하기')
    firstRender.unmount()

    const storedValue = JSON.parse(window.sessionStorage.getItem('dabnyangi:flow') ?? '{}') as Record<
      string,
      unknown
    >
    expect(storedValue.resultRoute).toBe('template_fallback')
    expect(storedValue.fallbackReason).toBeNull()

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'AI로 더 맞추기' }))

    expect(screen.getByRole('heading', { level: 3, name: '어떤 마음을 전할까요?' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '고마운 마음 선택하고 초안 만들기' })).toBeInTheDocument()
  })

  it('바로 초안에서 S3를 벗어나지 않고 같은 카드 질문을 펼치며 기존 후보를 유지한다', async () => {
    const report = vi.fn<(event: InteractionEvent) => void>()
    const { container } = render(<MessageFlow interactionReporter={report} />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /팀플냥/ }))
    openTemplateDraft('일정 조율')

    const originalTexts = Array.from(container.querySelectorAll('.result-card > p'), (element) => element.textContent)
    fireEvent.click(screen.getByRole('button', { name: 'AI로 더 맞추기' }))

    expect(screen.getByRole('list', { name: '말 고르기 4/4단계' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: '어느 톤으로 보낼까냥?' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: '어떻게 일정을 맞출까요?' })).toHaveFocus()
    expect(screen.getAllByText('팀플·조모임 · 일정 조율')).toHaveLength(2)
    expect(screen.getByLabelText('결과에서 답 바꾸기').querySelectorAll('button')).toHaveLength(3)
    expect(Array.from(container.querySelectorAll('.result-card > p'), (element) => element.textContent)).toEqual(
      originalTexts,
    )
    fireEvent.click(screen.getByRole('button', { name: '닫기' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'AI로 더 맞추기' })).toHaveFocus())
  })

  it('guided 결과에서 추가 입력 없는 재생성 행동과 완료 후 다음 행동을 안내한다', async () => {
    render(<MessageFlow interactionReporter={() => undefined} />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /팀플냥/ }))
    fireEvent.click(screen.getByRole('button', { name: '일정 조율' }))
    fireEvent.click(screen.getByRole('button', { name: '가능한 시간 묻기 선택하고 초안 만들기' }))

    const rerollButton = await screen.findByRole('button', { name: '이 선택으로 새 초안 3개 만들기' })
    expect(screen.getByText(/아래 버튼을 누르면 추가 입력 없이 새 초안 3개를 바로 만들어요/)).toBeVisible()
    expect(rerollButton).toHaveAccessibleDescription(
      '지금 고른 답은 그대로 유지돼요. 아래 버튼을 누르면 추가 입력 없이 새 초안 3개를 바로 만들어요.',
    )

    fireEvent.click(rerollButton)
    expect(screen.getByRole('button', { name: '새 초안 3개 만들고 있어요…' })).toBeDisabled()
    await screen.findByRole('button', { name: '이 선택으로 새 초안 3개 만들기' })
    expect(screen.getByText('새 초안 3개가 준비됐어요.').closest('[role="status"]')).toHaveClass(
      'result-update-notice',
    )
    expect(screen.getByText('마음에 드는 문장을 고쳐서 복사하거나 이전 초안과 비교해보세요.')).toBeVisible()

    expect(screen.getByRole('button', { name: '선택한 답 바꾸기' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '선택한 답 바꾸기' }))

    expect(screen.getByRole('heading', { level: 3, name: '어떻게 일정을 맞출까요?' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '가능한 시간 묻기 선택하고 초안 만들기' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('성공한 교체에서만 수정한 직전 초안을 보관하고 복원하면 현재와 이전을 swap한다', async () => {
    const { container } = render(<MessageFlow interactionReporter={() => undefined} />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /팀플냥/ }))
    openTemplateDraft('일정 조율')
    const firstOriginal = container.querySelector('.result-card > p')?.textContent ?? ''

    fireEvent.click(screen.getAllByRole('button', { name: '직접 수정' })[0])
    fireEvent.change(screen.getByLabelText('기본 초안 직접 수정'), {
      target: { value: '내가 다듬어 둔 직전 초안' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'AI로 더 맞추기' }))
    fireEvent.click(screen.getByRole('button', { name: '가능한 시간 묻기 선택하고 초안 만들기' }))

    await screen.findByRole('button', { name: '이전 초안' })
    expect(screen.getByText('새 초안 3개가 준비됐어요.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: '어느 톤으로 보낼까냥?' })).toHaveFocus()
    expect(screen.getByRole('button', { name: '현재 초안' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: '이전 초안' }))
    await waitFor(() => expect(screen.getByRole('region', { name: '이전 초안 후보' })).toHaveFocus())
    expect(screen.getByText('내가 다듬어 둔 직전 초안')).toBeInTheDocument()
    expect(screen.queryByText(firstOriginal)).toBeNull()
    expect(screen.queryAllByRole('button', { name: '직접 수정' })).toHaveLength(0)

    fireEvent.click(screen.getByRole('button', { name: '이전 초안으로 복원' }))
    await waitFor(() => expect(screen.getByRole('region', { name: '현재 초안 후보' })).toHaveFocus())
    expect(screen.getByText('내가 다듬어 둔 직전 초안')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: '직접 수정' })).toHaveLength(3)
    fireEvent.click(screen.getByRole('button', { name: '이전 초안' }))
    expect(screen.getByText('팀 진행 상황을 확인하고 필요한 내용을 같이 조율하고 싶어요')).toBeInTheDocument()
  })

  it('후보 직접 수정은 600자와 빈 문장을 방어하고 수정문만 복사한 뒤 원문으로 되돌린다', async () => {
    const report = vi.fn<(event: InteractionEvent) => void>()
    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    render(<MessageFlow interactionReporter={report} />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /연인냥/ }))
    openTemplateDraft('거절')

    fireEvent.click(screen.getAllByRole('button', { name: '직접 수정' })[0])
    const editor = screen.getByLabelText('기본 초안 직접 수정')
    expect(editor).toHaveFocus()
    const originalText = (editor as HTMLTextAreaElement).value
    expect(editor).toHaveAttribute('maxlength', '600')
    expect(editor).toHaveAttribute('aria-describedby', 'result-tone-1 result-edit-count-1')
    expect(screen.getByText(`${originalText.length} / 600자`)).toBeInTheDocument()

    fireEvent.change(editor, { target: { value: '' } })
    expect(screen.getAllByRole('button', { name: '복사' })[0]).toBeDisabled()
    expect(screen.getByRole('alert')).toHaveTextContent('보낼 말을 입력해야 복사할 수 있어요.')

    fireEvent.change(editor, { target: { value: '내가 직접 다듬은 문장' } })
    expect(screen.getByText('12 / 600자')).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: '복사' })[0])
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('내가 직접 다듬은 문장'))
    expect(JSON.stringify(report.mock.calls)).not.toContain('내가 직접 다듬은 문장')

    fireEvent.change(editor, { target: { value: '[시간]에 가능해요' } })
    fireEvent.click(screen.getAllByRole('button', { name: '복사' })[0])
    expect(await screen.findByText('복사했어요. 보내기 전에 빈칸을 채워 보내주세요.')).toBeInTheDocument()

    fireEvent.change(editor, { target: { value: '빈칸을 모두 채운 문장' } })
    expect(screen.queryByText('복사했어요. 보내기 전에 빈칸을 채워 보내주세요.')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '원래 문장으로' }))
    expect(screen.getByLabelText('기본 초안 직접 수정')).toHaveValue(originalText)
  })

  it('manual 생성 중 목적이나 입력이 바뀌면 오래된 요청 결과를 폐기한다', async () => {
    vi.useFakeTimers()
    render(<MessageFlow interactionReporter={() => undefined} mockGenerationCase="delay" />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /선배냥/ }))
    fireEvent.click(screen.getByRole('button', { name: '내 상황을 직접 설명하기' }))
    fireEvent.click(screen.getByRole('button', { name: '질문하기' }))
    fireEvent.change(screen.getByLabelText('상황 설명'), { target: { value: '처음 입력' } })
    fireEvent.click(screen.getByRole('button', { name: '보낼 말 3가지 만들기' }))

    fireEvent.change(screen.getByLabelText('상황 설명'), { target: { value: '바꾼 최신 입력' } })
    fireEvent.click(screen.getByRole('button', { name: '부탁하기' }))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(25_000)
    })

    expect(screen.getByLabelText('상황 설명')).toHaveValue('바꾼 최신 입력')
    expect(screen.getByRole('button', { name: '부탁하기' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('heading', { level: 2, name: '어느 톤으로 보낼까냥?' })).toBeNull()
    expect(screen.queryByText(/방금 고른 세부 답은 반영되지 않았어요/)).toBeNull()
    expect(screen.queryByRole('button', { name: '복사' })).toBeNull()
  })

  it('수정 textarea에서 복사 API를 쓸 수 없으면 수정문 자체를 선택한다', async () => {
    render(<MessageFlow interactionReporter={() => undefined} />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /연인냥/ }))
    openTemplateDraft('거절')
    fireEvent.click(screen.getAllByRole('button', { name: '직접 수정' })[0])
    const editor = screen.getByLabelText('기본 초안 직접 수정') as HTMLTextAreaElement
    fireEvent.change(editor, { target: { value: '선택할 수정문' } })

    fireEvent.click(screen.getAllByRole('button', { name: '복사' })[0])

    expect(await screen.findByRole('button', { name: '텍스트 선택됨' })).toBeInTheDocument()
    expect(editor).toHaveFocus()
    expect(editor.selectionStart).toBe(0)
    expect(editor.selectionEnd).toBe('선택할 수정문'.length)
  })

  it('교수 관계는 답장과 먼저 연락의 연락 형식 안내를 구분하고 직접 설명 경로를 병렬로 설명한다', () => {
    const first = render(<MessageFlow interactionReporter={() => undefined} />)
    fireEvent.click(screen.getByRole('button', { name: /답장할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /교수냥/ }))
    expect(screen.getByText('답장할 연락 형식을 고르면 필요한 상황을 이어서 물어볼게요.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: /^메신저/ }))
    expect(screen.getByText('받은 내용이나 세부 상황을 반영해요')).toBeInTheDocument()
    first.unmount()
    window.sessionStorage.clear()

    render(<MessageFlow interactionReporter={() => undefined} />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /교수냥/ }))
    expect(screen.getByText('먼저 연락할 형식을 고르면 필요한 상황을 이어서 물어볼게요.')).toBeInTheDocument()
  })

  it('상호작용 event는 결과 교체 시점과 표시 중 snapshot route만 보고하고 문구를 포함하지 않는다', async () => {
    const report = vi.fn<(event: InteractionEvent) => void>()
    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    render(<MessageFlow interactionReporter={report} />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /팀플냥/ }))
    openTemplateDraft('일정 조율')
    await waitFor(() => expect(report).toHaveBeenCalledWith(expect.objectContaining({ eventName: 'result_shown' })))

    fireEvent.click(screen.getAllByRole('button', { name: '직접 수정' })[0])
    fireEvent.change(screen.getByLabelText('기본 초안 직접 수정'), {
      target: { value: '절대 event로 보내면 안 되는 수정문' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'AI로 더 맞추기' }))
    fireEvent.click(screen.getByRole('button', { name: '가능한 시간 묻기 선택하고 초안 만들기' }))
    await screen.findByRole('button', { name: '이전 초안' })
    fireEvent.click(screen.getByRole('button', { name: '이전 초안' }))
    fireEvent.click(screen.getAllByRole('button', { name: '복사' })[0])
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('절대 event로 보내면 안 되는 수정문'))
    fireEvent.click(screen.getByRole('button', { name: '상황 다시 고르기' }))

    expect(report.mock.calls.flatMap(([event]) => event.eventName)).toEqual([
      'result_shown',
      'refinement_opened',
      'regeneration_requested',
      'result_shown',
      'copy_succeeded',
      'situation_change',
    ])
    expect(report).toHaveBeenCalledWith(
      expect.objectContaining({ eventName: 'copy_succeeded', route: 'template_fallback', toneLevel: 1 }),
    )
    expect(JSON.stringify(report.mock.calls)).not.toContain('절대 event로 보내면 안 되는 수정문')
  })

  it('이메일 결과도 성공한 복사와 상황 변경만 email route metadata로 보고한다', async () => {
    const report = vi.fn<(event: InteractionEvent) => void>()
    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    render(<MessageFlow interactionReporter={report} />)
    openProfessorEmailSituation('수업·과제 질문')
    fillCommonEmailDetails()
    fireEvent.click(screen.getByRole('button', { name: '이메일 3가지 만들기' }))
    await waitFor(() => expect(report).toHaveBeenCalledWith(expect.objectContaining({ eventName: 'result_shown' })))

    fireEvent.click(screen.getAllByRole('button', { name: /이메일 제목 복사$/ })[0])
    await screen.findByRole('button', { name: /이메일 제목 복사됨 ✓$/ })
    fireEvent.click(screen.getByRole('button', { name: '이메일 상황 다시 고르기' }))

    expect(report.mock.calls.flatMap(([event]) => event.eventName)).toEqual([
      'result_shown',
      'copy_succeeded',
      'situation_change',
    ])
    for (const [event] of report.mock.calls) {
      expect(event).toMatchObject({ mode: 'initiate', route: 'email_template', scenarioId: 'professor' })
      expect(JSON.stringify(event)).not.toContain('자료구조')
    }
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
    expect(screen.getAllByText(/에게 이어 말하기/)).toHaveLength(4)
    expect(container.querySelectorAll('.scenario-card-paw')).toHaveLength(4)
    expect(Array.from(container.querySelectorAll('.scenario-card-paw')).every((paw) => paw.tagName === 'SPAN')).toBe(
      true,
    )
  })

  it('빈 입력창 대신 냥이 질문과 빠른 답변으로 대화를 시작한다', () => {
    const { container } = render(<App />)

    expect(screen.getByRole('region', { name: '답냥이 가이드 대화' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: '지금 필요한 건 어떤 말이냥?' })).toBeInTheDocument()
    expect(screen.getByLabelText('빠른 답변')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: '답냥이 특징' })).not.toBeInTheDocument()
    expect(container.querySelectorAll('.mode-card-paw')).toHaveLength(2)
    expect(Array.from(container.querySelectorAll('.mode-card-paw')).every((paw) => paw.tagName === 'SPAN')).toBe(true)
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

  it('바로 초안 결과 세 개를 관계별 냥이의 한 말 꾸러미로 동시에 보여준다', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /팀플냥/ }))
    chooseHaeyoSpeechStyle()
    openTemplateDraft('감사·확인')

    expect(screen.getByRole('heading', { level: 2, name: '어느 톤으로 보낼까냥?' })).toBeInTheDocument()
    expect(screen.getByText(/팀플·조모임에 맞춰 요체로 같은 뜻을 세 가지 톤으로 준비했어요/)).toBeInTheDocument()
    expect(screen.getByText('기본 · 더 부드럽게 · 더 분명하게')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: '복사' })).toHaveLength(3)
    expect(screen.getByRole('list', { name: '말 고르기 4/4단계' })).toBeInTheDocument()
  })

  it('바로 초안 결과의 말투를 API 없이 같은 상황의 검수 후보로 즉시 바꾼다', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }))
    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    const { container } = render(<MessageFlow interactionReporter={() => undefined} />)

    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    chooseProfessorMessenger()
    openTemplateDraft('감사·확인')

    const defaultCandidates = templateCandidatesFor('professor', 'thanks_check', 'seumnida')
    const changedCandidates = templateCandidatesFor('professor', 'thanks_check', 'yongyong')
    expect(defaultCandidates).not.toBeNull()
    expect(changedCandidates).not.toBeNull()
    expect(screen.getByRole('group', { name: '말투 바꾸기' }).querySelectorAll('input[type="radio"]')).toHaveLength(
      4,
    )
    expect(screen.getByRole('radio', { name: /습니다체/ })).toBeChecked()
    expect(Array.from(container.querySelectorAll('.result-card > p'), (element) => element.textContent)).toEqual(
      defaultCandidates?.map((candidate) => candidate.text),
    )

    fireEvent.click(screen.getAllByRole('button', { name: '복사' })[0])
    await waitFor(() => expect(screen.getByRole('button', { name: '복사됨 ✓' })).toBeInTheDocument())
    fireEvent.click(screen.getAllByRole('button', { name: '직접 수정' })[1])
    expect(screen.getByLabelText('더 부드럽게 초안 직접 수정')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('radio', { name: /용용체/ }))

    expect(screen.getByRole('radio', { name: /용용체/ })).toBeChecked()
    expect(screen.getByText('현재 용용체 세 문장이에요. 다른 말투를 고르면 바로 바뀌어요.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '복사됨 ✓' })).toBeNull()
    expect(screen.queryByLabelText('더 부드럽게 초안 직접 수정')).toBeNull()
    expect(Array.from(container.querySelectorAll('.result-card > p'), (element) => element.textContent)).toEqual(
      changedCandidates?.map((candidate) => candidate.text),
    )
    expect(screen.getByText(/교수님·조교님에 맞춰 용용체로/)).toBeInTheDocument()
    expect(container.querySelector('[aria-busy="true"]')).toBeNull()
    expect(fetchSpy).not.toHaveBeenCalled()

    const storedValue = JSON.parse(window.sessionStorage.getItem('dabnyangi:flow') ?? '{}') as Record<string, unknown>
    expect(storedValue.speechStyleId).toBe('yongyong')
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
      window.sessionStorage.clear()
      const { container, unmount } = render(<App />)
      fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
      fireEvent.click(screen.getByRole('button', { name: route.helper }))
      if (route.professor) fireEvent.click(screen.getByRole('radio', { name: /^메신저/ }))
      chooseHaeyoSpeechStyle()

      route.cards.forEach((card, cardIndex) => {
        openTemplateDraft(card)

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

        if (cardIndex < route.cards.length - 1) {
          fireEvent.click(screen.getByRole('button', { name: '상황 다시 고르기' }))
        }
      })

      unmount()
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
        openTemplateDraft(route.card)

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
    fireEvent.click(screen.getByRole('button', { name: '내 상황을 직접 설명하기' }))

    expect(screen.getByRole('button', { name: '보낼 말 3가지 만들기' })).toBeDisabled()
    expect(screen.getByText('메시지 목적을 골라주세요.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '질문하기' }))
    chooseHaeyoSpeechStyle()

    fireEvent.change(screen.getByLabelText('받은 메시지 붙여넣기'), {
      target: { value: '과제 기한 연장 문의 주셔서 확인했습니다.' },
    })

    expect(screen.getByRole('button', { name: '보낼 말 3가지 만들기' })).toBeEnabled()
    expect(screen.getByText('23/500자')).toBeInTheDocument()
  })

  it('직접 설명 자연어를 별도 형식 요구 없이 생성 executor에 그대로 전달한다', async () => {
    let capturedRequest: GenerationRequest | undefined
    const generationExecutor: GenerationExecutor = async (request) => {
      capturedRequest = request
      return {
        ok: true,
        response: {
          candidates: [
            { text: '약속을 미뤄야 할 것 같아 미안해요.', toneLabel: '기본', toneLevel: 1 },
            {
              text: '정말 미안하지만 약속을 조금 미뤄도 괜찮을까요?',
              toneLabel: '더 부드럽게',
              toneLevel: 2,
            },
            { text: '미안해요. 이번 약속은 미뤄야 할 것 같아요.', toneLabel: '더 분명하게', toneLevel: 3 },
          ],
          source: 'ai',
        },
      }
    }
    render(
      <MessageFlow
        generationExecutor={generationExecutor}
        interactionReporter={() => undefined}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /연인냥/ }))
    fireEvent.click(screen.getByRole('button', { name: '내 상황을 직접 설명하기' }))

    expect(
      screen.getByText(/평소 말하듯 적어주세요. 예: 약속을 미뤄야 해서 정중하게 사과하고 싶어요/),
    ).toBeInTheDocument()
    expect(screen.getByText(/입력 내용은 Google Gemini API로 전송돼요/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '사과하기' }))
    chooseHaeyoSpeechStyle()
    fireEvent.change(screen.getByLabelText('상황 설명'), {
      target: { value: '약속을 미뤄야겠다 그리고 정중하게 사과하고싶다' },
    })
    fireEvent.click(screen.getByRole('button', { name: '보낼 말 3가지 만들기' }))

    await waitFor(() => expect(screen.getAllByRole('button', { name: '복사' })).toHaveLength(3))
    expect(capturedRequest).toEqual({
      mode: 'initiate',
      purpose: 'apologize',
      route: 'manual_ai',
      scenarioId: 'friend',
      speechStyleId: 'haeyo',
      situation: '약속을 미뤄야겠다 그리고 정중하게 사과하고싶다',
    })
    expect(screen.getByText('약속을 미뤄야 할 것 같아 미안해요.')).toBeInTheDocument()
  })

  it('바로 초안 결과는 같은 관계·카드로 AI 핵심 질문에 이어진다', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    chooseProfessorMessenger()
    chooseHaeyoSpeechStyle()
    openTemplateDraft('결석·과제 문의')

    expect(screen.getByRole('button', { name: 'AI로 더 맞추기' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '내 상황을 직접 설명하기' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'AI로 더 맞추기' }))

    expect(screen.getByRole('heading', { level: 3, name: '무엇을 여쭤볼까요?' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '결석 처리 기준 선택하고 초안 만들기' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '일정 조율' })).toBeNull()
  })

  it('기본 말투로 본 바로 초안에서 직접 설명으로 가면 말투를 명시적으로 고르게 한다', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    chooseProfessorMessenger()
    openTemplateDraft('결석·과제 문의')
    fireEvent.click(screen.getByRole('button', { name: '내 상황을 직접 설명하기' }))

    expect(screen.getByRole('button', { name: '보낼 말 3가지 만들기' })).toBeInTheDocument()
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).not.toBeChecked()
    }
    fireEvent.click(screen.getByRole('button', { name: '질문하기' }))
    expect(screen.getByText('평소 쓰는 말투를 골라주세요.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '보낼 말 3가지 만들기' })).toBeDisabled()
  })

  it('AI 결과의 입력 내용 수정하기는 목적과 입력이 보존된 직접 설명 화면으로 돌아간다', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /선배냥/ }))
    fireEvent.click(screen.getByRole('button', { name: '내 상황을 직접 설명하기' }))
    fireEvent.click(screen.getByRole('button', { name: '질문하기' }))
    chooseHaeyoSpeechStyle()
    fireEvent.change(screen.getByLabelText('상황 설명'), {
      target: { value: '동아리 회의 시간을 다시 확인하고 싶어요.' },
    })
    fireEvent.click(screen.getByRole('button', { name: '보낼 말 3가지 만들기' }))
    await waitFor(() => expect(screen.getAllByRole('button', { name: '복사' })).toHaveLength(3))

    fireEvent.click(screen.getByRole('button', { name: '입력 고쳐 다시 쓰기' }))

    expect(screen.getByLabelText('상황 설명')).toHaveValue('동아리 회의 시간을 다시 확인하고 싶어요.')
    expect(screen.getByRole('radio', { name: /요체/ })).toBeChecked()
    expect(screen.getByRole('button', { name: '보낼 말 3가지 만들기' })).toBeEnabled()
  })

  it('리롤이 실패하면 기존 후보 3개를 유지한 채 오류 문구를 보여준다', async () => {
    const { rerender } = render(<MessageFlow mockGenerationCase="normal" />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /선배냥/ }))
    fireEvent.click(screen.getByRole('button', { name: '내 상황을 직접 설명하기' }))
    fireEvent.click(screen.getByRole('button', { name: '질문하기' }))
    chooseHaeyoSpeechStyle()
    fireEvent.change(screen.getByLabelText('상황 설명'), {
      target: { value: '동아리 회의 시간을 다시 확인하고 싶어요.' },
    })
    fireEvent.click(screen.getByRole('button', { name: '보낼 말 3가지 만들기' }))
    await waitFor(() => expect(screen.getAllByRole('button', { name: '복사' })).toHaveLength(3))

    rerender(<MessageFlow mockGenerationCase="error429" />)
    fireEvent.click(screen.getByRole('button', { name: '같은 입력으로 다른 표현 만들기' }))

    expect(await screen.findByText('요청이 많아요. 잠시 후 다시 시도해주세요.')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: '복사' })).toHaveLength(3)
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '같은 입력으로 다른 표현 만들기' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: '이전 초안' })).toBeNull()
  })

  it('리롤 timeout에서도 현재 후보를 유지하고 직전 snapshot을 만들지 않는다', async () => {
    const view = render(<MessageFlow interactionReporter={() => undefined} mockGenerationCase="normal" />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /선배냥/ }))
    fireEvent.click(screen.getByRole('button', { name: '내 상황을 직접 설명하기' }))
    fireEvent.click(screen.getByRole('button', { name: '질문하기' }))
    chooseHaeyoSpeechStyle()
    fireEvent.change(screen.getByLabelText('상황 설명'), {
      target: { value: '동아리 회의 시간을 확인하고 싶어요.' },
    })
    fireEvent.click(screen.getByRole('button', { name: '보낼 말 3가지 만들기' }))
    await screen.findByRole('button', { name: '같은 입력으로 다른 표현 만들기' })
    const originalTexts = Array.from(view.container.querySelectorAll('.result-card > p'), (element) => element.textContent)

    view.rerender(<MessageFlow interactionReporter={() => undefined} mockGenerationCase="delay" />)
    vi.useFakeTimers()
    fireEvent.click(screen.getByRole('button', { name: '같은 입력으로 다른 표현 만들기' }))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000)
    })

    expect(screen.getByRole('alert')).toHaveTextContent('응답이 오래 걸리고 있어요. 잠시 후 다시 시도해주세요.')
    expect(Array.from(view.container.querySelectorAll('.result-card > p'), (element) => element.textContent)).toEqual(
      originalTexts,
    )
    expect(screen.queryByRole('button', { name: '이전 초안' })).toBeNull()
  })

  it('리롤 중에는 리롤·복사 버튼이 비활성화되고 기존 후보가 유지된다', async () => {
    const { rerender } = render(<MessageFlow mockGenerationCase="normal" />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /선배냥/ }))
    fireEvent.click(screen.getByRole('button', { name: '내 상황을 직접 설명하기' }))
    fireEvent.click(screen.getByRole('button', { name: '질문하기' }))
    chooseHaeyoSpeechStyle()
    fireEvent.change(screen.getByLabelText('상황 설명'), {
      target: { value: '동아리 회의 시간을 다시 확인하고 싶어요.' },
    })
    fireEvent.click(screen.getByRole('button', { name: '보낼 말 3가지 만들기' }))
    await waitFor(() => expect(screen.getAllByRole('button', { name: '복사' })).toHaveLength(3))

    rerender(<MessageFlow mockGenerationCase="delay" />)
    fireEvent.click(screen.getByRole('button', { name: '같은 입력으로 다른 표현 만들기' }))

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
    fireEvent.click(screen.getByRole('button', { name: '내 상황을 직접 설명하기' }))
    fireEvent.click(screen.getByRole('button', { name: '질문하기' }))
    chooseHaeyoSpeechStyle()
    fireEvent.change(screen.getByLabelText('상황 설명'), {
      target: { value: '동아리 회의 시간을 다시 확인하고 싶어요.' },
    })
    fireEvent.click(screen.getByRole('button', { name: '보낼 말 3가지 만들기' }))

    expect(screen.getByRole('button', { name: '보낼 말을 만들고 있어요…' })).toBeDisabled()
    expect(screen.getByLabelText('보낼 말 후보를 준비하고 있어요')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('개발·테스트용 예시 후보입니다.')).toBeInTheDocument()
    })
    expect(screen.getByRole('heading', { level: 2, name: '어느 톤으로 보낼까냥?' })).toBeInTheDocument()
    expect(screen.getByText(/선배·동기에 맞춰 요체로 같은 뜻을 세 가지 톤으로 준비했어요/)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: '복사' })).toHaveLength(3)
    expect(screen.queryByRole('group', { name: '말투 바꾸기' })).toBeNull()
  })

  it('생성 실패 시 입력을 유지하고 다시 시도 동선을 보여준다', async () => {
    render(<MessageFlow mockGenerationCase="error429" />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /선배냥/ }))
    fireEvent.click(screen.getByRole('button', { name: '내 상황을 직접 설명하기' }))
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
    expect(screen.queryByText(/방금 고른 세부 답은 반영되지 않았어요/)).toBeNull()
    expect(screen.queryByRole('button', { name: '복사' })).toBeNull()
  })

  it('20초 안에 응답이 없으면 타임아웃 안내와 입력을 유지한다', async () => {
    vi.useFakeTimers()
    render(<MessageFlow mockGenerationCase="delay" />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /선배냥/ }))
    fireEvent.click(screen.getByRole('button', { name: '내 상황을 직접 설명하기' }))
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
    fireEvent.click(screen.getByRole('button', { name: '내 상황을 직접 설명하기' }))
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
    fireEvent.click(screen.getByRole('button', { name: '내 상황을 직접 설명하기' }))
    fireEvent.click(screen.getByRole('button', { name: '질문하기' }))
    chooseHaeyoSpeechStyle()
    fireEvent.change(screen.getByLabelText('상황 설명'), {
      target: { value: '다음 모임 시간을 다시 확인하고 싶어요.' },
    })

    fireEvent.click(screen.getByRole('button', { name: /자주 쓰는 상황에서 고르기/ }))
    fireEvent.click(screen.getByRole('button', { name: /관계 바꾸기/ }))
    fireEvent.click(screen.getByRole('button', { name: /선배냥/ }))
    fireEvent.click(screen.getByRole('button', { name: '내 상황을 직접 설명하기' }))

    expect(screen.getByLabelText('상황 설명')).toHaveValue('다음 모임 시간을 다시 확인하고 싶어요.')
  })

  it('S0로 돌아가 같은 방식을 다시 고르면 입력과 목적이 유지된다', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /선배냥/ }))
    fireEvent.click(screen.getByRole('button', { name: '내 상황을 직접 설명하기' }))
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
    fireEvent.click(screen.getByRole('button', { name: '내 상황을 직접 설명하기' }))

    expect(screen.getByLabelText('상황 설명')).toHaveValue('동아리 회의 시간을 다시 확인하고 싶어요.')
    expect(screen.getByRole('radio', { name: /요체/ })).toBeChecked()
    expect(screen.getByRole('button', { name: '보낼 말 3가지 만들기' })).toBeEnabled()
  })

  it('방식을 바꾸면 입력을 초기화하고 고른 관계는 유지한다', () => {
    const { container } = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /선배냥/ }))
    fireEvent.click(screen.getByRole('button', { name: '내 상황을 직접 설명하기' }))
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
    fireEvent.click(screen.getByRole('button', { name: '내 상황을 직접 설명하기' }))

    expect(screen.getByLabelText('상황 설명 (선택)')).toHaveValue('')
    expect(screen.getByLabelText('받은 메시지 붙여넣기')).toHaveValue('')
    expect(screen.getByRole('button', { name: '보낼 말 3가지 만들기' })).toBeDisabled()
  })

  it('관계를 바꾸면 이전 결과를 폐기한다', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /팀플냥/ }))
    chooseHaeyoSpeechStyle()
    openTemplateDraft('감사·확인')

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
    fireEvent.click(screen.getByRole('button', { name: '내 상황을 직접 설명하기' }))

    expect(screen.getByText('메시지 목적')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '질문하기' })).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(screen.getByRole('button', { name: '질문하기' }))

    expect(screen.getByRole('button', { name: '질문하기' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '부탁하기' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('상황 카드 앞에서는 필수 말투 선택 없이 관계 안전 기본값을 사용한다', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    chooseProfessorMessenger()

    const situationCards = ['일정 조율', '감사·확인', '부탁', '답장이 늦었을 때 사과', '거절', '결석·과제 문의']
    for (const card of situationCards) {
      expect(screen.getByRole('button', { name: card })).toBeEnabled()
    }
    expect(screen.queryByRole('group', { name: '평소 어떤 말투를 쓰나요? (필수)' })).toBeNull()
    expect(screen.getByRole('button', { name: '내 상황을 직접 설명하기' })).toBeEnabled()

    openTemplateDraft('결석·과제 문의')
    expect(screen.getByText(/교수님·조교님에 맞춰 습니다체로/)).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /습니다체/ })).toBeChecked()
    const storedValue = JSON.parse(window.sessionStorage.getItem('dabnyangi:flow') ?? '{}') as Record<string, unknown>
    expect(storedValue.speechStyleId).toBeNull()
  })

  it('새 탭의 직접 설명에서는 기본 선택 없이 사용자가 말투를 명시적으로 고른다', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    chooseProfessorMessenger()
    fireEvent.click(screen.getByRole('button', { name: '내 상황을 직접 설명하기' }))
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).not.toBeChecked()
    }
    expect(screen.getByRole('button', { name: '보낼 말 3가지 만들기' })).toBeDisabled()
    fireEvent.click(screen.getByRole('radio', { name: /용용체/ }))
    expect(screen.getByRole('radio', { name: /용용체/ })).toBeChecked()
  })

  it.each([
    { relationship: '팀플·조모임', helperName: /팀플냥/, professor: false },
    { relationship: '교수님·조교님', helperName: /교수냥/, professor: true },
    { relationship: '선배·동기', helperName: /선배냥/, professor: false },
    { relationship: '친구·연인', helperName: /연인냥/, professor: false },
  ])('$relationship 관계의 직접 설명은 네 가지 개인 말투를 제공한다', ({ helperName, professor }) => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: helperName }))
    if (professor) fireEvent.click(screen.getByRole('radio', { name: /^메신저/ }))
    fireEvent.click(screen.getByRole('button', { name: '내 상황을 직접 설명하기' }))

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

  it('사용자가 고른 말투는 관계를 바꾸고 카드 경로로 이동해도 유지한다', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /연인냥/ }))
    fireEvent.click(screen.getByRole('button', { name: '내 상황을 직접 설명하기' }))
    fireEvent.click(screen.getByRole('radio', { name: /용용체/ }))

    fireEvent.click(screen.getByRole('button', { name: /자주 쓰는 상황에서 고르기/ }))
    fireEvent.click(screen.getByRole('button', { name: /관계 바꾸기/ }))
    chooseProfessorMessenger()

    const storedValue = JSON.parse(window.sessionStorage.getItem('dabnyangi:flow') ?? '{}') as Record<string, unknown>
    expect(storedValue.speechStyleId).toBe('yongyong')

    openTemplateDraft('감사·확인')
    expect(screen.getByRole('radio', { name: /용용체/ })).toBeChecked()
    expect(screen.getByText(/교수님·조교님에 맞춰 용용체로/)).toBeInTheDocument()
  })

  it('선택한 상황 질문과 진행 위치를 30분 세션에 복구한다', () => {
    const { unmount } = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /선배냥/ }))
    fireEvent.click(screen.getByRole('button', { name: '일정 조율' }))
    unmount()

    render(<App />)

    expect(screen.getByRole('heading', { level: 2, name: '어떻게 일정을 확인할까요?' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '질문 없이 바로 초안 보기' })).toBeEnabled()
  })

  it('guided fallback 세션의 오염된 답 ID와 후보는 결과로 복구하지 않는다', async () => {
    const firstRender = render(<MessageFlow mockGenerationCase="error500" />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /팀플냥/ }))
    fireEvent.click(screen.getByRole('button', { name: '거절' }))
    fireEvent.click(screen.getByRole('button', { name: '이번 부탁 선택하고 초안 만들기' }))
    await screen.findByText(/방금 고른 세부 답은 반영되지 않았어요/)
    firstRender.unmount()

    const storedValue = JSON.parse(window.sessionStorage.getItem('dabnyangi:flow') ?? '{}') as Record<
      string,
      unknown
    >
    expect(storedValue.resultRoute).toBe('guided_ai')
    expect(storedValue.fallbackReason).toBe('guided_generation_failed')

    const restoredFallback = render(<App />)
    expect(screen.getByRole('button', { name: '같은 선택으로 AI 다시 만들기' })).toBeInTheDocument()
    expect(screen.getByLabelText('선택한 내용')).toHaveTextContent('팀플·조모임 · 거절 · 이번 부탁')
    expect(screen.getByText(/방금 고른 세부 답은 반영되지 않았어요/)).toBeInTheDocument()
    restoredFallback.unmount()

    const restoredValue = JSON.parse(window.sessionStorage.getItem('dabnyangi:flow') ?? '{}') as Record<
      string,
      unknown
    >
    window.sessionStorage.setItem(
      'dabnyangi:flow',
      JSON.stringify({
        ...restoredValue,
        selectedContextAnswer: {
          questionId: 'cq.groupwork.decline.focus',
          optionId: 'co.groupwork.decline.not-in-catalog',
        },
        candidates: [
          { toneLevel: 1, toneLabel: '기본', text: '조작 문장 1' },
          { toneLevel: 2, toneLabel: '더 부드럽게', text: '조작 문장 2' },
          { toneLevel: 3, toneLabel: '더 분명하게', text: '조작 문장 3' },
        ],
      }),
    )

    render(<App />)

    expect(screen.getByRole('heading', { level: 2, name: '무엇이 어렵다고 전할까요?' })).toBeInTheDocument()
    expect(screen.queryByText('조작 문장 1')).toBeNull()
    expect(screen.getByRole('button', { name: '이번 부탁 선택하고 초안 만들기' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
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
    expect(screen.queryByRole('group', { name: '평소 어떤 말투를 쓰나요? (필수)' })).toBeNull()
    expect(screen.getByRole('button', { name: '결석·과제 문의' })).toBeEnabled()
    expect(screen.getByRole('button', { name: '내 상황을 직접 설명하기' })).toBeEnabled()

    fireEvent.click(screen.getByRole('radio', { name: /^이메일/ }))
    expect(screen.queryByRole('group', { name: '평소 어떤 말투를 쓰나요? (필수)' })).toBeNull()
    expect(screen.queryByRole('button', { name: '내 상황을 직접 설명하기' })).toBeNull()
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
    expect(screen.queryByRole('group', { name: '평소 어떤 말투를 쓰나요? (필수)' })).toBeNull()
    expect(screen.getByRole('button', { name: '내 상황을 직접 설명하기' })).toBeEnabled()
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
    expect(screen.getAllByRole('button', { name: /이메일 제목 복사$/ })).toHaveLength(3)
    expect(screen.getAllByRole('button', { name: /이메일 본문 복사$/ })).toHaveLength(3)
    expect(screen.getAllByRole('button', { name: /이메일 전체 메일 복사$/ })).toHaveLength(3)
    expect(screen.getByRole('article', { name: '정석 이메일 후보' })).toBeInTheDocument()
    expect(screen.getByRole('article', { name: '더 정중하게 이메일 후보' })).toBeInTheDocument()
    expect(screen.getByRole('article', { name: '더 간결하게 이메일 후보' })).toBeInTheDocument()
    for (const toneLabel of ['정석', '더 정중하게', '더 간결하게']) {
      for (const actionLabel of ['제목 복사', '본문 복사', '전체 메일 복사']) {
        expect(screen.getByRole('button', { name: `${toneLabel} 이메일 ${actionLabel}` })).toBeInTheDocument()
      }
    }
    expect(screen.getByText('정석')).toBeInTheDocument()
    expect(screen.getByText('더 정중하게')).toBeInTheDocument()
    expect(screen.getByText('더 간결하게')).toBeInTheDocument()
    expect(container).toHaveTextContent('김민서 교수님, 안녕하세요.')
    expect(container).toHaveTextContent('면담 방식: 대면 또는 온라인')
    expect(screen.queryByRole('button', { name: '다시 만들기' })).toBeNull()
    expect(screen.queryByText('개발·테스트용 예시 후보입니다.')).toBeNull()
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
    expect(screen.getAllByRole('button', { name: /이메일 전체 메일 복사$/ })).toHaveLength(3)
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
    expect(screen.queryByRole('group', { name: '평소 어떤 말투를 쓰나요? (필수)' })).toBeNull()
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

    fireEvent.click(screen.getAllByRole('button', { name: /이메일 제목 복사$/ })[0])
    expect(await screen.findByRole('button', { name: /이메일 제목 복사됨 ✓$/ })).toBeInTheDocument()
    expect(writeText).toHaveBeenNthCalledWith(1, subject)

    fireEvent.click(screen.getAllByRole('button', { name: /이메일 본문 복사$/ })[0])
    expect(await screen.findByRole('button', { name: /이메일 본문 복사됨 ✓$/ })).toBeInTheDocument()
    expect(writeText).toHaveBeenNthCalledWith(2, body)

    fireEvent.click(screen.getAllByRole('button', { name: /이메일 전체 메일 복사$/ })[0])
    expect(await screen.findByRole('button', { name: /이메일 전체 메일 복사됨 ✓$/ })).toBeInTheDocument()
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

    fireEvent.click(screen.getAllByRole('button', { name: /이메일 제목 복사$/ })[0])
    expect(await screen.findByRole('button', { name: /이메일 제목 텍스트 선택됨$/ })).toBeInTheDocument()
    expect(window.getSelection()?.toString()).toBe(subject)

    fireEvent.click(screen.getAllByRole('button', { name: /이메일 본문 복사$/ })[0])
    expect(await screen.findByRole('button', { name: /이메일 본문 텍스트 선택됨$/ })).toBeInTheDocument()
    expect(window.getSelection()?.toString()).toBe(body)

    fireEvent.click(screen.getAllByRole('button', { name: /이메일 전체 메일 복사$/ })[0])
    expect(await screen.findByRole('button', { name: /이메일 전체 메일 텍스트 선택됨$/ })).toBeInTheDocument()
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

    fireEvent.click(screen.getAllByRole('button', { name: /이메일 전체 메일 복사$/ })[0])

    expect(await screen.findByRole('button', { name: /이메일 전체 메일 복사 실패$/ })).toBeInTheDocument()
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
      fireEvent.click(screen.getAllByRole('button', { name: new RegExp(`이메일 ${copyName}$`) })[0])
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
    fireEvent.click(screen.getByRole('button', { name: '내 상황을 직접 설명하기' }))
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
    expect(screen.getByRole('button', { name: '감사·확인' })).toBeEnabled()
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

  it('명시 말투가 없는 유효한 구세션 카드 결과는 관계 기본 검수 후보로 복구한다', () => {
    const storedCandidates = templateCandidatesFor('professor', 'thanks_check', 'yongyong')
    expect(storedCandidates).not.toBeNull()
    window.sessionStorage.setItem(
      'dabnyangi:flow',
      JSON.stringify({
        step: 'result',
        mode: 'initiate',
        selectedScenarioId: 'professor',
        contactChannel: 'messenger',
        selectedSituationId: 'thanks_check',
        selectedContextAnswer: null,
        selectedPurposeId: null,
        speechStyleId: null,
        receivedMessage: '',
        situation: '',
        candidates: storedCandidates,
        emailCandidates: [],
        source: 'template',
        resultRoute: 'template_fallback',
        fallbackReason: null,
        savedAt: Date.now(),
      }),
    )

    const { container } = render(<App />)
    const expectedCandidates = templateCandidatesFor('professor', 'thanks_check', 'seumnida')

    expect(screen.getByRole('heading', { level: 2, name: '어느 톤으로 보낼까냥?' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /습니다체/ })).toBeChecked()
    expect(Array.from(container.querySelectorAll('.result-card > p'), (element) => element.textContent)).toEqual(
      expectedCandidates?.map((candidate) => candidate.text),
    )
    const restoredValue = JSON.parse(window.sessionStorage.getItem('dabnyangi:flow') ?? '{}') as Record<
      string,
      unknown
    >
    expect(restoredValue.speechStyleId).toBeNull()
  })

  it('생성 중에는 입력 영역에 aria-busy와 진행을 가장하지 않는 대기 문구를 보여준다', async () => {
    const { container } = render(<MessageFlow mockGenerationCase="delay" />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /선배냥/ }))
    fireEvent.click(screen.getByRole('button', { name: '내 상황을 직접 설명하기' }))
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

    expect(screen.getByText(/상황 카드와 빠른 질문은 받은 메시지 원문을 읽지 않아요/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /관계 바꾸기/ }))
    fireEvent.click(screen.getByRole('button', { name: /방식 다시 고르기/ }))
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /팀플냥/ }))

    expect(screen.queryByText(/상황 카드와 빠른 질문은 받은 메시지 원문을 읽지 않아요/)).toBeNull()
  })

  it('사용자가 이 탭에 임시 보관한 작성 내용을 즉시 지울 수 있다', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    fireEvent.click(screen.getByRole('button', { name: /선배냥/ }))
    fireEvent.click(screen.getByRole('button', { name: '내 상황을 직접 설명하기' }))
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
    fireEvent.click(screen.getByRole('button', { name: '내 상황을 직접 설명하기' }))
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).not.toBeChecked()
    }
    fireEvent.click(screen.getByRole('button', { name: '질문하기' }))
    expect(screen.getByText('평소 쓰는 말투를 골라주세요.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '보낼 말 3가지 만들기' })).toBeDisabled()
  })

  it('클립보드를 쓸 수 없으면 후보 텍스트를 선택해 복사를 이어갈 수 있게 한다', async () => {
    const { container } = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /먼저 연락할래요/ }))
    chooseProfessorMessenger()
    chooseHaeyoSpeechStyle()
    openTemplateDraft('결석·과제 문의')
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
    openTemplateDraft('감사·확인')
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
    openTemplateDraft('부탁')
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
    fireEvent.click(screen.getByRole('button', { name: '내 상황을 직접 설명하기' }))
    fireEvent.click(screen.getByRole('button', { name: '질문하기' }))
    chooseHaeyoSpeechStyle()
    fireEvent.change(screen.getByLabelText('상황 설명'), {
      target: { value: '동아리 회의 시간을 다시 확인하고 싶어요.' },
    })
    fireEvent.click(screen.getByRole('button', { name: '보낼 말 3가지 만들기' }))
    await waitFor(() => expect(screen.getAllByRole('button', { name: '복사' })).toHaveLength(3))

    fireEvent.click(screen.getAllByRole('button', { name: '복사' })[0])
    expect(await screen.findByRole('button', { name: '복사됨 ✓' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '같은 입력으로 다른 표현 만들기' }))
    await waitFor(() => expect(screen.getAllByRole('button', { name: '복사' })).toHaveLength(3))

    expect(screen.getByText(/선배·동기에 맞춰 요체로 같은 뜻을 세 가지 톤으로 준비했어요/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '복사됨 ✓' })).not.toBeInTheDocument()
    expect(screen.queryByText('복사했어요.')).not.toBeInTheDocument()
  })
})
