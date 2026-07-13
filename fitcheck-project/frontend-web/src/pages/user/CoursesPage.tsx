import { useState } from 'react';
import type { BodyPart, Goal } from '../../data/userMock';
import { MOCK_COURSES } from '../../data/userMock';
import CourseCard from '../../features/courses/CourseCard';
import CourseFilters from '../../features/courses/CourseFilters';
import '../../features/courses/courses.css';
import './user.css';

export default function CoursesPage() {
  const [bodyPart, setBodyPart] = useState<BodyPart | '전체'>('전체');
  const [goal, setGoal] = useState<Goal | '전체'>('전체');

  const filtered = MOCK_COURSES.filter((course) => {
    const partOk = bodyPart === '전체' || course.bodyPart === bodyPart;
    const goalOk = goal === '전체' || course.goal === goal;
    return partOk && goalOk;
  });

  return (
    <div className="user-page">
      <header className="page-header">
        <h1>맞춤 PT 강좌</h1>
        <p>부위별·목적별로 세분화된 가이드로 혼자 운동해도 방향을 잡으세요.</p>
      </header>

      <CourseFilters
        bodyPart={bodyPart}
        goal={goal}
        onBodyPartChange={setBodyPart}
        onGoalChange={setGoal}
      />

      {filtered.length === 0 ? (
        <div className="empty-state">조건에 맞는 강좌가 없습니다.</div>
      ) : (
        <div className="course-grid">
          {filtered.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </div>
  );
}
