import { useMemo, useState } from "react";
import MentorCard from "../components/MentorCard";
import MentorSearchFilter from "../components/MentorSearchFilter";
import { mentors } from "../data/mentors";
import { filterMentors, initialMentorFilters } from "../utils/mentorFilters";

function MentorListPage() {
  const [selectedMentorIds, setSelectedMentorIds] = useState([]);
  const [draftFilters, setDraftFilters] = useState(initialMentorFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialMentorFilters);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const filteredMentors = useMemo(
    () => filterMentors(mentors, appliedFilters),
    [appliedFilters],
  );

  const handleFilterChange = (name, value) => {
    setDraftFilters((currentFilters) => ({ ...currentFilters, [name]: value }));
  };

  const handleSearch = (event) => {
    event.preventDefault();
    setAppliedFilters({ ...draftFilters });
  };

  const handleFilterReset = () => {
    setDraftFilters(initialMentorFilters);
    setAppliedFilters(initialMentorFilters);
  };

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
        <MentorSearchFilter
          filters={draftFilters}
          isOpen={isFilterOpen}
          onChange={handleFilterChange}
          onReset={handleFilterReset}
          onSubmit={handleSearch}
          onToggle={() => setIsFilterOpen((currentValue) => !currentValue)}
          resultCount={filteredMentors.length}
        />

        <p className="mentor-result-summary" aria-live="polite">
          검색 결과 <strong>{filteredMentors.length}명</strong>
        </p>

        <section className="stack" aria-label="멘토 목록">
          {filteredMentors.map((mentor) => (
            <MentorCard
              key={mentor.id}
              mentor={mentor}
              selected={selectedMentorIds.includes(mentor.id)}
              onSelect={(isSelected) => handleMentorSelect(mentor.id, isSelected)}
            />
          ))}
          {filteredMentors.length === 0 && (
            <div className="card mentor-empty-state">
              <h2 className="card-title">조건에 맞는 멘토가 없습니다.</h2>
              <p className="muted-text">검색어나 필터 조건을 바꾸거나 초기화해 주세요.</p>
              <button className="button button-soft" onClick={handleFilterReset} type="button">
                검색 조건 초기화
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default MentorListPage;
