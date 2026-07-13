import { Link, Navigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  User,
  Target,
  AlertTriangle,
  ListChecks,
} from 'lucide-react';
import {
  getCourseById,
  getRelatedCourses,
} from '../../data/userMock';
import { useCourseLibrary } from '../../hooks/useCourseLibrary';
import CoursePlayer from '../../features/courses/CoursePlayer';
import CourseCard from '../../features/courses/CourseCard';
import FavoriteButton from '../../features/courses/FavoriteButton';
import '../../features/courses/courses.css';
import './user.css';

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const course = id ? getCourseById(id) : undefined;
  const { isFavorite, isWatched, toggleFavorite } = useCourseLibrary();

  if (!course) {
    return <Navigate to="/user/courses" replace />;
  }

  const related = getRelatedCourses(course);
  const favorited = isFavorite(course.id);
  const watched = isWatched(course.id);

  return (
    <div className="user-page course-detail">
      <Link to="/user/courses" className="course-back">
        <ArrowLeft size={16} />
        강좌 목록
      </Link>

      <section className="course-detail-hero">
        <CoursePlayer course={course} />

        <div className="course-detail-info panel">
          <div className="course-detail-info-top">
            <div className="course-card-top">
              <span className="status-badge badge-red">{course.bodyPart}</span>
              <span className="status-badge badge-purple">{course.goal}</span>
              <span className="status-badge badge-green">{course.level}</span>
              {watched && (
                <span className="status-badge badge-yellow">시청함</span>
              )}
            </div>
            <FavoriteButton
              active={favorited}
              onToggle={() => toggleFavorite(course.id)}
            />
          </div>
          <h1>{course.title}</h1>
          <p className="course-detail-desc">{course.description}</p>
          <div className="course-card-meta">
            <span>
              <Clock size={14} />
              {course.durationMin}분
            </span>
            <span>
              <User size={14} />
              {course.trainer}
            </span>
          </div>
          <p className="course-player-hint">
            아래(또는 좌측) 플레이어에서 재생을 누르면 시청 기록에 남습니다.
          </p>
        </div>
      </section>

      <section className="course-guide-grid">
        <article className="panel">
          <div className="panel-header">
            <div>
              <h2>
                <span className="panel-icon">
                  <Target size={16} />
                </span>
                자극 포인트
              </h2>
              <p>정확한 자극을 위한 폼 체크리스트입니다.</p>
            </div>
          </div>
          <ul className="guide-list">
            {course.cues.map((cue) => (
              <li key={cue}>{cue}</li>
            ))}
          </ul>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <h2>
                <span className="panel-icon">
                  <AlertTriangle size={16} />
                </span>
                주의사항
              </h2>
              <p>부상 위험을 줄이기 위해 꼭 확인하세요.</p>
            </div>
          </div>
          <ul className="guide-list warn">
            {course.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </article>

        <article className="panel course-sets-panel">
          <div className="panel-header">
            <div>
              <h2>
                <span className="panel-icon">
                  <ListChecks size={16} />
                </span>
                세트 가이드
              </h2>
              <p>영상과 함께 따라할 추천 구성입니다.</p>
            </div>
          </div>
          <ul className="guide-list">
            {course.setsGuide.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>

      {related.length > 0 && (
        <section className="user-section">
          <div className="panel-header">
            <div>
              <h2>관련 강좌</h2>
              <p>같은 부위 또는 목적의 다른 가이드입니다.</p>
            </div>
          </div>
          <div className="course-grid">
            {related.map((item) => (
              <CourseCard key={item.id} course={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
