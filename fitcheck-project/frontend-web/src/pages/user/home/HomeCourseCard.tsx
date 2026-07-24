import { Link } from 'react-router-dom';
import { Flame } from 'lucide-react';
import type { Course } from '../../../data/userMock';
import VideoPlaceholder from '../../../features/courses/VideoPlaceholder';

interface HomeCourseCardProps {
  course: Course | null;
  loading: boolean;
}

export default function HomeCourseCard({ course, loading }: HomeCourseCardProps) {
  return (
    <section className="showcase-card home-course-card">
      <h2 className="showcase-section-title">추천 강좌</h2>

      {loading && <p className="home-empty-copy">추천 강좌를 불러오는 중...</p>}

      {!loading && course && (
        <>
          <div className="home-course-media">
            <VideoPlaceholder course={course} size="card" />
          </div>
          <h3 className="home-course-title">{course.title}</h3>
          <p className="home-course-meta">
            Lv.{course.level === '초급' ? 1 : course.level === '중급' ? 2 : 3} ·{' '}
            {course.durationMin}분 · {course.level}
          </p>
          <div className="home-course-tags">
            <span className="home-tag">{course.bodyPart}</span>
            <span className="home-tag">{course.goal}</span>
            <span className="home-course-kcal">
              <Flame size={14} />
              {course.durationMin * 10}
            </span>
          </div>
          <Link
            to={`/user/courses/${course.id}`}
            className="btn btn-primary home-course-cta"
          >
            시청하기
          </Link>
        </>
      )}

      {!loading && !course && (
        <p className="home-empty-copy">
          추천 강좌를 불러오지 못했습니다. 백엔드 서버를 확인해 주세요.
        </p>
      )}
    </section>
  );
}
