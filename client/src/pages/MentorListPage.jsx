import { useState } from "react";
import MentorCard from "../components/MentorCard";
import { mentors } from "../data/mentors";

function MentorListPage() {
  const [selectedMentorIds, setSelectedMentorIds] = useState([]);

  const handleMentorSelect = (mentorId, isSelected) => {
    setSelectedMentorIds((currentIds) => {
      if (!isSelected) {
        return currentIds.filter((id) => id !== mentorId);
      }

      if (currentIds.includes(mentorId) || currentIds.length >= 3) {
        return currentIds;
      }

      return [...currentIds, mentorId];
    });
  };

  return (
    <div className="mentor-list-page">
      <header className="page-header mentor-list-header">
        <div>
          <p className="eyebrow">멘티 로그인 화면</p>
          <h1 className="page-title">멘토 프로필 목록</h1>
        </div>
        <span className="tag">멘티 화면</span>
      </header>

      <main className="page-container mentor-list-container">
        <section className="stack" aria-label="멘토 목록">
          {mentors.map((mentor) => (
            <MentorCard
              key={mentor.id}
              mentor={mentor}
              selected={selectedMentorIds.includes(mentor.id)}
              onSelect={(isSelected) => handleMentorSelect(mentor.id, isSelected)}
            />
          ))}
        </section>
      </main>
    </div>
  );
}

export default MentorListPage;
