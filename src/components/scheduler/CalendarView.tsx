import { shareGroups, weekLabels } from './data'
import { CategoryIcon } from './shared'
import type { ScheduleManager } from './useScheduleManager'

type CalendarViewProps = {
  manager: ScheduleManager
}

export function CalendarView({ manager }: CalendarViewProps) {
  const {
    categories,
    schedules,
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
    moveMonth,
    selectDay,
    addSchedule,
    openScheduleEditor,
    saveScheduleChanges,
    deleteSchedule,
    toggleScheduleCompletion,
    toggleVisibleGroup,
    toggleCategorySettings,
    closeCategorySettings,
    cancelScheduleEditor,
    setDraftTitle,
    setDraftTime,
  } = manager

  return (
    <>
      <section className="calendar-card" id="calendar" aria-labelledby="calendar-title">
        <div className="calendar-heading">
          <div>
            <span className="calendar-kicker">MONTHLY PLAN</span>
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
            const paddedMonth = String(monthIndex + 1).padStart(2, '0')
            const paddedDay = String(day).padStart(2, '0')
            const key = `${year}-${paddedMonth}-${paddedDay}`
            const daySchedules = schedules.filter((schedule) => schedule.date === key)
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

      <section className="selected-agenda" aria-live="polite" aria-labelledby="agenda-title">
        <div className="agenda-title">
          <div>
            <span>{monthIndex + 1}월 {selectedDay}일</span>
            <h2 id="agenda-title">전체 일정</h2>
          </div>
          <span className="agenda-count">{selectedSchedules.length}</span>
        </div>
        {selectedSchedules.length > 0 ? (
          <div className="agenda-list">
            {selectedSchedules.map((schedule) => {
              const category = categories.find((item) => item.id === schedule.category)
              const visibility = category?.visibleTo.join(', ') || '나만 보기'

              return (
                <article className={`${editingScheduleId === schedule.id ? 'editing' : ''} ${schedule.completed ? 'completed' : ''}`} key={schedule.id}>
                  <button
                    type="button"
                    className={`schedule-check ${schedule.tone} ${schedule.completed ? 'checked' : ''}`}
                    role="checkbox"
                    aria-checked={schedule.completed}
                    aria-label={`${schedule.title} ${schedule.completed ? '미완료로 변경' : '완료 처리'}`}
                    onClick={() => toggleScheduleCompletion(schedule.id)}
                  />
                  <div className="agenda-copy">
                    <strong>{schedule.title}</strong>
                    <span>{category?.name ?? '개인'} · {visibility}</span>
                  </div>
                  <div className="agenda-item-tools">
                    <time>{schedule.time}</time>
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
                        <button type="button" className="delete" onClick={() => deleteSchedule(schedule)}>삭제</button>
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

      <section className="quick-groups" aria-labelledby="quick-group-title">
        <div className="quick-group-heading">
          <div><span>QUICK ADD</span><h2 id="quick-group-title">내 카테고리</h2></div>
          <button type="button" onClick={toggleCategorySettings} aria-expanded={categorySettingsOpen}>공개 설정</button>
        </div>
        <div className="quick-group-list">
          {categories.map((category) => (
            <article key={category.id}>
              <span className={`group-pixel-icon ${category.tone}`} aria-hidden="true"><i /><i /></span>
              <div><strong>{category.name}</strong><small>{category.visibleTo.length ? category.visibleTo.join(' · ') : '나만 보기'}</small></div>
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
                    {shareGroups.map((group) => (
                      <button
                        type="button"
                        key={group}
                        className={category.visibleTo.includes(group) ? 'active' : ''}
                        aria-pressed={category.visibleTo.includes(group)}
                        onClick={() => toggleVisibleGroup(category.id, group)}
                      >
                        {group}
                      </button>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
        {notice && <p className="scheduler-notice" role="status">{notice}</p>}
      </section>
    </>
  )
}
