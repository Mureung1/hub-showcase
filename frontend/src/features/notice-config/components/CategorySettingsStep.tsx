import { mockDiscordChannels } from '../api/mockNoticeConfigApi'
import type { SaveStatus } from '../types/adminFlowTypes'
import type { DetectedCategory } from '../types/noticeConfigTypes'

interface CategorySettingsStepProps {
  categories: DetectedCategory[]
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
                onChange={(event) => onCategoryChange(category.name, 'channelId', event.target.value)}
              >
                {mockDiscordChannels.map((channel) => (
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
        </div>
      </section>

      <p className="notice-box">활성화 OFF인 카테고리는 구독 및 알림 대상에서 제외됩니다.</p>

      <div className="admin-actions">
        <button type="button" onClick={onPrevious}>
          이전
        </button>
        <div className="right-actions">
          <SaveStatusText status={saveStatus} />
          <button className="primary-action" type="button" onClick={onSave}>
            {saveStatus === 'saving' ? '저장 중...' : '저장'}
          </button>
          <button className="primary-action" type="button" disabled={saveStatus !== 'saved'} onClick={onNext}>
            다음 →
          </button>
        </div>
      </div>
    </div>
  )
}

function SaveStatusText({ status }: { status: SaveStatus }) {
  if (status === 'dirty') {
    return <span className="save-status warning">저장하지 않은 변경사항이 있습니다.</span>
  }

  if (status === 'saving') {
    return <span className="save-status">저장 중입니다...</span>
  }

  if (status === 'saved') {
    return <span className="save-status success">저장되었습니다.</span>
  }

  return null
}
