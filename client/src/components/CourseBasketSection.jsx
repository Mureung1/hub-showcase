// 계산 엔진(gradRequirements.js)은 course.category를 요건 label('창업교과목', '종합설계교과목')과
// 그대로 비교하므로 원본 값은 바꾸지 않고, 화면에 보여줄 때만 짧게 줄인다.
const CATEGORY_DISPLAY_LABELS = {
  창업교과목: '창업',
  종합설계교과목: '종합설계',
};

function CourseBasketSection({ courses, selectedIds, onToggle }) {
  return (
    <div>
      <div className="course-grid">
        {courses.map((course) => {
          const isSelected = selectedIds.includes(course.id);
          const categoryLabel = CATEGORY_DISPLAY_LABELS[course.category] ?? course.category;
          return (
            <div
              key={course.id}
              className={`course-card ${isSelected ? 'selected' : ''}`}
              onClick={() => onToggle(course.id)}
            >
              <span className="course-name">{course.name}</span>
              <span className="course-tag">{course.department} · {course.grade}학년 · {categoryLabel}</span>
              <span className="course-credit">{course.credits}학점</span>
              <button type="button" className="course-add" aria-label="담기">
                +
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CourseBasketSection;