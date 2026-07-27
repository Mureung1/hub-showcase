import { useState } from 'react'
import type { DiscordChannel } from '../../discord/types/discordTypes'
import type { DetectedCategory } from '../types/noticeConfigTypes'

const maxCollapsedCategoryCount = 5

interface CompleteStepProps {
  siteName: string
  categories: DetectedCategory[]
  discordChannels: DiscordChannel[]
  onRestart: () => void
}

export function CompleteStep({
  siteName,
  categories,
  discordChannels,
  onRestart,
}: CompleteStepProps) {
  const [isCategoryListExpanded, setIsCategoryListExpanded] = useState(false)
  const activeCategories = categories.filter((category) => category.isActive)
  const channelNameMap = new Map(discordChannels.map((channel) => [channel.id, channel.name]))
  const notificationChannelId = categories.find((category) => category.channelId)?.channelId || ''
  const notificationChannelName = channelNameMap.get(notificationChannelId) || '채널 미확인'
  const visibleCategories = isCategoryListExpanded
    ? categories
    : categories.slice(0, maxCollapsedCategoryCount)

  return (
    <div className="complete-main">
      <div className="success-mark" aria-hidden="true">
        ✓
      </div>
      <h1>설정이 완료되었습니다! 🎉</h1>
      <p>IRIS가 공지를 감지하면 설정한 채널로 알림을 보냅니다.</p>

      <section className="summary-card">
        <h2>설정 요약</h2>
        <dl>
          <div>
            <dt>공지 사이트</dt>
            <dd>{siteName}</dd>
          </div>
          <div>
            <dt>활성 카테고리</dt>
            <dd>{activeCategories.length}개</dd>
          </div>
          <div>
            <dt>알림 채널</dt>
            <dd>{notificationChannelName}</dd>
          </div>
          <div>
            <dt>비활성 카테고리</dt>
            <dd>{categories.length - activeCategories.length}개</dd>
          </div>
        </dl>
      </section>

      <section className="summary-card">
        <h2>카테고리 연결</h2>
        <div className="complete-category-list">
          <div className="complete-category-head" aria-hidden="true">
            <span>카테고리</span>
            <span>역할</span>
          </div>
          {visibleCategories.map((category) => (
            <article className="complete-category-item" key={category.name}>
              <div>
                <strong>{category.name}</strong>
                <span className={category.isActive ? 'active' : 'inactive'}>
                  {category.isActive ? '활성' : '비활성'}
                </span>
              </div>
              {category.isActive ? (
                <p>{category.roleName || `IRIS-${category.name}`}</p>
              ) : (
                <p>-</p>
              )}
            </article>
          ))}
        </div>
        {categories.length > maxCollapsedCategoryCount && (
          <button
            className="summary-toggle-button"
            type="button"
            onClick={() => setIsCategoryListExpanded((current) => !current)}
          >
            {isCategoryListExpanded ? '접기' : `전체 보기 (${categories.length}개)`}
          </button>
        )}
      </section>

      <section className="command-card">
        <h2>사용 가능한 명령어</h2>
        <div>
          <span>/help</span>
          <p>명령어 목록 보기</p>
        </div>
        <div>
          <span>/setup</span>
          <p>관리자 설정</p>
        </div>
        <div>
          <span>/subscribe</span>
          <p>카테고리 구독/해제</p>
        </div>
        <div>
          <span>/keyword</span>
          <p>키워드 등록/관리</p>
        </div>
      </section>

      <section className="next-guide-card">
        <h2>다음에 할 수 있는 일</h2>
        <p>관리자 권한이 있는 사용자는 /setup으로 언제든 설정을 다시 열 수 있습니다.</p>
        <p>자세한 명령어 설명은 Discord에서 /help 명령어로 확인할 수 있습니다.</p>
      </section>

      <button className="wide-primary restart-action" type="button" onClick={onRestart}>
        처음으로 이동
      </button>
    </div>
  )
}
