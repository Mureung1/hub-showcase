import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { weekLabels } from './data'
import * as friendsApi from './friendsApi'
import { CategoryIcon, PixelAvatar, getAvatarProps } from './shared'
import { dateKey } from './useScheduleManager'
import { VideoCapturePicker } from './VideoCapturePicker'
import type { ScheduleManager } from './useScheduleManager'
import type { FriendGroup, FriendPost, FriendScheduleEntry, FriendSummary, GroupTone, Schedule } from './types'

const TONE_OPTIONS: GroupTone[] = ['blue', 'coral', 'violet', 'green']

type CalendarViewProps = {
  manager: ScheduleManager
  friends: FriendSummary[]
  groups: FriendGroup[]
  selectedOwner: string
  onSelectOwner: (ownerId: string) => void
  onCertify: (post: FriendPost) => void
}

export function CalendarView({ manager, friends, groups, selectedOwner, onSelectOwner, onCertify }: CalendarViewProps) {
  const [certifyingSchedule, setCertifyingSchedule] = useState<Schedule | null>(null)
  const {
    categories,
    schedules,
    schedulesLoading,
    selectedSchedules,
    year,
    monthIndex,
    selectedDay,
    calendarDays,
    notice,
    categorySettingsOpen,
    editingScheduleId,
    draftTitle,
    draftTime,
    renamingId,
    renameDraft,
    moveMonth,
    selectDay,
    addSchedule,
    openScheduleEditor,
    saveScheduleChanges,
    deleteSchedule,
    toggleScheduleCompletion,
    createCategory,
    deleteCategory,
    toggleVisibleGroup,
    toggleCategorySettings,
    closeCategorySettings,
    cancelScheduleEditor,
    startRename,
    commitRename,
    cancelRename,
    setRenameDraft,
    setDraftTitle,
    setDraftTime,
  } = manager

  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryTone, setNewCategoryTone] = useState<GroupTone>('blue')

  const resolveGroupNames = (visibleTo: string[]) =>
    visibleTo
      .map((groupId) => groups.find((group) => group.id === groupId)?.name)
      .filter((name): name is string => Boolean(name))

  const submitNewCategory = (event: FormEvent) => {
    event.preventDefault()
    const name = newCategoryName.trim()
    if (!name) return
    createCategory(name, newCategoryTone)
    setNewCategoryName('')
  }

  const handleToggleCompletion = (schedule: Schedule) => {
    const wasCompleted = schedule.completed
    toggleScheduleCompletion(schedule.id)
    if (!wasCompleted) setCertifyingSchedule(schedule)
  }

  const handleCertifyVideoReady = (videoUrl: string) => {
    if (!certifyingSchedule) return

    const category = categories.find((item) => item.id === certifyingSchedule.category)
    onCertify({
      id: Date.now(),
      friendId: 'me',
      categoryName: category?.name ?? '인증',
      tone: certifyingSchedule.tone,
      caption: `${certifyingSchedule.title} 완료!`,
      timeAgo: '지금',
      videoUrl,
      reactions: { sparkle: 0, heart: 0, fire: 0, tear: 0, wow: 0, sleepy: 0 },
    })
    setCertifyingSchedule(null)
  }

  const [friendSchedules, setFriendSchedules] = useState<FriendScheduleEntry[]>([])
  const [friendSchedulesLoading, setFriendSchedulesLoading] = useState(false)

  const isFriendView = selectedOwner !== 'me'

  useEffect(() => {
    if (!isFriendView) {
      setFriendSchedules([])
      return
    }

    let cancelled = false
    setFriendSchedulesLoading(true)
    friendsApi.fetchFriendSchedules(selectedOwner)
      .then((loaded) => { if (!cancelled) setFriendSchedules(loaded) })
      .catch(() => { if (!cancelled) setFriendSchedules([]) })
      .finally(() => { if (!cancelled) setFriendSchedulesLoading(false) })

    return () => { cancelled = true }
  }, [isFriendView, selectedOwner])

  const selectedFriend = friends.find((friend) => friend.id === selectedOwner)
  const selectedKey = dateKey(year, monthIndex, selectedDay)
  const activeFriendSchedules = isFriendView ? friendSchedules : []
  const activeSelectedFriendSchedules = activeFriendSchedules.filter((item) => item.date === selectedKey)

  return (
    <>
      <div className="owner-strip" role="tablist" aria-label="캘린더 보기 대상">
        <button
          type="button"
          role="tab"
          aria-selected={!isFriendView}
          className={!isFriendView ? 'active' : ''}
          onClick={() => onSelectOwner('me')}
        >
          <PixelAvatar color="#f2a58d" eyes={2} />
          <span><strong>나</strong><small>내 캘린더</small></span>
        </button>
        {friends.map((friend) => (
          <button
            type="button"
            role="tab"
            key={friend.id}
            aria-selected={selectedOwner === friend.id}
            className={selectedOwner === friend.id ? 'active' : ''}
            onClick={() => onSelectOwner(friend.id)}
          >
            <PixelAvatar {...getAvatarProps(friend.id)} />
            <span><strong>{friend.name}</strong><small>친구 캘린더</small></span>
          </button>
        ))}
      </div>

      <div className="calendar-layout">
        <section className="calendar-card" id="calendar" aria-labelledby="calendar-title">
          <div className="calendar-heading">
            <div>
              <span className="calendar-kicker">{isFriendView ? 'FRIEND CALENDAR' : 'MONTHLY PLAN'}</span>
              <h1 id="calendar-title">{year}년 {monthIndex + 1}월</h1>
            </div>
            <div className="month-controls">
              <button type="button" aria-label="이전 달" onClick={() => moveMonth(-1)}>←</button>
              <button type="button" aria-label="다음 달" onClick={() => moveMonth(1)}>→</button>
            </div>
          </div>

          <div className="weekday-row" aria-hidden="true">
            {weekLabels.map((label) => <span key={label}>{label}</span>)}
          </div>

          <div className="calendar-grid">
            {calendarDays.map((day, index) => {
              if (!day) return <span className="empty-day" key={`empty-${index}`} />
              const key = dateKey(year, monthIndex, day)
              const daySchedules = isFriendView
                ? activeFriendSchedules.filter((schedule) => schedule.date === key)
                : schedules.filter((schedule) => schedule.date === key)
              const weekday = index % 7
              const isSelected = selectedDay === day

              return (
                <button
                  type="button"
                  key={key}
                  className={`calendar-day ${isSelected ? 'selected' : ''} ${weekday === 0 ? 'sunday' : ''} ${weekday === 6 ? 'saturday' : ''}`}
                  aria-label={`${monthIndex + 1}월 ${day}일, 일정 ${daySchedules.length}개`}
                  aria-pressed={isSelected}
                  onClick={() => selectDay(day)}
                >
                  <span className="day-markers">
                    {daySchedules.slice(0, 2).map((schedule) => (
                      <i className={`day-marker ${schedule.tone}`} key={schedule.id} />
                    ))}
                  </span>
                  <span className="day-number">{day}</span>
                </button>
              )
            })}
          </div>
        </section>

        <div className="calendar-side">
        <section className="selected-agenda" aria-live="polite" aria-labelledby="agenda-title">
          <div className="agenda-title">
            <div>
              <span>{monthIndex + 1}월 {selectedDay}일</span>
              <h2 id="agenda-title">{isFriendView ? `${selectedFriend?.name ?? '친구'}님의 일정` : '전체 일정'}</h2>
            </div>
            <span className="agenda-count">{isFriendView ? activeSelectedFriendSchedules.length : selectedSchedules.length}</span>
          </div>

          {isFriendView ? (
            friendSchedulesLoading ? (
              <p className="empty-agenda">일정을 불러오는 중이에요...</p>
            ) : activeSelectedFriendSchedules.length > 0 ? (
              <div className="agenda-list">
                {activeSelectedFriendSchedules.map((item) => (
                  <article className="friend-schedule-item" key={item.id}>
                    <i className={`friend-schedule-dot ${item.tone}`} aria-hidden="true" />
                    <div className="agenda-copy">
                      <strong>{item.title}</strong>
                      <span>{item.categoryName}</span>
                    </div>
                    <time>{item.time}</time>
                  </article>
                ))}
              </div>
            ) : (
              <p className="empty-agenda">{selectedFriend?.name ?? '친구'}님이 공개한 일정이 없어요.</p>
            )
          ) : schedulesLoading ? (
            <p className="empty-agenda">일정을 불러오는 중이에요...</p>
          ) : selectedSchedules.length > 0 ? (
            <div className="agenda-list">
              {selectedSchedules.map((schedule) => {
                const category = categories.find((item) => item.id === schedule.category)
                const visibleNames = category ? resolveGroupNames(category.visibleTo) : []
                const visibility = visibleNames.length ? visibleNames.join(', ') : '나만 보기'

                return (
                  <article className={`${editingScheduleId === schedule.id ? 'editing' : ''} ${schedule.completed ? 'completed' : ''}`} key={schedule.id}>
                    <button
                      type="button"
                      className={`schedule-check ${schedule.tone} ${schedule.completed ? 'checked' : ''}`}
                      role="checkbox"
                      aria-checked={schedule.completed}
                      aria-label={`${schedule.title} ${schedule.completed ? '미완료로 변경' : '완료 처리'}`}
                      onClick={() => handleToggleCompletion(schedule)}
                    />
                    {renamingId === schedule.id ? (
                      <input
                        className="agenda-title-input"
                        value={renameDraft}
                        autoFocus
                        onChange={(event) => setRenameDraft(event.target.value)}
                        onBlur={() => commitRename(schedule.id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') commitRename(schedule.id)
                          if (event.key === 'Escape') cancelRename()
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        className="agenda-copy"
                        aria-label={`${schedule.title} 제목 수정`}
                        onClick={() => startRename(schedule)}
                      >
                        <strong>{schedule.title}</strong>
                        <span>{category?.name ?? '개인'} · {visibility}</span>
                      </button>
                    )}
                    <div className="agenda-item-tools">
                      <time>{schedule.time}</time>
                      <button
                        type="button"
                        className="agenda-delete-button"
                        aria-label={`${schedule.title} 삭제`}
                        onClick={() => deleteSchedule(schedule)}
                      >
                        <i />
                      </button>
                      <button
                        type="button"
                        className="agenda-menu-button"
                        aria-label={`${schedule.title} 일정 수정 메뉴`}
                        aria-expanded={editingScheduleId === schedule.id}
                        onClick={() => openScheduleEditor(schedule)}
                      >
                        <i /><i /><i />
                      </button>
                    </div>
                    {editingScheduleId === schedule.id && (
                      <form className="schedule-editor" onSubmit={(event) => { event.preventDefault(); saveScheduleChanges(schedule.id) }}>
                        <label>
                          <span>일정 이름</span>
                          <input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} autoFocus />
                        </label>
                        <label>
                          <span>시간</span>
                          <input type="time" value={draftTime} onChange={(event) => setDraftTime(event.target.value)} />
                        </label>
                        <div className="schedule-editor-actions">
                          <button type="button" onClick={cancelScheduleEditor}>취소</button>
                          <button type="submit" className="save">저장</button>
                        </div>
                      </form>
                    )}
                  </article>
                )
              })}
            </div>
          ) : (
            <p className="empty-agenda">아직 일정이 없어요. 아래 카테고리에서 빠르게 추가해보세요.</p>
          )}
        </section>

        {isFriendView ? (
          <p className="scheduler-notice" role="status">
            {selectedFriend?.name ?? '친구'}님이 공개한 카테고리 일정만 볼 수 있어요. 새 일정은 내 캘린더에서 추가해주세요.
          </p>
        ) : (
        <section className="quick-groups" aria-labelledby="quick-group-title">
          <div className="quick-group-heading">
            <div><span>QUICK ADD</span><h2 id="quick-group-title">내 카테고리</h2></div>
            <button type="button" onClick={toggleCategorySettings} aria-expanded={categorySettingsOpen}>설정</button>
          </div>
          <div className="quick-group-list">
            {categories.map((category) => (
              <article key={category.id}>
                <span className={`group-pixel-icon ${category.tone}`} aria-hidden="true"><i /><i /></span>
                <div><strong>{category.name}</strong><small>{category.visibleTo.length ? resolveGroupNames(category.visibleTo).join(' · ') : '나만 보기'}</small></div>
                <button type="button" aria-label={`${category.name} 일정 추가`} onClick={() => addSchedule(category)}>+</button>
              </article>
            ))}
          </div>
          {categorySettingsOpen && (
            <div className="category-settings" role="dialog" aria-modal="false" aria-labelledby="category-settings-title">
              <div className="category-settings-heading">
                <div><span>CATEGORY SHARE</span><h3 id="category-settings-title">카테고리 공개 그룹</h3></div>
                <button type="button" aria-label="카테고리 설정 닫기" onClick={closeCategorySettings}>×</button>
              </div>
              <p>카테고리별 일정이 보이는 친구 그룹을 선택하세요. 아무것도 선택하지 않으면 나만 볼 수 있어요.</p>
              <div className="category-settings-list">
                {categories.map((category) => (
                  <article key={category.id}>
                    <div className="category-settings-name"><CategoryIcon tone={category.tone} /><strong>{category.name}</strong></div>
                    <div className="visibility-options" aria-label={`${category.name} 공개 그룹`}>
                      {groups.length === 0 ? (
                        <p className="empty-agenda">마이페이지에서 그룹을 먼저 만들어보세요.</p>
                      ) : (
                        groups.map((group) => (
                          <button
                            type="button"
                            key={group.id}
                            className={category.visibleTo.includes(group.id) ? 'active' : ''}
                            aria-pressed={category.visibleTo.includes(group.id)}
                            onClick={() => toggleVisibleGroup(category.id, group.id)}
                          >
                            {group.name}
                          </button>
                        ))
                      )}
                    </div>
                    <button
                      type="button"
                      className="category-delete-button"
                      aria-label={`${category.name} 카테고리 삭제`}
                      onClick={() => deleteCategory(category.id)}
                    >
                      삭제
                    </button>
                  </article>
                ))}
              </div>
              <form className="category-create-form" onSubmit={submitNewCategory}>
                <input
                  value={newCategoryName}
                  onChange={(event) => setNewCategoryName(event.target.value)}
                  placeholder="새 카테고리 이름"
                  aria-label="새 카테고리 이름"
                />
                <div className="category-tone-picker" role="radiogroup" aria-label="카테고리 색상">
                  {TONE_OPTIONS.map((tone) => (
                    <button
                      type="button"
                      key={tone}
                      className={`category-tone-swatch ${tone} ${newCategoryTone === tone ? 'active' : ''}`}
                      role="radio"
                      aria-checked={newCategoryTone === tone}
                      aria-label={tone}
                      onClick={() => setNewCategoryTone(tone)}
                    />
                  ))}
                </div>
                <button type="submit">카테고리 추가</button>
              </form>
            </div>
          )}
          {notice && <p className="scheduler-notice" role="status">{notice}</p>}
        </section>
        )}
        </div>
      </div>

      {certifyingSchedule && (
        <div className="certify-overlay" role="dialog" aria-modal="true" aria-labelledby="certify-title">
          <div className="certify-modal">
            <span className="calendar-kicker">CERTIFY</span>
            <h3 id="certify-title">{certifyingSchedule.title} 완료!</h3>
            <p>짧은 인증 영상을 올리면 친구 피드에 공유돼요.</p>
            <VideoCapturePicker onVideoReady={handleCertifyVideoReady} />
            <div className="certify-modal-actions">
              <button type="button" className="certify-skip-button" onClick={() => setCertifyingSchedule(null)}>
                건너뛰기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
