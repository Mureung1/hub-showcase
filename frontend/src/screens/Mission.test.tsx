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

function chipFor(name: string) {
  return screen.getByRole('button', { name })
}

describe('Mission', () => {
  describe('initial state', () => {
    it('selects the recommended mission type chip and shows its prompt', () => {
      render(<Mission article={ARTICLE} onBack={vi.fn()} onSubmit={vi.fn()} onGoToToday={vi.fn()} />)

      expect(chipFor('연결')).toHaveAttribute('aria-pressed', 'true')
      expect(chipFor('질문')).toHaveAttribute('aria-pressed', 'false')
      expect(chipFor('반박')).toHaveAttribute('aria-pressed', 'false')
      expect(chipFor('표현')).toHaveAttribute('aria-pressed', 'false')
      expect(screen.getByText('내 상황이나 프로젝트와 연결해보면?')).toBeInTheDocument()
    })

    it('shows the recommended-mission hint', () => {
      render(<Mission article={ARTICLE} onBack={vi.fn()} onSubmit={vi.fn()} onGoToToday={vi.fn()} />)

      expect(screen.getByText('오늘의 추천 미션')).toBeInTheDocument()
    })

    it('shows the article source, content type, and title in the article card, without an interest badge', () => {
      render(<Mission article={ARTICLE} onBack={vi.fn()} onSubmit={vi.fn()} onGoToToday={vi.fn()} />)

      expect(screen.getByText(ARTICLE.sourceName)).toBeInTheDocument()
      expect(screen.getByText('아티클')).toBeInTheDocument()
      expect(screen.getByText(ARTICLE.title)).toBeInTheDocument()
      expect(screen.queryByText('IT·개발')).not.toBeInTheDocument()
    })
  })

  describe('changing the mission type', () => {
    it('selects the clicked chip and deselects the previous one', async () => {
      render(<Mission article={ARTICLE} onBack={vi.fn()} onSubmit={vi.fn()} onGoToToday={vi.fn()} />)

      await userEvent.click(chipFor('반박'))

      expect(chipFor('반박')).toHaveAttribute('aria-pressed', 'true')
      expect(chipFor('연결')).toHaveAttribute('aria-pressed', 'false')
    })

    it('shows the actual API prompt for the newly selected type', async () => {
      render(<Mission article={ARTICLE} onBack={vi.fn()} onSubmit={vi.fn()} onGoToToday={vi.fn()} />)

      await userEvent.click(chipFor('반박'))

      expect(screen.getByText('이 주장에 반대한다면?')).toBeInTheDocument()
      expect(screen.queryByText('내 상황이나 프로젝트와 연결해보면?')).not.toBeInTheDocument()
    })

    it('shows "미션을 바꿨어요" after selecting a non-recommended type', async () => {
      render(<Mission article={ARTICLE} onBack={vi.fn()} onSubmit={vi.fn()} onGoToToday={vi.fn()} />)

      await userEvent.click(chipFor('반박'))

      expect(screen.getByText('미션을 바꿨어요')).toBeInTheDocument()
      expect(screen.queryByText('오늘의 추천 미션')).not.toBeInTheDocument()
    })

    it('restores "오늘의 추천 미션" when the recommended type is selected again', async () => {
      render(<Mission article={ARTICLE} onBack={vi.fn()} onSubmit={vi.fn()} onGoToToday={vi.fn()} />)

      await userEvent.click(chipFor('반박'))
      await userEvent.click(chipFor('연결'))

      expect(screen.getByText('오늘의 추천 미션')).toBeInTheDocument()
    })

    it('updates the article card accent to match the selected mission type', async () => {
      const { container } = render(
        <Mission article={ARTICLE} onBack={vi.fn()} onSubmit={vi.fn()} onGoToToday={vi.fn()} />,
      )

      expect(container.querySelector('.mission-article-accent--connection')).not.toBeNull()

      await userEvent.click(chipFor('반박'))

      expect(container.querySelector('.mission-article-accent--rebuttal')).not.toBeNull()
      expect(container.querySelector('.mission-article-accent--connection')).toBeNull()
    })

    it('keeps the entered answer when the mission type is changed', async () => {
      render(<Mission article={ARTICLE} onBack={vi.fn()} onSubmit={vi.fn()} onGoToToday={vi.fn()} />)

      await userEvent.type(screen.getByRole('textbox'), '생각을 남긴다.')
      await userEvent.click(chipFor('반박'))

      expect(screen.getByRole('textbox')).toHaveValue('생각을 남긴다.')
    })
  })

  describe('helper text', () => {
    it('shows the guidance message when the answer is empty', () => {
      render(<Mission article={ARTICLE} onBack={vi.fn()} onSubmit={vi.fn()} onGoToToday={vi.fn()} />)

      expect(
        screen.getByText('조금 더 생각해봐요 — 한 문장으로 남겨보세요.'),
      ).toBeInTheDocument()
    })

    it('shows the guidance message when the answer is only whitespace', async () => {
      render(<Mission article={ARTICLE} onBack={vi.fn()} onSubmit={vi.fn()} onGoToToday={vi.fn()} />)

      await userEvent.type(screen.getByRole('textbox'), '   ')

      expect(
        screen.getByText('조금 더 생각해봐요 — 한 문장으로 남겨보세요.'),
      ).toBeInTheDocument()
    })

    it('hides the guidance message and does not show a character count once a valid answer is entered', async () => {
      render(<Mission article={ARTICLE} onBack={vi.fn()} onSubmit={vi.fn()} onGoToToday={vi.fn()} />)

      await userEvent.type(screen.getByRole('textbox'), '생각을 남긴다.')

      expect(
        screen.queryByText('조금 더 생각해봐요 — 한 문장으로 남겨보세요.'),
      ).not.toBeInTheDocument()
      expect(screen.queryByText(/자 기록 중/)).not.toBeInTheDocument()
    })

    it('keeps the textarea and CTA present after the helper text disappears', async () => {
      render(<Mission article={ARTICLE} onBack={vi.fn()} onSubmit={vi.fn()} onGoToToday={vi.fn()} />)

      await userEvent.type(screen.getByRole('textbox'), '생각을 남긴다.')

      expect(screen.getByRole('textbox')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /기록 남기기/ })).toBeInTheDocument()
    })
  })

  describe('submit', () => {
    it('disables the CTA when the answer is empty', () => {
      render(<Mission article={ARTICLE} onBack={vi.fn()} onSubmit={vi.fn()} onGoToToday={vi.fn()} />)

      expect(screen.getByRole('button', { name: /기록 남기기/ })).toBeDisabled()
    })

    it('disables the CTA when the answer is only whitespace', async () => {
      render(<Mission article={ARTICLE} onBack={vi.fn()} onSubmit={vi.fn()} onGoToToday={vi.fn()} />)

      await userEvent.type(screen.getByRole('textbox'), '   ')

      expect(screen.getByRole('button', { name: /기록 남기기/ })).toBeDisabled()
    })

    it('enables the CTA when the answer is valid', async () => {
      render(<Mission article={ARTICLE} onBack={vi.fn()} onSubmit={vi.fn()} onGoToToday={vi.fn()} />)

      await userEvent.type(screen.getByRole('textbox'), '생각을 남긴다.')

      expect(screen.getByRole('button', { name: /기록 남기기/ })).not.toBeDisabled()
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
      render(<Mission article={ARTICLE} onBack={vi.fn()} onSubmit={onSubmit} onGoToToday={vi.fn()} />)

      await userEvent.click(chipFor('반박'))
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
      render(<Mission article={ARTICLE} onBack={vi.fn()} onSubmit={onSubmit} onGoToToday={vi.fn()} />)

      await userEvent.type(screen.getByRole('textbox'), '생각을 남긴다.')
      const submitButton = screen.getByRole('button', { name: /기록 남기기|저장하고 있어요/ })
      // 실제 빠른 두 번 클릭을 재현하기 위해 재렌더링을 기다리지 않고 동기적으로 두 번 발생시킨다.
      fireEvent.click(submitButton)
      fireEvent.click(submitButton)

      expect(onSubmit).toHaveBeenCalledTimes(1)
      expect(screen.getByRole('button', { name: /저장하고 있어요/ })).toBeDisabled()

      resolveSubmit?.()
    })

    it('shows "저장하고 있어요..." and disables the CTA while saving', async () => {
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
      render(<Mission article={ARTICLE} onBack={vi.fn()} onSubmit={onSubmit} onGoToToday={vi.fn()} />)

      await userEvent.type(screen.getByRole('textbox'), '생각을 남긴다.')
      await userEvent.click(screen.getByRole('button', { name: /기록 남기기/ }))

      expect(screen.getByRole('button', { name: /저장하고 있어요/ })).toBeDisabled()

      resolveSubmit?.()
    })
  })

  describe('errors', () => {
    it('shows a 422 message and keeps the answer and mission type', async () => {
      const onSubmit = vi
        .fn()
        .mockRejectedValue(new ApiClientError(422, { code: 'VALIDATION_ERROR', message: '요청값을 확인해 주세요.' }))
      render(<Mission article={ARTICLE} onBack={vi.fn()} onSubmit={onSubmit} onGoToToday={vi.fn()} />)

      await userEvent.click(chipFor('반박'))
      await userEvent.type(screen.getByRole('textbox'), '네')
      await userEvent.click(screen.getByRole('button', { name: /기록 남기기/ }))

      expect(await screen.findByText('조금 더 생각을 담아 작성해 주세요.')).toBeInTheDocument()
      expect(screen.getByRole('textbox')).toHaveValue('네')
      expect(chipFor('반박')).toHaveAttribute('aria-pressed', 'true')
    })

    it('shows a generic error message for non-422 failures', async () => {
      const onSubmit = vi.fn().mockRejectedValue(new Error('network down'))
      render(<Mission article={ARTICLE} onBack={vi.fn()} onSubmit={onSubmit} onGoToToday={vi.fn()} />)

      await userEvent.type(screen.getByRole('textbox'), '생각을 남긴다.')
      await userEvent.click(screen.getByRole('button', { name: /기록 남기기/ }))

      expect(await screen.findByText('저장하지 못했어요. 다시 시도해 주세요.')).toBeInTheDocument()
      expect(screen.getByRole('textbox')).toHaveValue('생각을 남긴다.')
    })

    it('shows errors with role="alert"', async () => {
      const onSubmit = vi.fn().mockRejectedValue(new Error('network down'))
      render(<Mission article={ARTICLE} onBack={vi.fn()} onSubmit={onSubmit} onGoToToday={vi.fn()} />)

      await userEvent.type(screen.getByRole('textbox'), '생각을 남긴다.')
      await userEvent.click(screen.getByRole('button', { name: /기록 남기기/ }))

      expect(await screen.findByRole('alert')).toHaveTextContent('저장하지 못했어요.')
    })

    it('allows retrying after a failed submission', async () => {
      const onSubmit = vi.fn().mockRejectedValueOnce(new Error('network down'))
      render(<Mission article={ARTICLE} onBack={vi.fn()} onSubmit={onSubmit} onGoToToday={vi.fn()} />)

      await userEvent.type(screen.getByRole('textbox'), '생각을 남긴다.')
      await userEvent.click(screen.getByRole('button', { name: /기록 남기기/ }))
      await screen.findByText('저장하지 못했어요. 다시 시도해 주세요.')

      expect(screen.getByRole('button', { name: /기록 남기기/ })).not.toBeDisabled()
    })
  })

  describe('completion', () => {
    it('does not show the completion state before a successful submission', () => {
      render(<Mission article={ARTICLE} onBack={vi.fn()} onSubmit={vi.fn()} onGoToToday={vi.fn()} />)

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
        <Mission article={ARTICLE} onBack={vi.fn()} onSubmit={onSubmit} onGoToToday={onGoToToday} />,
      )

      await userEvent.type(screen.getByRole('textbox'), '생각을 남긴다.')
      await userEvent.click(screen.getByRole('button', { name: /기록 남기기/ }))

      expect(await screen.findByText('생각을 기록했어요.')).toBeInTheDocument()
      expect(screen.getByText('나의 깸에서 다시 확인할 수 있어요.')).toBeInTheDocument()

      await userEvent.click(screen.getByRole('button', { name: /오늘의 깸으로/ }))
      expect(onGoToToday).toHaveBeenCalledTimes(1)
    })
  })

  describe('accessibility', () => {
    it('provides an accessible name for the mission type group', () => {
      render(<Mission article={ARTICLE} onBack={vi.fn()} onSubmit={vi.fn()} onGoToToday={vi.fn()} />)

      expect(screen.getByRole('group', { name: '미션 유형' })).toBeInTheDocument()
    })

    it('renders mission type chips as real buttons', () => {
      render(<Mission article={ARTICLE} onBack={vi.fn()} onSubmit={vi.fn()} onGoToToday={vi.fn()} />)

      expect(chipFor('질문').tagName).toBe('BUTTON')
      expect(chipFor('질문')).toHaveAttribute('type', 'button')
    })

    it('has an accessible name of 뒤로가기 for the back button', () => {
      render(<Mission article={ARTICLE} onBack={vi.fn()} onSubmit={vi.fn()} onGoToToday={vi.fn()} />)

      expect(screen.getByRole('button', { name: '뒤로가기' })).toBeInTheDocument()
    })

    it('goes back when the back button is clicked', async () => {
      const onBack = vi.fn()
      render(<Mission article={ARTICLE} onBack={onBack} onSubmit={vi.fn()} onGoToToday={vi.fn()} />)

      await userEvent.click(screen.getByRole('button', { name: '뒤로가기' }))

      expect(onBack).toHaveBeenCalledTimes(1)
    })

    it('provides an accessible label for the textarea', () => {
      render(<Mission article={ARTICLE} onBack={vi.fn()} onSubmit={vi.fn()} onGoToToday={vi.fn()} />)

      expect(screen.getByRole('textbox', { name: '답변' })).toBeInTheDocument()
    })

    it('treats the mission-type function-color dots as decorative', () => {
      const { container } = render(
        <Mission article={ARTICLE} onBack={vi.fn()} onSubmit={vi.fn()} onGoToToday={vi.fn()} />,
      )

      const dots = container.querySelectorAll('.mission-type-dot')
      expect(dots.length).toBeGreaterThan(0)
      dots.forEach((dot) => {
        expect(dot).toHaveAttribute('aria-hidden', 'true')
      })
    })
  })
})
