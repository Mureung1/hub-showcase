import { Link } from 'react-router-dom';
import type { Course } from '../../data/userMock';
import { Clock, User } from 'lucide-react';
import VideoPlaceholder from './VideoPlaceholder';
import './courses.css';

interface CourseCardProps {
  course: Course;
}

export default function CourseCard({ course }: CourseCardProps) {
  return (
    <Link to={`/user/courses/${course.id}`} className="course-card panel">
      <VideoPlaceholder course={course} size="card" />
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
