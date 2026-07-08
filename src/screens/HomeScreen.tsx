import {
  CalendarDays,
  ChevronRight,
  Clock3,
  Info,
  MapPin,
  Megaphone,
  Store,
} from 'lucide-react'
import { ActionButton } from '../components/ActionButton'
import { booths, importantNotice, nextEvent, today } from '../data/festivalData'
import type { View } from '../types/festival'

type HomeScreenProps = {
  onOpenView: (view: View) => void
}

export function HomeScreen({ onOpenView }: HomeScreenProps) {
  return (
    <section className="screen" aria-labelledby="home-title">
      <header className="app-header">
        <h1 id="home-title">대학 축제 가이드</h1>
        <span className="prototype-badge">MVP</span>
      </header>

      <section className="today-status" aria-label="오늘 현황">
        <div>
          <p className="date-line">
            오늘 <strong>5월 16일</strong> 금요일
          </p>
          <p className="current-time">14:20</p>
        </div>
        <div className="data-status">
          <Info aria-hidden="true" size={20} />
          <span>임시 데이터</span>
        </div>
      </section>

      <section className="today-overview" aria-labelledby="today-title">
        <h2 id="today-title">오늘의 축제</h2>
        <p className="open-status">
          <span className="status-dot" />
          부스 운영 중 <span>12:00 - 22:00</span>
        </p>
        <button
          className="booth-signal"
          onClick={() => onOpenView('booths')}
          type="button"
        >
          <Store aria-hidden="true" size={20} />
          <span>오늘 운영 부스 {booths.filter((booth) => booth.date === today).length}개</span>
          <ChevronRight aria-hidden="true" size={20} />
        </button>
      </section>

      <article className="next-event-card">
        <p className="section-label">다음 일정</p>
        <p className="event-time">{nextEvent.time}</p>
        <h3>{nextEvent.title}</h3>
        <dl className="meta-list">
          <div>
            <dt>
              <MapPin aria-hidden="true" size={18} />
              위치
            </dt>
            <dd>{nextEvent.location}</dd>
          </div>
          <div>
            <dt>
              <Clock3 aria-hidden="true" size={18} />
              시간
            </dt>
            <dd>
              {nextEvent.time} - {nextEvent.endTime}
            </dd>
          </div>
        </dl>
        <button
          className="primary-button"
          onClick={() => onOpenView('timetable')}
          type="button"
        >
          전체 타임테이블 보기
          <ChevronRight aria-hidden="true" size={22} />
        </button>
      </article>

      <button
        className="notice-strip"
        onClick={() => onOpenView('notices')}
        type="button"
      >
        <Megaphone aria-hidden="true" size={22} />
        <strong>중요 공지</strong>
        <span>{importantNotice.title}</span>
        <ChevronRight aria-hidden="true" size={22} />
      </button>

      <section className="quick-actions" aria-label="주요 기능 바로가기">
        <ActionButton
          color="green"
          icon={CalendarDays}
          label="타임테이블"
          onClick={() => onOpenView('timetable')}
        />
        <ActionButton
          color="blue"
          icon={Store}
          label="부스"
          onClick={() => onOpenView('booths')}
        />
        <ActionButton
          color="orange"
          icon={Megaphone}
          label="공지"
          onClick={() => onOpenView('notices')}
        />
      </section>
    </section>
  )
}
