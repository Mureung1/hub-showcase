import { Play } from 'lucide-react';
import type { Course } from '../../data/userMock';
import './courses.css';

interface VideoPlaceholderProps {
  course: Course;
  size?: 'card' | 'detail';
}

export default function VideoPlaceholder({
  course,
  size = 'card',
}: VideoPlaceholderProps) {
  return (
    <div
      className={`video-placeholder tone-${course.thumbnailTone} size-${size}`}
      aria-label={`${course.title} 영상 미리보기`}
    >
      <div className="video-placeholder-overlay">
        <span className="video-play-btn" aria-hidden="true">
          <Play size={size === 'detail' ? 28 : 20} fill="currentColor" />
        </span>
        <span className="video-duration">{course.durationMin}:00</span>
      </div>
      <span className="video-placeholder-label">VOD 준비 중</span>
    </div>
  );
}
