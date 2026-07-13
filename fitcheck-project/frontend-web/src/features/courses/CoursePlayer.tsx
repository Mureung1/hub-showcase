import type { Course } from '../../data/userMock';
import { recordWatch } from '../../hooks/useCourseLibrary';
import './courses.css';

interface CoursePlayerProps {
  course: Course;
}

export default function CoursePlayer({ course }: CoursePlayerProps) {
  return (
    <div className={`course-player tone-${course.thumbnailTone}`}>
      <video
        className="course-player-video"
        controls
        playsInline
        preload="metadata"
        src={course.videoUrl}
        onPlay={() => recordWatch(course.id)}
      >
        이 브라우저는 영상 재생을 지원하지 않습니다.
      </video>
    </div>
  );
}
