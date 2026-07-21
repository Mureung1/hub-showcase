import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Mission from './Mission'
import { ApiClientError } from '../api/client'
import type { ArticleDetail } from '../api/types'

function makeArticleDetail(): ArticleDetail {
  return {
    id: '40000000-0000-0000-0000-000000000001',
    title: 'A 글',
    translatedTitle: null,
    sourceName: '요즘IT',
    sourceType: 'expert_article',
    contentType: 'article',
    publishedAt: '2026-07-14T03:00:00Z',
    author: null,
    officialExcerpt: 'A 글의 소개문',
    translatedExcerpt: null,
    readingTimeMinutes: 5,
    language: 'ko',
    accessType: 'free',
    urlStatus: 'active',
    originalUrl: 'https://example.com/40000000-0000-0000-0000-000000000001',
    recommendedMission: { type: 'connection', prompt: '내 상황이나 프로젝트와 연결해보면?' },
    missionOptions: [
      { type: 'question', prompt: '이 글의 핵심 주장은 뭐지?' },
      { type: 'rebuttal', prompt: '이 주장에 반대한다면?' },
      { type: 'connection', prompt: '내 상황이나 프로젝트와 연결해보면?' },
      { type: 'expression', prompt: '이 글이 놓친 관점은 뭐지?' },
    ],
  }
}

const ARTICLE = makeArticleDetail()

describe('Mission', () => {
  it('selects the recommended mission type by default and shows its prompt', () => {
    render(
      <Mission
        article={ARTICLE}
        onBack={vi.fn()}
        onSubmit={vi.fn()}
        onGoToToday={vi.fn()}
      />,
    )

    expect(screen.getByRole('combobox')).toHaveValue('connection')
    expect(screen.getByText('내 상황이나 프로젝트와 연결해보면?')).toBeInTheDocument()
  })

  it('shows the selected option prompt when the mission type is changed', async () => {
    render(
      <Mission
        article={ARTICLE}
        onBack={vi.fn()}
        onSubmit={vi.fn()}
        onGoToToday={vi.fn()}
      />,
    )

    await userEvent.selectOptions(screen.getByRole('combobox'), 'rebuttal')

    expect(screen.getByText('이 주장에 반대한다면?')).toBeInTheDocument()
    expect(screen.queryByText('내 상황이나 프로젝트와 연결해보면?')).not.toBeInTheDocument()
  })

  it('submits articleId, the changed missionType, and the trimmed answer', async () => {
    const onSubmit = vi.fn().mockResolvedValue({
      id: '50000000-0000-0000-0000-000000000001',
      articleId: ARTICLE.id,
      missionType: 'rebuttal',
      missionPrompt: '이 주장에 반대한다면?',
      userAnswer: '나는 동의하지 않는다.',
      selectedQuote: null,
      anchorType: 'whole_content',
      createdAt: '2026-07-20T05:00:00Z',
    })
    render(
      <Mission article={ARTICLE} onBack={vi.fn()} onSubmit={onSubmit} onGoToToday={vi.fn()} />,
    )

    await userEvent.selectOptions(screen.getByRole('combobox'), 'rebuttal')
    await userEvent.type(screen.getByRole('textbox'), '  나는 동의하지 않는다.  ')
    await userEvent.click(screen.getByRole('button', { name: /기록 남기기/ }))

    expect(onSubmit).toHaveBeenCalledExactlyOnceWith({
      articleId: ARTICLE.id,
      missionType: 'rebuttal',
      userAnswer: '나는 동의하지 않는다.',
    })
  })

  it('sends only one request when the submit button is clicked twice quickly', async () => {
    let resolveSubmit: (() => void) | undefined
    const onSubmit = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSubmit = () =>
            resolve({
              id: '50000000-0000-0000-0000-000000000001',
              articleId: ARTICLE.id,
              missionType: ARTICLE.recommendedMission.type,
              missionPrompt: ARTICLE.recommendedMission.prompt,
              userAnswer: '생각을 남긴다.',
              selectedQuote: null,
              anchorType: 'whole_content',
              createdAt: '2026-07-20T05:00:00Z',
            })
        }),
    )
    render(
      <Mission article={ARTICLE} onBack={vi.fn()} onSubmit={onSubmit} onGoToToday={vi.fn()} />,
    )

    await userEvent.type(screen.getByRole('textbox'), '생각을 남긴다.')
    const submitButton = screen.getByRole('button', { name: /기록 남기기|저장하고 있어요/ })
    // 실제 빠른 두 번 클릭을 재현하기 위해 재렌더링을 기다리지 않고 동기적으로 두 번 발생시킨다.
    fireEvent.click(submitButton)
    fireEvent.click(submitButton)

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: /저장하고 있어요/ })).toBeDisabled()

    resolveSubmit?.()
  })

  it('shows a 422 message and keeps the answer when the request is rejected as validation error', async () => {
    const onSubmit = vi
      .fn()
      .mockRejectedValue(new ApiClientError(422, { code: 'VALIDATION_ERROR', message: '요청값을 확인해 주세요.' }))
    render(
      <Mission article={ARTICLE} onBack={vi.fn()} onSubmit={onSubmit} onGoToToday={vi.fn()} />,
    )

    await userEvent.type(screen.getByRole('textbox'), '네')
    await userEvent.click(screen.getByRole('button', { name: /기록 남기기/ }))

    expect(await screen.findByText('조금 더 생각을 담아 작성해 주세요.')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toHaveValue('네')
    expect(screen.getByRole('combobox')).toHaveValue('connection')
  })

  it('shows a generic error message for non-422 failures', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('network down'))
    render(
      <Mission article={ARTICLE} onBack={vi.fn()} onSubmit={onSubmit} onGoToToday={vi.fn()} />,
    )

    await userEvent.type(screen.getByRole('textbox'), '생각을 남긴다.')
    await userEvent.click(screen.getByRole('button', { name: /기록 남기기/ }))

    expect(await screen.findByText('저장하지 못했어요. 다시 시도해 주세요.')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toHaveValue('생각을 남긴다.')
  })

  it('allows retrying after a failed submission', async () => {
    const onSubmit = vi.fn().mockRejectedValueOnce(new Error('network down'))
    render(
      <Mission article={ARTICLE} onBack={vi.fn()} onSubmit={onSubmit} onGoToToday={vi.fn()} />,
    )

    await userEvent.type(screen.getByRole('textbox'), '생각을 남긴다.')
    await userEvent.click(screen.getByRole('button', { name: /기록 남기기/ }))
    await screen.findByText('저장하지 못했어요. 다시 시도해 주세요.')

    expect(screen.getByRole('button', { name: /기록 남기기/ })).not.toBeDisabled()
  })

  it('does not show the completion state before a successful submission', () => {
    render(
      <Mission article={ARTICLE} onBack={vi.fn()} onSubmit={vi.fn()} onGoToToday={vi.fn()} />,
    )

    expect(screen.queryByText('생각을 기록했어요.')).not.toBeInTheDocument()
  })

  it('shows the completion state and navigates to today after a successful submission', async () => {
    const onGoToToday = vi.fn()
    const onSubmit = vi.fn().mockResolvedValue({
      id: '50000000-0000-0000-0000-000000000001',
      articleId: ARTICLE.id,
      missionType: ARTICLE.recommendedMission.type,
      missionPrompt: ARTICLE.recommendedMission.prompt,
      userAnswer: '생각을 남긴다.',
      selectedQuote: null,
      anchorType: 'whole_content',
      createdAt: '2026-07-20T05:00:00Z',
    })
    render(
      <Mission
        article={ARTICLE}
        onBack={vi.fn()}
        onSubmit={onSubmit}
        onGoToToday={onGoToToday}
      />,
    )

    await userEvent.type(screen.getByRole('textbox'), '생각을 남긴다.')
    await userEvent.click(screen.getByRole('button', { name: /기록 남기기/ }))

    expect(await screen.findByText('생각을 기록했어요.')).toBeInTheDocument()
    expect(screen.getByText('나의 깸에서 다시 확인할 수 있어요.')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /오늘의 깸으로/ }))
    expect(onGoToToday).toHaveBeenCalledTimes(1)
  })
})
