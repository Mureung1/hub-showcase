import { useState } from 'react';
import type { BodyPart, Goal } from '../../data/userMock';
import { MOCK_COURSES } from '../../data/userMock';
import { useCourseLibrary } from '../../hooks/useCourseLibrary';
import CourseCard from '../../features/courses/CourseCard';
import CourseFilters from '../../features/courses/CourseFilters';
import '../../features/courses/courses.css';
import './user.css';

type LibraryTab = 'all' | 'continue' | 'favorites';

const LIBRARY_TABS: Array<{ id: LibraryTab; label: string }> = [
  { id: 'all', label: '전체' },
  { id: 'continue', label: '이어서 보기' },
  { id: 'favorites', label: '즐겨찾기' },
];

export default function CoursesPage() {
  const [bodyPart, setBodyPart] = useState<BodyPart | '전체'>('전체');
  const [goal, setGoal] = useState<Goal | '전체'>('전체');
  const [libraryTab, setLibraryTab] = useState<LibraryTab>('all');
  const { favoriteIds, watchHistory } = useCourseLibrary();

  const historyIds = watchHistory.map((item) => item.courseId);
  const historySet = new Set(historyIds);
  const favoriteSet = new Set(favoriteIds);

  let baseCourses = MOCK_COURSES;
  if (libraryTab === 'favorites') {
    baseCourses = MOCK_COURSES.filter((course) => favoriteSet.has(course.id));
  } else if (libraryTab === 'continue') {
    baseCourses = historyIds
      .map((id) => MOCK_COURSES.find((course) => course.id === id))
      .filter((course): course is (typeof MOCK_COURSES)[number] => Boolean(course));
  }

  const filtered = baseCourses.filter((course) => {
    const partOk = bodyPart === '전체' || course.bodyPart === bodyPart;
    const goalOk = goal === '전체' || course.goal === goal;
    return partOk && goalOk;
  });

  const emptyMessage =
    libraryTab === 'favorites'
      ? '즐겨찾기한 강좌가 없습니다.'
      : libraryTab === 'continue'
        ? '아직 시청 기록이 없습니다. 강좌를 재생해 보세요.'
        : '조건에 맞는 강좌가 없습니다.';

  return (
    <div className="user-page">
      <header className="page-header">
        <h1>맞춤 PT 강좌</h1>
        <p>부위별·목적별로 세분화된 가이드로 혼자 운동해도 방향을 잡으세요.</p>
      </header>

      <div className="library-tabs" role="tablist" aria-label="강좌 라이브러리">
        {LIBRARY_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={libraryTab === tab.id}
            className={`library-tab${libraryTab === tab.id ? ' active' : ''}`}
            onClick={() => setLibraryTab(tab.id)}
          >
            {tab.label}
            {tab.id === 'continue' && historySet.size > 0 && (
              <span className="library-tab-count">{historySet.size}</span>
            )}
            {tab.id === 'favorites' && favoriteSet.size > 0 && (
              <span className="library-tab-count">{favoriteSet.size}</span>
            )}
          </button>
        ))}
      </div>

      <CourseFilters
        bodyPart={bodyPart}
        goal={goal}
        onBodyPartChange={setBodyPart}
        onGoalChange={setGoal}
      />

      {filtered.length === 0 ? (
        <div className="empty-state">{emptyMessage}</div>
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
