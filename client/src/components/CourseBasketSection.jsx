function CourseBasketSection({ courses, selectedIds, onToggle }) {
  return (
    <div>
      <div className="course-grid">
        {courses.map((course) => {
          const isSelected = selectedIds.includes(course.id);
          return (
            <div
              key={course.id}
              className={`course-card ${isSelected ? 'selected' : ''}`}
              onClick={() => onToggle(course.id)}
            >
              <span className="course-name">{course.name}</span>
              <span className="course-tag">{course.category}</span>
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