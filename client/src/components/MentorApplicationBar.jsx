function MentorApplicationBar({ selectedMentors, onApply, onMentorClick }) {
  const hasSelectedMentors = selectedMentors.length > 0;

  return (
    <aside className="cta-bar cta-bar-fixed mentor-application-bar" aria-label="선택한 멘토와 면담 신청">
      <div className="selected-mentor-list" aria-live="polite">
        {hasSelectedMentors ? (
          selectedMentors.map((mentor) => (
            <button
              className="selected-mentor-link"
              key={mentor.id}
              onClick={() => onMentorClick(mentor.id)}
              type="button"
            >
              {mentor.name} 멘토
            </button>
          ))
        ) : (
          <span className="selected-mentor-empty">선택한 멘토가 없습니다.</span>
        )}
      </div>

      <button
        className="button button-primary mentor-application-button"
        disabled={!hasSelectedMentors}
        onClick={onApply}
        type="button"
      >
        면담 신청
      </button>
    </aside>
  );
}

export default MentorApplicationBar;
