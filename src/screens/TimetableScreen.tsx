import { EmptyState } from '../components/EmptyState'
import { FilterChips } from '../components/FilterChips'
import { ScreenHeader } from '../components/ScreenHeader'
import { SegmentedControl } from '../components/SegmentedControl'
import { dates, scheduleCategories } from '../data/festivalData'
import type { ScheduleItem } from '../types/festival'

type TimetableScreenProps = {
  category: string
  date: string
  items: ScheduleItem[]
  onCategoryChange: (category: string) => void
  onDateChange: (date: string) => void
}

export function TimetableScreen({
  category,
  date,
  items,
  onCategoryChange,
  onDateChange,
}: TimetableScreenProps) {
  return (
    <section className="screen" aria-labelledby="timetable-title">
      <ScreenHeader
        description="날짜와 카테고리별 일정을 시간순으로 확인하세요."
        title="타임테이블"
      />
      <SegmentedControl
        label="날짜 선택"
        options={dates}
        value={date}
        onChange={onDateChange}
      />
      <FilterChips
        label="일정 카테고리"
        options={scheduleCategories}
        value={category}
        onChange={onCategoryChange}
      />
      <div className="row-list">
        {items.length > 0 ? (
          items.map((item) => (
            <article className="schedule-row" key={item.id}>
              <time>{item.time}</time>
              <div>
                <span className="tag">{item.category}</span>
                <h3>{item.title}</h3>
                <p>
                  {item.location} · {item.time} - {item.endTime}
                </p>
              </div>
            </article>
          ))
        ) : (
          <EmptyState text="선택한 조건에 맞는 일정이 없습니다." />
        )}
      </div>
    </section>
  )
}
