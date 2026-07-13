import { Link } from 'react-router-dom';
import type { Course } from '../../data/userMock';
import { Clock, User } from 'lucide-react';
import { useCourseLibrary } from '../../hooks/useCourseLibrary';
import VideoPlaceholder from './VideoPlaceholder';
import FavoriteButton from './FavoriteButton';
import './courses.css';

interface CourseCardProps {
  course: Course;
}

export default function CourseCard({ course }: CourseCardProps) {
  const { isFavorite, isWatched, toggleFavorite } = useCourseLibrary();
  const favorited = isFavorite(course.id);
  const watched = isWatched(course.id);

  return (
    <Link to={`/user/courses/${course.id}`} className="course-card panel">
      <div className="course-card-media">
        <VideoPlaceholder course={course} size="card" />
        <FavoriteButton
          active={favorited}
          onToggle={() => toggleFavorite(course.id)}
          size="sm"
        />
        {watched && <span className="course-watched-badge">시청함</span>}
      </div>
      <div className="course-card-top">
        <span className="status-badge badge-red">{course.bodyPart}</span>
        <span className="status-badge badge-purple">{course.goal}</span>
      </div>
      <h3>{course.title}</h3>
      <div className="course-card-meta">
        <span>
          <Clock size={14} />
          {course.durationMin}분
        </span>
        <span>
          <User size={14} />
          {course.trainer}
        </span>
        <span className="course-level">{course.level}</span>
      </div>
      <span className="btn btn-primary course-card-cta">강좌 보기</span>
    </Link>
  );
}
