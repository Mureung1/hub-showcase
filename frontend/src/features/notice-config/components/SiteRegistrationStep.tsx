import { useState } from 'react'
import { PreviewPanel } from './PreviewPanel'
import { SelectorHelpRequestModal } from './SelectorHelpRequestModal'
import { SelectorInput } from './SelectorInput'
import type {
  DetectedCategory,
  NoticeConfigForm,
  NoticePreview,
  SelectorHelpRequest,
} from '../types/noticeConfigTypes'

interface SiteRegistrationStepProps {
  form: NoticeConfigForm
  isCrawling: boolean
  notices: NoticePreview[]
  categories: DetectedCategory[]
  selectorGuideUrl: string
  onFormChange: (field: keyof NoticeConfigForm, value: string) => void
  onTestCrawl: () => void
  onNext: () => void
  onSelectorHelpRequest: (request: SelectorHelpRequest) => Promise<void>
}

export function SiteRegistrationStep({
  form,
  isCrawling,
  notices,
  categories,
  selectorGuideUrl,
  onFormChange,
  onTestCrawl,
  onNext,
  onSelectorHelpRequest,
}: SiteRegistrationStepProps) {
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false)
  const canGoNext = categories.length > 0

  const openSelectorGuide = () => {
    window.open(selectorGuideUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="admin-main">
      <header className="admin-heading">
        <h1>사이트 등록</h1>
        <p>공지 사이트 정보를 입력하고 크롤링할 Selector를 설정하세요.</p>
      </header>

      <section className="form-section">
        <h2>1. 공지 사이트 정보 입력</h2>
        <label htmlFor="siteName">사이트 이름</label>
        <input
          id="siteName"
          value={form.siteName}
          placeholder="예: 경북대학교 컴퓨터학부"
          onChange={(event) => onFormChange('siteName', event.target.value)}
        />
        <label htmlFor="url">공지 사이트 URL</label>
        <input
          id="url"
          value={form.url}
          placeholder="예: https://cse.knu.ac.kr/board/notice"
          onChange={(event) => onFormChange('url', event.target.value)}
        />
      </section>

      <section className="form-section">
        <div className="section-title-row">
          <h2>2. Selector 설정</h2>
          <div className="helper-actions">
            <span>도움이 필요하신가요?</span>
            <button type="button" onClick={openSelectorGuide}>
              설정 방법
            </button>
            <button
              className="primary-small"
              type="button"
              onClick={() => setIsRequestModalOpen(true)}
            >
              개발자에게 요청하기
            </button>
          </div>
        </div>

        <SelectorInput
          id="listSelector"
          label="목록 Selector (list)"
          value={form.listSelector}
          placeholder="예: ul.notice-list > li"
          onChange={(value) => onFormChange('listSelector', value)}
        />
        <SelectorInput
          id="titleSelector"
          label="제목 Selector (title)"
          value={form.titleSelector}
          placeholder="예: .title"
          onChange={(value) => onFormChange('titleSelector', value)}
        />
        <SelectorInput
          id="linkSelector"
          label="링크 Selector (link)"
          value={form.linkSelector}
          placeholder="예: a.link"
          onChange={(value) => onFormChange('linkSelector', value)}
        />
        <SelectorInput
          id="dateSelector"
          label="날짜 Selector (date)"
          value={form.dateSelector}
          placeholder="예: .date"
          onChange={(value) => onFormChange('dateSelector', value)}
        />
        <SelectorInput
          id="categorySelector"
          label="카테고리 Selector (category)"
          value={form.categorySelector}
          placeholder="예: .category"
          onChange={(value) => onFormChange('categorySelector', value)}
        />
      </section>

      <button className="wide-primary" type="button" disabled={isCrawling} onClick={onTestCrawl}>
        {isCrawling ? '테스트 크롤링 중...' : '테스트 크롤링'}
      </button>

      <PreviewPanel notices={notices} categories={categories} />

      <div className="admin-actions end">
        <button className="primary-action" type="button" disabled={!canGoNext} onClick={onNext}>
          다음 →
        </button>
      </div>

      {isRequestModalOpen && (
        <SelectorHelpRequestModal
          initialSiteName={form.siteName}
          initialUrl={form.url}
          onClose={() => setIsRequestModalOpen(false)}
          onSubmit={onSelectorHelpRequest}
        />
      )}
    </div>
  )
}
