import { Link } from 'react-router-dom';
import { Play } from 'lucide-react';
import type { Course } from '../../../data/userMock';

interface HomeRoutineCardProps {
  course: Course | null;
  loading: boolean;
}

export default function HomeRoutineCard({ course, loading }: HomeRoutineCardProps) {
  const progress = 60;

  return (
    <section className="showcase-card showcase-card--accent home-routine-card">
      <div className="home-routine-top">
        <div>
          <span className="home-routine-badge">오늘의 루틴</span>
          {loading && <p className="home-empty-copy">루틴을 불러오는 중...</p>}
          {!loading && course && (
            <>
              <h2 className="home-routine-title">{course.title}</h2>
              <p className="home-routine-meta">
                {course.level} · {course.durationMin}분 · {course.bodyPart}
              </p>
            </>
          )}
          {!loading && !course && (
            <p className="home-empty-copy">추천 루틴을 불러오지 못했습니다.</p>
          )}
        </div>
        {!loading && course ? (
          <div className="home-routine-ring" aria-hidden="true">
            <svg viewBox="0 0 52 52">
              <circle
                cx="26"
                cy="26"
                r="22"
                fill="none"
                stroke="var(--border)"
                strokeWidth="4"
              />
              <circle
                cx="26"
                cy="26"
                r="22"
                fill="none"
                stroke="var(--secondary)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 22}
                strokeDashoffset={2 * Math.PI * 22 * (1 - progress / 100)}
                transform="rotate(-90 26 26)"
              />
            </svg>
            <span className="home-routine-ring-label">{progress}%</span>
          </div>
        ) : null}
      </div>
      {!loading && course ? (
        <Link to={`/user/courses/${course.id}`} className="btn btn-primary home-routine-cta">
          <Play size={16} />
          이어하기
        </Link>
      ) : null}
    </section>
  );
}
