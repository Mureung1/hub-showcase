import type { DiscordChannel } from '../../discord/types/discordTypes'
import type { SaveStatus } from '../types/adminFlowTypes'
import type { DetectedCategory } from '../types/noticeConfigTypes'

interface CategorySettingsStepProps {
  categories: DetectedCategory[]
  discordChannels: DiscordChannel[]
  isLoadingChannels: boolean
  channelLoadError: string | null
  canGoNext: boolean
  saveStatus: SaveStatus
  onCategoryChange: (
    categoryName: string,
    field: keyof Pick<DetectedCategory, 'channelId' | 'roleName' | 'isActive'>,
    value: string | boolean,
  ) => void
  onPrevious: () => void
  onSave: () => void
  onNext: () => void
}

export function CategorySettingsStep({
  categories,
  discordChannels,
  isLoadingChannels,
  channelLoadError,
  canGoNext,
  saveStatus,
  onCategoryChange,
  onPrevious,
  onSave,
  onNext,
}: CategorySettingsStepProps) {
  return (
    <div className="admin-main">
      <header className="admin-heading">
        <h1>카테고리 설정</h1>
        <p>감지된 카테고리별로 알림을 보낼 채널과 역할 이름을 설정하세요.</p>
      </header>

      <section className="table-card">
        <h2>감지된 카테고리 목록</h2>
        {isLoadingChannels && <p className="table-message">Discord 채널 목록을 불러오는 중입니다.</p>}
        {channelLoadError && <p className="table-message error">{channelLoadError}</p>}
        <div className="category-table">
          <div className="table-row table-head">
            <span>카테고리</span>
            <span>채널</span>
            <span>Role 이름</span>
            <span>활성화</span>
          </div>
          {categories.map((category) => (
            <div className="table-row" key={category.name}>
              <span className="category-name">{category.name}</span>
              <select
                value={category.channelId}
                disabled={isLoadingChannels || discordChannels.length === 0}
                onChange={(event) => onCategoryChange(category.name, 'channelId', event.target.value)}
              >
                {discordChannels.length === 0 && <option value="">채널 없음</option>}
                {discordChannels.map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    {channel.name}
                  </option>
                ))}
              </select>
              <input
                value={category.roleName}
                placeholder={`예: Iris-${category.name}`}
                onChange={(event) => onCategoryChange(category.name, 'roleName', event.target.value)}
              />
              <button
                className={category.isActive ? 'toggle active' : 'toggle'}
                type="button"
                aria-label={`${category.name} 활성화`}
                aria-pressed={category.isActive}
                onClick={() => onCategoryChange(category.name, 'isActive', !category.isActive)}
              >
                <span />
              </button>
            </div>
          ))}
          {categories.length === 0 && (
            <p className="table-message">
              감지된 카테고리가 없습니다. 사이트 등록에서 테스트 크롤링을 먼저 진행해주세요.
            </p>
          )}
        </div>
      </section>

      <p className="notice-box">활성화 OFF인 카테고리는 구독 및 알림 대상에서 제외됩니다.</p>

      <div className="admin-actions">
        <div className="left-actions">
          <button type="button" onClick={onPrevious}>
            이전
          </button>
        </div>
        <div className="right-actions">
          <SaveStatusText status={saveStatus} />
          <button
            className="primary-action"
            type="button"
            disabled={categories.length === 0 || saveStatus === 'saving'}
            onClick={onSave}
          >
            {saveStatus === 'saving' ? '저장 중...' : '저장'}
          </button>
          <button className="primary-action" type="button" disabled={!canGoNext} onClick={onNext}>
            다음 →
          </button>
        </div>
      </div>
    </div>
  )
}

function SaveStatusText({ status }: { status: SaveStatus }) {
  if (status === 'dirty') {
    return (
      <span className="save-status warning">
        저장하지 않은 변경사항이 있습니다. 변경사항을 반영하려면 저장해주세요.
      </span>
    )
  }

  if (status === 'saving') {
    return <span className="save-status">저장 중입니다...</span>
  }

  if (status === 'saved') {
    return <span className="save-status success">저장되었습니다.</span>
  }

  if (status === 'error') {
    return <span className="save-status error">저장에 실패했습니다. 입력값을 확인해주세요.</span>
  }

  return null
}
