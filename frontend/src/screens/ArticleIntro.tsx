import { useState } from 'react'
import { ChevronLeft, ExternalLink } from 'lucide-react'
import Mission from './Mission'
import type { ArticleDetail, ContentType, CreateMissionRecordRequest, MissionRecord } from '../api/types'
import './ArticleIntro.css'

const CONTENT_TYPE_LABEL: Record<ContentType, string> = {
  article: '아티클',
  blog: '블로그',
  video: '영상',
}

const URL_STATUS_NOTICE: Record<'paywalled' | 'broken' | 'removed', string> = {
  paywalled: '유료 콘텐츠라 이 앱에서 바로 열 수 없어요.',
  broken: '원문 링크에 문제가 생겼어요.',
  removed: '원문이 삭제됐어요.',
}

export type ArticleIntroState =
  | { status: 'loading' }
  | { status: 'error'; message: string; onRetry: () => void }
  | { status: 'success'; article: ArticleDetail }

type ArticleIntroProps = {
  state: ArticleIntroState
  onBack: () => void
  onSubmitMission?: (request: CreateMissionRecordRequest) => Promise<MissionRecord>
  onGoToMyGgaem?: () => void
}

export default function ArticleIntro({
  state,
  onBack,
  onSubmitMission = () => Promise.reject(new Error('onSubmitMission not provided')),
  onGoToMyGgaem = () => {},
}: ArticleIntroProps) {
  const [hasOpenedOriginal, setHasOpenedOriginal] = useState(false)
  const [screen, setScreen] = useState<'intro' | 'mission'>('intro')

  if (state.status === 'success' && screen === 'mission') {
    return (
      <Mission
        article={state.article}
        onBack={() => setScreen('intro')}
        onSubmit={onSubmitMission}
        onGoToMyGgaem={onGoToMyGgaem}
      />
    )
  }

  return (
    <div className="app-shell">
      <header className="article-intro-header">
        <button
          type="button"
          className="article-intro-back"
          aria-label="뒤로가기"
          onClick={onBack}
        >
          <ChevronLeft aria-hidden="true" />
        </button>
        <span className="article-intro-header-label">오늘의 글</span>
      </header>

      <main className="article-intro-main">
        {state.status === 'loading' && <p role="status">글을 불러오고 있어요...</p>}

        {state.status === 'error' && (
          <div role="alert">
            <p>{state.message}</p>
            <button type="button" className="btn-primary" onClick={state.onRetry}>
              다시 시도
            </button>
          </div>
        )}

        {state.status === 'success' && (
          <>
            <p className="article-intro-meta">
              <span>{state.article.sourceName}</span>
              <span className="dot" />
              <span>{CONTENT_TYPE_LABEL[state.article.contentType]}</span>
              <span className="dot" />
              <span>
                {state.article.readingTimeMinutes != null
                  ? `약 ${state.article.readingTimeMinutes}분`
                  : '예상 읽기 시간 정보가 없어요.'}
              </span>
            </p>

            <h1 className="article-intro-title">{state.article.title}</h1>

            <p className="article-intro-section-label">글 소개</p>
            <p className="article-intro-excerpt">
              {state.article.officialExcerpt ?? '제공된 글 소개가 없어요.'}
            </p>

            {state.article.urlStatus !== 'active' && (
              <p className="article-intro-url-notice">
                {URL_STATUS_NOTICE[state.article.urlStatus]}
              </p>
            )}

            {state.article.urlStatus === 'active' && hasOpenedOriginal && (
              <div className="article-intro-mission-prompt">
                <p>원문을 읽고 돌아오셨나요?</p>
                <p>이제 짧게 생각을 남겨볼까요?</p>
              </div>
            )}
          </>
        )}
      </main>

      {state.status === 'success' && (
        <footer className="article-intro-footer">
          {state.article.urlStatus !== 'active' && (
            <button type="button" className="btn-primary" disabled>
              원문 읽으러 가기
            </button>
          )}

          {state.article.urlStatus === 'active' && !hasOpenedOriginal && (
            <a
              className="btn-primary"
              href={state.article.originalUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => setHasOpenedOriginal(true)}
            >
              원문 읽으러 가기
              <ExternalLink aria-hidden="true" />
            </a>
          )}

          {state.article.urlStatus === 'active' && hasOpenedOriginal && (
            <div className="article-intro-visited-actions">
              <a
                className="article-intro-secondary-cta"
                href={state.article.originalUrl}
                target="_blank"
                rel="noreferrer"
              >
                원문 다시 읽기
              </a>
              <button
                type="button"
                className="btn-primary article-intro-mission-cta"
                onClick={() => setScreen('mission')}
              >
                깸 작성하기
              </button>
            </div>
          )}
        </footer>
      )}
    </div>
  )
}
